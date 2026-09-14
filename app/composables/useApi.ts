import type { Address, Order, OrderStats, Shipment, User } from '~/types'

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

/** Requests started by `prefetchApiData`, handed to the first consumer. */
const prefetched = new Map<ApiKey, Promise<unknown>>()
/** When each key was last fetched successfully. */
const fetchedAt = new Map<ApiKey, number>()
/** Keys whose background refetch is already in flight. */
const revalidating = new Set<ApiKey>()

function useCached<T>(key: ApiKey, defaultValue?: () => T) {
  const nuxtApp = useNuxtApp()
  // `useRequestFetch()` rather than plain `$fetch` keeps this correct if a
  // route is ever server-rendered again: inside Nitro a bare `$fetch` sends
  // no cookies and every authenticated route answers 401.
  const request = useRequestFetch()

  async function fetchFresh(): Promise<T> {
    const data = await (request(ENDPOINTS[key]) as Promise<T>)
    fetchedAt.set(key, Date.now())
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
    getCachedData: (k, app) => app.payload.data[k] as T | undefined
  })

  // Served from cache: revalidate quietly. Only one refetch per key at a time,
  // however many components mount it together.
  const stale = Date.now() - (fetchedAt.get(key) ?? 0) > FRESH_MS
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
  for (const key of keys) fetchedAt.delete(key)
  clearNuxtData(keys)
  await refreshNuxtData(keys)
}

/** Forgets every cached response — for sign-in and sign-out. */
export function clearApiCache(): void {
  prefetched.clear()
  fetchedAt.clear()
  clearNuxtData([...API_KEYS])
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
        fetchedAt.set(key, Date.now())
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
