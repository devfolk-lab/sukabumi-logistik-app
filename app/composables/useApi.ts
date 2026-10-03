import type { Address, Order, OrderStats, Shipment, User } from '~/types'
import { CACHE_STORE, OUTBOX_STORE, idbClear, idbGetAll, idbPut, type CachedEntry } from '~/utils/offline-db'

// Fixed keys so every component that calls one of these shares a single
// request and a single cache entry.
//
// The app renders client-side only, so callers must not `await` these in
// setup — read `status` and show a skeleton while it is 'idle' or 'pending'.
//
// Nuxt drops an `useAsyncData` entry as soon as its last consumer unmounts, so
// out of the box every page navigation refetches from scratch and shows its
// skeleton again. `useCached` keeps the last result in the payload instead:
// a page that remounts renders it immediately, and unless the copy is only
// seconds old a background refetch swaps in fresh data without touching
// `status` (so no skeleton flashes).
//
// The cache is per session — `clearApiCache()` runs on login and logout so
// one account never sees another's data.

export const API_KEYS = ['profile', 'addresses', 'orders', 'shipments', 'stats'] as const
export type ApiKey = typeof API_KEYS[number]

const ENDPOINTS: Record<ApiKey, string> = {
  profile: '/api/profile',
  addresses: '/api/addresses',
  orders: '/api/orders',
  shipments: '/api/shipments',
  stats: '/api/stats'
}

/** A copy younger than this is served as-is, without a background refetch. */
const FRESH_MS = 10_000

/**
 * Writes one key's response to IndexedDB so a reload — or a cold start with no
 * network — can paint from it. Stamped with the account it belongs to; the
 * hydration pass drops anything belonging to someone else.
 */
function persist(key: ApiKey, data: unknown, at: number): void {
  if (!import.meta.client) return
  const userId = useAuthUser().value?.id
  if (!userId) return
  void idbPut<CachedEntry>(CACHE_STORE, { key, data, fetchedAt: at, userId })
}

/** Requests started by `prefetchApiData`, handed to the first consumer. */
const prefetched = new Map<ApiKey, Promise<unknown>>()
/**
 * When each key was last fetched successfully. Reactive rather than a plain
 * Map because `AppOfflineBanner` renders it — a cached screen says how old it
 * is instead of pretending to be live.
 */
export const fetchedAtState = reactive<Partial<Record<ApiKey, number>>>({})
/** Keys whose background refetch is already in flight. */
const revalidating = new Set<ApiKey>()

function useCached<T>(key: ApiKey, defaultValue?: () => T) {
  const nuxtApp = useNuxtApp()
  // `useRequestFetch()` rather than plain `$fetch` keeps this correct if a
  // route is ever server-rendered again: inside Nitro a bare `$fetch` sends
  // no cookies and every authenticated route answers 401.
  const request = useRequestFetch()

  async function fetchFresh(): Promise<T> {
    const data = await (request(ENDPOINTS[key]) as Promise<T>).catch((error: unknown) => {
      handleUnauthorized(error)
      throw error
    })
    const at = Date.now()
    fetchedAtState[key] = at
    persist(key, data, at)
    return data
  }

  const result = useAsyncData<T>(key, () => {
    // A prefetch is consumed once, so a later `refresh()` always hits the API.
    const pending = prefetched.get(key) as Promise<T> | undefined
    if (pending) {
      prefetched.delete(key)
      return pending
    }
    return fetchFresh()
  }, {
    default: defaultValue as () => T,
    // Nuxt 4 asks this on every execute, `refresh()` included. Serving the
    // cached copy there would make a refresh after a mutation a no-op — a new
    // address would not show until the next navigation — so only a mount
    // reads it.
    getCachedData: (k, app, { cause }) =>
      cause === 'refresh:manual' || cause === 'refresh:hook' ? undefined : app.payload.data[k] as T | undefined
  })

  // Served from cache: revalidate quietly. Only one refetch per key at a time,
  // however many components mount it together.
  const stale = Date.now() - (fetchedAtState[key] ?? 0) > FRESH_MS
  if (import.meta.client && result.status.value === 'success' && stale && !revalidating.has(key)) {
    revalidating.add(key)
    fetchFresh()
      .then((fresh) => {
        nuxtApp.payload.data[key] = fresh
        result.data.value = fresh
      })
      .catch(() => {})
      .finally(() => revalidating.delete(key))
  }

  return result
}

export function useProfile() {
  return useCached<User>('profile')
}

export function useAddresses() {
  return useCached<Address[]>('addresses', () => [])
}

export function useOrders() {
  return useCached<Order[]>('orders', () => [])
}

export function useActiveShipments() {
  return useCached<Shipment[]>('shipments', () => [])
}

export function useOrderStats() {
  return useCached<OrderStats>('stats')
}

/**
 * Marks server state as changed after a mutation. Mounted consumers refetch
 * right away; keys nobody is showing are dropped so their next mount fetches
 * instead of serving the stale copy.
 */
export async function invalidateApiData(keys: ApiKey[]): Promise<void> {
  for (const key of keys) fetchedAtState[key] = undefined
  clearNuxtData(keys)
  await refreshNuxtData(keys)
}

/** Forgets every cached response — for sign-in and sign-out. */
export function clearApiCache(): void {
  prefetched.clear()
  for (const key of API_KEYS) fetchedAtState[key] = undefined
  clearNuxtData([...API_KEYS])
  void clearOfflineStores()
}

/** Optimistic local write — same persistence path, used by queued mutations. */
export function writeApiCache(key: ApiKey, data: unknown): void {
  const nuxtApp = useNuxtApp()
  const at = Date.now()
  nuxtApp.payload.data[key] = data
  fetchedAtState[key] = at
  persist(key, data, at)
}

/**
 * Seeds the payload from IndexedDB before the first page mounts, so a cold
 * start offline renders real data instead of skeletons that never resolve.
 *
 * `plugins/00.auth.client.ts` runs first, so the account is known here — from
 * the server, or from the stored copy when the app starts offline. Entries
 * carry the account they belong to, so a mismatch is caught here and purged —
 * and `clearApiCache()` already runs on every sign-in and sign-out, so a
 * mismatch only happens if a session was replaced out from under us.
 */
export async function hydrateApiCache(): Promise<void> {
  const nuxtApp = useNuxtApp()
  const entries = await idbGetAll<CachedEntry>(CACHE_STORE)
  if (entries.length === 0) return

  const currentId = useAuthUser().value?.id
  const owner = entries[0]!.userId

  // Two accounts' data can never be mixed: if the stored owner is not the
  // current user, drop everything rather than pick through it.
  if (currentId && owner !== currentId) {
    await clearOfflineStores()
    return
  }

  for (const entry of entries) {
    if (entry.userId !== owner) continue
    nuxtApp.payload.data[entry.key] = entry.data
    fetchedAtState[entry.key as ApiKey] = entry.fetchedAt
  }
}

/** Drops every persisted response and queued write, plus the SW's API caches. */
export async function clearOfflineStores(): Promise<void> {
  if (!import.meta.client) return
  await Promise.all([idbClear(CACHE_STORE), idbClear(OUTBOX_STORE)])

  if (typeof caches === 'undefined') return
  await Promise.all([
    caches.delete('suklog-tracking'),
    caches.delete('suklog-destinations')
  ])
}

/**
 * Starts the requests the home screen needs right after sign-in, so they are
 * in flight (or done) before the page even mounts. The page's own composables
 * pick these promises up instead of starting over; a prefetch that finishes
 * first lands in the payload, where `useCached` reads it as a fresh copy.
 */
export function prefetchApiData(): void {
  const nuxtApp = useNuxtApp()
  const keys: ApiKey[] = ['profile', 'shipments', 'orders', 'addresses']

  for (const key of keys) {
    const promise = $fetch(ENDPOINTS[key])
      .then((data) => {
        nuxtApp.payload.data[key] = data
        const at = Date.now()
        fetchedAtState[key] = at
        persist(key, data, at)
        return data
      })
      .finally(() => {
        if (prefetched.get(key) === promise) prefetched.delete(key)
      })
    // Swallow rejections here; the consumer that picks the promise up handles them.
    promise.catch(() => {})
    prefetched.set(key, promise)
  }
}

/** Turns an H3 error from `$fetch` into the message the API meant to show. */
export function apiMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { message?: string, statusMessage?: string } })?.data
  return data?.statusMessage || data?.message || fallback
}
