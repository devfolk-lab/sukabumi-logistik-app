# PWA, Offline Mode and Pull-to-Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the app an installable PWA whose previously loaded data stays readable offline, queue alamat/profil edits made offline for replay, and add pull-to-refresh to the main screens.

**Architecture:** Two caches split by job, with no overlap. A Workbox `generateSW` service worker owns the built shell, courier logos and the two unkeyed GETs (`/api/shipments/*`, `/api/destinations*`). IndexedDB owns the five `useApi` keys plus a mutation outbox, because `useApi` already tracks `fetchedAt` per key — this only gives that map a durable home, so the existing stale-while-revalidate logic is left intact and merely seeded from disk.

**Tech Stack:** Nuxt 4 (`ssr: false`), `@vite-pwa/nuxt` 1.1.1 (Workbox `generateSW`), raw IndexedDB (no new dependency), VueUse (`useOnline`, `useEventListener`, `useMediaQuery`), Nuxt UI 4, Tailwind v4.

**Spec:** `docs/superpowers/specs/2026-09-20-pwa-offline-design.md`

## Global Constraints

- **No test runner.** The user explicitly declined adding one. Every task verifies with `pnpm lint && pnpm typecheck` plus the named manual check. Do not add Vitest, do not write `*.test.ts`.
- **No new dependencies.** Everything here uses packages already in `package.json`.
- ESLint stylistic: **no trailing commas** (`commaDangle: 'never'`), **1TBS** brace style. `.editorconfig`: 2-space indent, LF, final newline, trimmed trailing whitespace.
- All user-facing copy is **Indonesian**, including toast titles and descriptions.
- Prefer Nuxt UI (`U*`) components and Tailwind utilities over hand-written CSS. Use semantic classes (`text-muted`, `text-primary`) over hard-coded palette values.
- Every clickable surface carries `v-ripple` (light ink) or `v-ripple.dark`.
- Both `pnpm lint` and `pnpm typecheck` are CI gates and must pass before any task is considered done.
- If `.nuxt/` is missing or stale, run `pnpm postinstall` first — ESLint and TypeScript both resolve their configs out of it.

## Deviation from the spec (read before Task 9)

The spec assigns `refreshKeys: ['orders']` to `app/pages/riwayat/[id].vue`. Planning found that page fetches through its own `useAsyncData('order-<id>')` (`riwayat/[id].vue:14`), **not** a `useApi` key — so `refreshKeys` alone would refresh the list behind it and leave the detail the user is looking at stale. Task 9 therefore adds a small `registerPageRefresh(fn)` escape hatch alongside `refreshKeys`, and `riwayat/[id].vue` uses it. `app/pages/lacak/[resi].vue` still gets **no** gesture, as decided.

## File Structure

**Create:**

| File | Responsibility |
|---|---|
| `app/utils/offline-db.ts` | IndexedDB open + get/put/delete/clear over two stores. Knows nothing about API shapes. |
| `app/composables/useOutbox.ts` | Queue, drain and replay of writes made offline. |
| `app/composables/usePageRefresh.ts` | Registry for a page's own refresh handler (non-keyed pages). |
| `app/plugins/offline.client.ts` | Boot: hydrate the cache into the payload, drain the outbox, re-drain on reconnect. |
| `app/plugins/pwa.client.ts` | The "Versi baru tersedia" update toast. |
| `app/components/app/AppPullToRefresh.vue` | The gesture and its indicator. No knowledge of what gets refreshed. |
| `app/components/app/AppOfflineBanner.vue` | Offline + pending-sync status strip. |
| `app/types/page-meta.d.ts` | `refreshKeys` augmentation of `PageMeta` / `RouteMeta`. |

**Modify:** `nuxt.config.ts`, `app/app.vue`, `app/composables/useApi.ts`, `app/layouts/default.vue`, `app/assets/css/main.css`, `app/pages/alamat.vue`, `app/pages/profil/pengaturan.vue`, `app/pages/kirim/detail.vue`, `app/pages/riwayat/[id].vue`, `app/components/alamat/AddressCard.vue`, and the six pages listed in Task 9.

---

### Task 1: Manifest and service worker

**Files:**
- Modify: `nuxt.config.ts` (add a `pwa` block after the `supabase` block)
- Modify: `app/app.vue:3-6` (theme-color and iOS standalone meta)

**Interfaces:**
- Consumes: nothing.
- Produces: a registered service worker, a `/manifest.webmanifest`, and the `$pwa` injection that Tasks 2 uses.

- [ ] **Step 1: Add the `pwa` block to `nuxt.config.ts`**

Insert as a new top-level key (order within the config object does not matter; put it after `supabase`):

```ts
  // The five keyed endpoints in `useApi` are deliberately absent from
  // `runtimeCaching`: IndexedDB owns those (see app/plugins/offline.client.ts),
  // and a second copy in the SW would be a competing source of truth. No
  // mutation route is ever intercepted.
  pwa: {
    registerType: 'prompt',
    manifest: {
      name: 'Sukabumi Logistik',
      short_name: 'SukLog',
      description: 'Layanan multi-ekspedisi dan solusi pengiriman untuk individu, UMKM, dan bisnis di Sukabumi.',
      lang: 'id',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#f8f9fb',
      theme_color: '#002144',
      icons: [
        { src: '/web-app-manifest-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/web-app-manifest-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//],
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          // Tracking is worth showing stale, never worth showing instead of
          // fresh — so the network gets 5s before the cache answers.
          urlPattern: /^\/api\/shipments\/.+/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'suklog-tracking',
            networkTimeoutSeconds: 5,
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            cacheableResponse: { statuses: [200] }
          }
        },
        {
          // A static snapshot rebuilt by `pnpm build:destinations`, not
          // per-request data.
          urlPattern: /^\/api\/destinations/,
          handler: 'CacheFirst',
          options: {
            cacheName: 'suklog-destinations',
            expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [200] }
          }
        }
      ]
    },
    client: {
      // Captures `beforeinstallprompt` into `$pwa.showInstallPrompt` instead of
      // letting Chrome show its own mini-infobar.
      installPrompt: true
    },
    devOptions: {
      enabled: true,
      type: 'module',
      suppressWarnings: true
    }
  },
```

- [ ] **Step 2: Add the head meta in `app/app.vue`**

In the existing `useHead` call, add to `meta`:

```ts
    { name: 'theme-color', content: '#002144' },
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'apple-mobile-web-app-title', content: 'SukLog' }
```

- [ ] **Step 3: Verify lint and types**

Run: `pnpm lint && pnpm typecheck`
Expected: both pass.

- [ ] **Step 4: Build and confirm the manifest is actually linked**

Run: `pnpm build && pnpm preview`

Open `http://localhost:3000`, then DevTools → Application → Manifest. Expected: name, icons and colors all present, no "no manifest detected".

**If the manifest link is missing from the served HTML**, the module did not auto-inject it. Fix by adding `<VitePwaManifest />` as the first child inside `<UApp>` in `app/app.vue`. Do not skip this check — the whole feature depends on it.

- [ ] **Step 5: Confirm the SPA fallback is right**

In DevTools → Application → Service Workers, confirm one is activated. Then check the precache list (Cache Storage) contains an HTML entry matching `navigateFallback: '/'`.

Now go offline (DevTools → Network → Offline) and hard-reload. Expected: the branded splash from `app/spa-loading-template.html` renders rather than the browser's dinosaur. If it does not, the fallback document Nuxt 4 emits under `ssr: false` is not at `/` — inspect `.output/public/` for the emitted HTML file and set `navigateFallback` to its actual path.

- [ ] **Step 6: Confirm API calls are never served the shell**

Still offline, in the console: `fetch('/api/profile').then(r => console.log(r.status, r.headers.get('content-type')))`.
Expected: the request **fails** (network error). It must NOT resolve with `text/html` — that would mean `navigateFallbackDenylist` is not matching and every API call would return the HTML shell.

- [ ] **Step 7: Commit**

```bash
git add nuxt.config.ts app/app.vue
git commit -m "feat(pwa): add manifest and service worker"
```

---

### Task 2: Update prompt and install affordance

**Files:**
- Create: `app/plugins/pwa.client.ts`
- Modify: `app/pages/profil/pengaturan.vue`

**Interfaces:**
- Consumes: `$pwa` from Task 1 — `needRefresh: Ref<boolean>`, `updateServiceWorker(reloadPage?: boolean): Promise<void>`, `showInstallPrompt: Ref<boolean>`, `install(): Promise<UserChoice | undefined>`, `isPWAInstalled: Ref<boolean>` (verified against `node_modules/@vite-pwa/nuxt/dist/runtime/plugins/types.d.ts`).
- Produces: nothing other tasks consume.

- [ ] **Step 1: Create `app/plugins/pwa.client.ts`**

```ts
/**
 * `registerType: 'prompt'` means a new build waits instead of activating, so
 * the bundle is never swapped out from under an in-progress kirim wizard. The
 * user decides when to take it.
 */
export default defineNuxtPlugin(() => {
  const nuxtApp = useNuxtApp()
  const pwa = nuxtApp.$pwa
  if (!pwa) return

  const toast = useToast()

  watch(() => pwa.needRefresh, (needed) => {
    if (!needed) return

    toast.add({
      title: 'Versi baru tersedia',
      description: 'Muat ulang untuk memakai versi terbaru.',
      icon: 'i-lucide-download',
      duration: 0,
      actions: [{
        label: 'Muat ulang',
        color: 'primary',
        variant: 'solid',
        onClick: () => {
          void pwa.updateServiceWorker(true)
        }
      }]
    })
  }, { immediate: true })
})
```

- [ ] **Step 2: Add the install row to `app/pages/profil/pengaturan.vue`**

In `<script setup>`, after the existing `useAuthActions()` line:

```ts
const { $pwa } = useNuxtApp()

// iOS has no `beforeinstallprompt`, so Safari users get instructions instead
// of a button that could never work.
const isIos = computed(() => import.meta.client && /iphone|ipad|ipod/i.test(navigator.userAgent))
const showIosInstall = ref(false)
const canInstall = computed(() => Boolean($pwa?.showInstallPrompt) || isIos.value)
const alreadyInstalled = computed(() => Boolean($pwa?.isPWAInstalled))

async function install() {
  if (isIos.value) {
    showIosInstall.value = true
    return
  }
  await $pwa?.install()
}
```

In the template, add this block above the password section (match the surrounding card styling used elsewhere on the page):

```vue
      <button
        v-if="canInstall && !alreadyInstalled"
        v-ripple.dark
        type="button"
        class="relative flex w-full items-center gap-3 rounded-3xl bg-white p-4 text-left shadow-card lg:shadow-card-flat"
        @click="install"
      >
        <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 pointer-events-none">
          <UIcon
            name="i-lucide-download"
            class="size-5 text-primary"
          />
        </span>
        <span class="min-w-0 flex-1 pointer-events-none">
          <span class="block text-sm font-bold text-gray-800">Pasang aplikasi</span>
          <span class="block text-sm text-gray-500">Buka lebih cepat langsung dari layar utama</span>
        </span>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-5 shrink-0 text-gray-400 pointer-events-none"
        />
      </button>

      <AppDialog
        v-model:open="showIosInstall"
        title="Pasang di iPhone"
        description="Safari belum mendukung pemasangan otomatis."
      >
        <template #body>
          <ol class="space-y-3 p-4 text-sm text-gray-600">
            <li>1. Tap tombol Bagikan di bawah layar Safari.</li>
            <li>2. Pilih <span class="font-semibold text-gray-800">Tambahkan ke Layar Utama</span>.</li>
            <li>3. Tap <span class="font-semibold text-gray-800">Tambah</span>.</li>
          </ol>
        </template>
      </AppDialog>
```

- [ ] **Step 3: Verify lint and types**

Run: `pnpm lint && pnpm typecheck`
Expected: both pass.

- [ ] **Step 4: Manual check**

Run `pnpm build && pnpm preview` in one terminal. In Chrome, open `/profil/pengaturan`. Expected: the "Pasang aplikasi" row appears (it will not if the app is already installed — test in a fresh profile or uninstall first). Clicking it opens Chrome's install dialog.

For the update toast: after installing the service worker once, change any string in `app/app.vue`, rebuild, and reload. Expected: the "Versi baru tersedia" toast appears with a working "Muat ulang" action.

- [ ] **Step 5: Commit**

```bash
git add app/plugins/pwa.client.ts app/pages/profil/pengaturan.vue
git commit -m "feat(pwa): prompt for updates and offer install"
```

---

### Task 3: IndexedDB wrapper

**Files:**
- Create: `app/utils/offline-db.ts`

**Interfaces:**
- Consumes: nothing.
- Produces, consumed by Tasks 4, 6 and 7:
  - `CACHE_STORE: 'cache'`, `OUTBOX_STORE: 'outbox'`
  - `interface CachedEntry<T> { key: string, data: T, fetchedAt: number, userId: string }`
  - `interface OutboxEntry { id?: number, method: 'POST' | 'PATCH' | 'DELETE', url: string, body?: Record<string, unknown>, invalidates: string[], label: string, userId: string, createdAt: number, attempts: number }`
  - `idbGetAll<T>(store: string): Promise<T[]>`
  - `idbPut<T>(store: string, value: T): Promise<IDBValidKey | null>`
  - `idbDelete(store: string, key: IDBValidKey): Promise<void>`
  - `idbClear(store: string): Promise<void>`

- [ ] **Step 1: Create `app/utils/offline-db.ts`**

```ts
/**
 * IndexedDB behind a promise API. Two stores: `cache` holds the last response
 * for each `useApi` key so a cold start with no network still paints, and
 * `outbox` holds writes made offline until a drain replays them.
 *
 * Hand-rolled rather than pulled from a package — the app needs exactly
 * get-all/put/delete/clear over two stores.
 *
 * Every call resolves rather than rejects. A private window, blocked storage
 * or a failed upgrade all surface as `null`/`[]`, which every caller reads as
 * "no cache": the app then behaves exactly as it does today, online-only.
 */

const DB_NAME = 'suklog-offline'
const DB_VERSION = 1

export const CACHE_STORE = 'cache'
export const OUTBOX_STORE = 'outbox'

export interface CachedEntry<T = unknown> {
  key: string
  data: T
  fetchedAt: number
  userId: string
}

export interface OutboxEntry {
  /** Assigned by IndexedDB on insert; also the replay order. */
  id?: number
  method: 'POST' | 'PATCH' | 'DELETE'
  url: string
  body?: Record<string, unknown>
  /** `ApiKey`s to invalidate once this entry replays. */
  invalidates: string[]
  /** Indonesian label for the failure toast. */
  label: string
  userId: string
  createdAt: number
  attempts: number
}

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (!import.meta.client || typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: 'id', autoIncrement: true })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })

  return dbPromise
}

function run<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest
): Promise<T | null> {
  return openDb().then(db => new Promise<T | null>((resolve) => {
    if (!db) {
      resolve(null)
      return
    }

    try {
      const request = fn(db.transaction(store, mode).objectStore(store))
      request.onsuccess = () => resolve(request.result as T)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  }))
}

export async function idbGetAll<T>(store: string): Promise<T[]> {
  return (await run<T[]>(store, 'readonly', s => s.getAll())) ?? []
}

export async function idbPut<T>(store: string, value: T): Promise<IDBValidKey | null> {
  return await run<IDBValidKey>(store, 'readwrite', s => s.put(value as never))
}

export async function idbDelete(store: string, key: IDBValidKey): Promise<void> {
  await run(store, 'readwrite', s => s.delete(key))
}

export async function idbClear(store: string): Promise<void> {
  await run(store, 'readwrite', s => s.clear())
}
```

- [ ] **Step 2: Verify lint and types**

Run: `pnpm lint && pnpm typecheck`
Expected: both pass.

- [ ] **Step 3: Manual smoke check**

Run `pnpm dev`, open the app, and in the console:

```js
const { idbPut, idbGetAll, CACHE_STORE } = await import('/app/utils/offline-db.ts')
```

If that import path is awkward under Vite, instead verify in DevTools → Application → IndexedDB after Task 4 lands. Expected at minimum here: `pnpm lint && pnpm typecheck` pass and no console errors on boot.

- [ ] **Step 4: Commit**

```bash
git add app/utils/offline-db.ts
git commit -m "feat(offline): add IndexedDB wrapper"
```

---

### Task 4: Persist and hydrate the useApi cache

**Files:**
- Modify: `app/composables/useApi.ts`
- Create: `app/plugins/offline.client.ts`

**Interfaces:**
- Consumes: `CACHE_STORE`, `OUTBOX_STORE`, `CachedEntry`, `idbGetAll`, `idbPut`, `idbDelete`, `idbClear` from Task 3.
- Produces, consumed by Tasks 5, 6, 7 and 9:
  - `fetchedAtState: Partial<Record<ApiKey, number>>` — reactive, exported from `useApi.ts`
  - `hydrateApiCache(): Promise<void>` — exported from `useApi.ts`
  - `writeApiCache(key: ApiKey, data: unknown): void` — exported from `useApi.ts`, used by Task 7 for optimistic writes

- [ ] **Step 1: Replace the `fetchedAt` Map with reactive state in `app/composables/useApi.ts`**

Delete this line:

```ts
/** When each key was last fetched successfully. */
const fetchedAt = new Map<ApiKey, number>()
```

Replace with:

```ts
/**
 * When each key was last fetched successfully. Reactive rather than a plain
 * Map because `AppOfflineBanner` renders it — a cached screen says how old it
 * is instead of pretending to be live.
 */
export const fetchedAtState = reactive<Partial<Record<ApiKey, number>>>({})
```

Then update the four existing readers/writers:
- `useApi.ts:49` — `fetchedAt.set(key, Date.now())` becomes:
  ```ts
      const at = Date.now()
      fetchedAtState[key] = at
      persist(key, data, at)
  ```
  (the surrounding `fetchFresh` already holds `data`; return it as before)
- `useApi.ts:135` (inside `prefetchApiData`) — same replacement, using that closure's `data`.
- In `useCached`, `Date.now() - (fetchedAt.get(key) ?? 0) > FRESH_MS` becomes `Date.now() - (fetchedAtState[key] ?? 0) > FRESH_MS`.
- In `invalidateApiData`, `fetchedAt.delete(key)` becomes `delete fetchedAtState[key]`.
- In `clearApiCache`, `fetchedAt.clear()` becomes:
  ```ts
  for (const key of API_KEYS) delete fetchedAtState[key]
  ```

- [ ] **Step 2: Add persistence helpers to `app/composables/useApi.ts`**

Add near the top, after the `ENDPOINTS` map. Note the import at the top of the file:

```ts
import { CACHE_STORE, OUTBOX_STORE, idbClear, idbDelete, idbGetAll, idbPut, type CachedEntry } from '~/utils/offline-db'
```

```ts
/**
 * Writes one key's response to IndexedDB so a reload — or a cold start with no
 * network — can paint from it. Stamped with the account it belongs to; the
 * hydration pass drops anything belonging to someone else.
 */
function persist(key: ApiKey, data: unknown, at: number): void {
  if (!import.meta.client) return
  const userId = useSupabaseUser().value?.id
  if (!userId) return
  void idbPut<CachedEntry>(CACHE_STORE, { key, data, fetchedAt: at, userId })
}

/** Optimistic local write — same persistence path, used by queued mutations. */
export function writeApiCache(key: ApiKey, data: unknown): void {
  const nuxtApp = useNuxtApp()
  const at = Date.now()
  nuxtApp.payload.data[key] = data
  fetchedAtState[key] = at
  void refreshNuxtData([])
  persist(key, data, at)
}

/**
 * Seeds the payload from IndexedDB before the first page mounts, so a cold
 * start offline renders real data instead of skeletons that never resolve.
 *
 * Hydration is not gated on the Supabase session resolving first: plugin order
 * between modules is not guaranteed, and waiting would mean pages mount before
 * the seed lands. Entries carry the account they belong to, so a mismatch is
 * detected here and purged — and `clearApiCache()` already runs on every
 * sign-in and sign-out, so a mismatch only happens if a session was replaced
 * out from under us.
 */
export async function hydrateApiCache(): Promise<void> {
  const nuxtApp = useNuxtApp()
  const entries = await idbGetAll<CachedEntry>(CACHE_STORE)
  if (entries.length === 0) return

  const currentId = useSupabaseUser().value?.id
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
```

- [ ] **Step 3: Purge on sign-in and sign-out**

In `clearApiCache()` in `app/composables/useApi.ts`, add as the last line:

```ts
  void clearOfflineStores()
```

`useAuthActions.ts` already calls `clearApiCache()` on login, register and logout, so no change is needed there.

- [ ] **Step 4: Create `app/plugins/offline.client.ts`**

```ts
/**
 * Boots the offline layer: seed the payload from disk before the first page
 * mounts, then keep the outbox moving.
 */
export default defineNuxtPlugin(async () => {
  await hydrateApiCache()
})
```

- [ ] **Step 5: Verify lint and types**

Run: `pnpm lint && pnpm typecheck`
Expected: both pass. If `useSupabaseUser` is reported as not found, it is auto-imported by `@nuxtjs/supabase` — check `.nuxt/` is fresh via `pnpm postinstall`.

- [ ] **Step 6: Manual check — cache survives reload**

Run `pnpm dev`, sign in with a seeded account (`pnpm db:seed` prints the logins), and visit beranda, riwayat and alamat.

Open DevTools → Application → IndexedDB → `suklog-offline` → `cache`. Expected: rows for `profile`, `addresses`, `orders`, `shipments`, `stats`, each with a `fetchedAt` and the signed-in user's id.

Now DevTools → Network → Offline, and hard-reload. Expected: beranda, riwayat, alamat and profil all render their real data with **no skeletons stuck pending**. Previously this showed skeletons forever.

- [ ] **Step 7: Manual check — no cross-account leakage**

Still in dev: sign out, sign in as the second seeded account. Expected: IndexedDB `cache` holds only the second account's rows, and no screen ever flashes the first account's name or addresses.

- [ ] **Step 8: Commit**

```bash
git add app/composables/useApi.ts app/plugins/offline.client.ts
git commit -m "feat(offline): persist and rehydrate the useApi cache"
```

---

### Task 5: Offline banner

**Files:**
- Create: `app/components/app/AppOfflineBanner.vue`
- Modify: `app/layouts/default.vue`

**Interfaces:**
- Consumes: `fetchedAtState` (Task 4), `API_KEYS`/`ApiKey` (existing), `route.meta.refreshKeys` (Task 9 — read defensively so this task works before Task 9 lands).
- Produces: nothing other tasks consume.

- [ ] **Step 1: Create `app/components/app/AppOfflineBanner.vue`**

```vue
<script setup lang="ts">
import type { ApiKey } from '~/composables/useApi'

const online = useOnline()
const route = useRoute()
const { pending } = useOutbox()

/** The keys this screen actually shows, so the timestamp describes what is on it. */
const keys = computed<ApiKey[]>(() => {
  const declared = route.meta.refreshKeys as ApiKey[] | undefined
  return declared?.length ? declared : [...API_KEYS]
})

/** The oldest of them — the honest answer to "how old is this screen?". */
const oldest = computed(() => {
  const stamps = keys.value.map(key => fetchedAtState[key]).filter((at): at is number => typeof at === 'number')
  return stamps.length ? Math.min(...stamps) : null
})

const updatedAt = computed(() => {
  if (!oldest.value) return null
  return new Date(oldest.value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
  <Transition
    enter-from-class="-translate-y-full"
    leave-to-class="-translate-y-full"
    enter-active-class="transition-transform duration-300"
    leave-active-class="transition-transform duration-300"
  >
    <div
      v-if="!online"
      class="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-white"
    >
      <UIcon
        name="i-lucide-cloud-off"
        class="size-4 shrink-0"
      />
      <span>
        Mode offline
        <template v-if="updatedAt">— data terakhir diperbarui {{ updatedAt }}</template>
        <template v-if="pending.length"> · {{ pending.length }} perubahan menunggu sinkron</template>
      </span>
    </div>
  </Transition>
</template>
```

- [ ] **Step 2: Mount it in `app/layouts/default.vue`**

Add `<AppOfflineBanner />` as the first child inside the outer `div`, above `<AppSidebar />`:

```vue
<template>
  <div class="min-h-screen bg-[#f8f9fb]">
    <AppOfflineBanner />
    <AppSidebar />
```

- [ ] **Step 3: Verify lint and types**

Run: `pnpm lint && pnpm typecheck`
Expected: both pass. `useOutbox` does not exist until Task 6 — if executing tasks strictly in order, temporarily stub `const pending = ref([])` in place of the `useOutbox()` line and restore it in Task 6. Note this in the commit message if you do.

- [ ] **Step 4: Manual check**

`pnpm dev`, then DevTools → Network → Offline. Expected: the amber strip slides in reading "Mode offline — data terakhir diperbarui HH:MM", with a plausible time. Going back online removes it.

- [ ] **Step 5: Commit**

```bash
git add app/components/app/AppOfflineBanner.vue app/layouts/default.vue
git commit -m "feat(offline): add offline status banner"
```

---

### Task 6: The mutation outbox

**Files:**
- Create: `app/composables/useOutbox.ts`
- Modify: `app/plugins/offline.client.ts`

**Interfaces:**
- Consumes: `OUTBOX_STORE`, `OutboxEntry`, `idbGetAll`, `idbPut`, `idbDelete` (Task 3); `invalidateApiData`, `apiMessage`, `ApiKey` (existing).
- Produces, consumed by Task 7 and Task 9:
  - `useOutbox(): { pending: Ref<OutboxEntry[]>, enqueue(input: EnqueueInput): Promise<void>, drain(): Promise<void>, loadPending(): Promise<void> }`
  - `interface EnqueueInput { method: 'POST' | 'PATCH' | 'DELETE', url: string, body?: Record<string, unknown>, invalidates: ApiKey[], label: string }`

- [ ] **Step 1: Create `app/composables/useOutbox.ts`**

```ts
import { OUTBOX_STORE, idbDelete, idbGetAll, idbPut, type OutboxEntry } from '~/utils/offline-db'

export interface EnqueueInput {
  method: 'POST' | 'PATCH' | 'DELETE'
  url: string
  body?: Record<string, unknown>
  invalidates: ApiKey[]
  /** Indonesian noun phrase for the failure toast, e.g. "alamat". */
  label: string
}

/** Give up rather than replay a write forever. */
const MAX_ATTEMPTS = 5

// Module scope: one queue per tab, shared by every component that shows it.
const pending = ref<OutboxEntry[]>([])
let draining = false

export function useOutbox() {
  const toast = useToast()

  async function loadPending(): Promise<void> {
    const rows = await idbGetAll<OutboxEntry>(OUTBOX_STORE)
    pending.value = rows.sort((a, b) => (a.id ?? 0) - (b.id ?? 0))
  }

  async function enqueue(input: EnqueueInput): Promise<void> {
    const userId = useSupabaseUser().value?.id
    if (!userId) return

    await idbPut<OutboxEntry>(OUTBOX_STORE, {
      method: input.method,
      url: input.url,
      body: input.body,
      invalidates: input.invalidates,
      label: input.label,
      userId,
      createdAt: Date.now(),
      attempts: 0
    })

    await loadPending()
  }

  /**
   * Replays queued writes oldest-first, stopping at the first one that cannot
   * go through yet. Order matters: a PATCH against an address created offline
   * is meaningless until its POST has a real id.
   */
  async function drain(): Promise<void> {
    if (draining || !navigator.onLine) return
    draining = true

    try {
      await loadPending()
      const touched = new Set<ApiKey>()

      for (const entry of [...pending.value]) {
        try {
          const result = await $fetch(entry.url, {
            method: entry.method,
            body: entry.body
          })

          // A row created offline carried a `tmp-` id that only this device
          // knew. Now that the server has assigned a real one, every later
          // queued write still pointing at the temporary id is repointed.
          const realId = (result as { id?: string } | null)?.id
          if (entry.method === 'POST' && realId && entry.body?.tmpId) {
            await rewriteTmpId(String(entry.body.tmpId), realId)
          }

          for (const key of entry.invalidates) touched.add(key as ApiKey)
          if (entry.id !== undefined) await idbDelete(OUTBOX_STORE, entry.id)
        } catch (error) {
          const status = (error as { statusCode?: number, status?: number })?.statusCode
            ?? (error as { status?: number })?.status

          // The server rejected it on its merits. Replaying will not change
          // the answer, so drop it and say why.
          if (typeof status === 'number' && status >= 400 && status < 500) {
            if (entry.id !== undefined) await idbDelete(OUTBOX_STORE, entry.id)
            toast.add({
              title: `Gagal menyinkronkan ${entry.label}`,
              description: apiMessage(error, 'Perubahan offline dibatalkan.'),
              color: 'error'
            })
            continue
          }

          // Offline again, or the server is down. Keep it for the next drain
          // unless it has had too many goes.
          const attempts = entry.attempts + 1
          if (attempts >= MAX_ATTEMPTS) {
            if (entry.id !== undefined) await idbDelete(OUTBOX_STORE, entry.id)
            toast.add({
              title: `Gagal menyinkronkan ${entry.label}`,
              description: 'Perubahan offline dibatalkan setelah beberapa percobaan.',
              color: 'error'
            })
            continue
          }

          await idbPut<OutboxEntry>(OUTBOX_STORE, { ...entry, attempts })
          break
        }
      }

      await loadPending()

      // Server truth replaces the optimistic copy, including assigned ids.
      if (touched.size > 0) await invalidateApiData([...touched])
    } finally {
      draining = false
    }
  }

  async function rewriteTmpId(tmpId: string, realId: string): Promise<void> {
    const rows = await idbGetAll<OutboxEntry>(OUTBOX_STORE)
    for (const row of rows) {
      if (!row.url.includes(tmpId)) continue
      await idbPut<OutboxEntry>(OUTBOX_STORE, { ...row, url: row.url.replace(tmpId, realId) })
    }
  }

  return { pending, enqueue, drain, loadPending }
}
```

- [ ] **Step 2: Drain on boot and on reconnect, in `app/plugins/offline.client.ts`**

Replace the plugin body with:

```ts
/**
 * Boots the offline layer: seed the payload from disk before the first page
 * mounts, then keep the outbox moving.
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  await hydrateApiCache()

  const { drain, loadPending } = useOutbox()
  await loadPending()

  // Wait for the app to exist before firing requests that may raise toasts.
  nuxtApp.hook('app:mounted', () => {
    void drain()

    const online = useOnline()
    watch(online, (isOnline) => {
      if (isOnline) void drain()
    })
  })
})
```

- [ ] **Step 3: Restore the real `useOutbox()` call in `AppOfflineBanner.vue`**

If Task 5 Step 3 left a stub, replace it with `const { pending } = useOutbox()` now.

- [ ] **Step 4: Verify lint and types**

Run: `pnpm lint && pnpm typecheck`
Expected: both pass.

- [ ] **Step 5: Manual check**

The queue has no producers until Task 7, so verify only that nothing regressed: `pnpm dev`, sign in, toggle offline and back online. Expected: no console errors, no stray toasts, and DevTools → Application → IndexedDB shows an empty `outbox` store that exists.

- [ ] **Step 6: Commit**

```bash
git add app/composables/useOutbox.ts app/plugins/offline.client.ts app/components/app/AppOfflineBanner.vue
git commit -m "feat(offline): add mutation outbox with replay"
```

---

### Task 7: Queue alamat and profil writes

**Files:**
- Modify: `app/pages/alamat.vue:27-70` (all four mutations)
- Modify: `app/pages/profil/pengaturan.vue:38-60` (`saveProfile`)
- Modify: `app/components/alamat/AddressCard.vue`

**Interfaces:**
- Consumes: `useOutbox()` (Task 6), `writeApiCache` (Task 4), `useAddresses`, `useProfile`, `apiMessage` (existing), `Address` from `~/types` (fields: `id`, `label`, `main`, `nama`, `telp`, `alamat`, `destinationId`, `destinationLabel`, `zipCode`).
- Produces: `AddressCard` gains a `pending?: boolean` prop.

- [ ] **Step 1: Add the pending badge to `app/components/alamat/AddressCard.vue`**

Change the props line:

```ts
defineProps<{ address: Address, pending?: boolean }>()
```

In the template, add inside the existing badge row, after the "Utama" badge:

```vue
        <UBadge
          v-if="pending"
          color="warning"
          variant="subtle"
          icon="i-lucide-cloud-off"
          class="rounded-full"
        >
          Menunggu sinkron
        </UBadge>
```

- [ ] **Step 2: Rewrite the mutations in `app/pages/alamat.vue`**

Add to `<script setup>` after the existing `const { data: addresses, status, refresh } = useAddresses()`:

```ts
const online = useOnline()
const { enqueue } = useOutbox()

/** A row that exists only on this device until its POST replays. */
function isPending(address: Address): boolean {
  return address.id.startsWith('tmp-')
}
```

Replace `saveAddress`, `removeAddress` and `setMain` with:

```ts
async function saveAddress(payload: AddressFormPayload) {
  saving.value = true
  const target = editing.value

  try {
    if (online.value) {
      if (target) {
        await $fetch(`/api/addresses/${target.id}`, { method: 'PATCH', body: payload })
      } else {
        await $fetch('/api/addresses', { method: 'POST', body: payload })
      }
      await refresh()
    } else if (target) {
      // Show the edit straight away; the PATCH replays when the connection is back.
      writeApiCache('addresses', addresses.value.map(a => (a.id === target.id ? { ...a, ...payload } : a)))
      await enqueue({
        method: 'PATCH',
        url: `/api/addresses/${target.id}`,
        body: { ...payload },
        invalidates: ['addresses'],
        label: 'alamat'
      })
    } else {
      // `tmpId` travels in the body so the drain can map it to the real id the
      // server assigns, and repoint any edit queued behind it.
      const tmpId = `tmp-${crypto.randomUUID()}`
      const draft: Address = {
        id: tmpId,
        label: payload.label,
        main: addresses.value.length === 0,
        nama: payload.nama,
        telp: payload.telp,
        alamat: payload.alamat,
        destinationId: payload.destinationId ?? null,
        destinationLabel: payload.destinationLabel ?? null,
        zipCode: payload.zipCode ?? null
      }
      writeApiCache('addresses', [...addresses.value, draft])
      await enqueue({
        method: 'POST',
        url: '/api/addresses',
        body: { ...payload, tmpId },
        invalidates: ['addresses'],
        label: 'alamat'
      })
    }

    showForm.value = false
    toast.add({
      title: online.value
        ? (target ? 'Alamat diperbarui' : 'Alamat tersimpan')
        : 'Tersimpan offline',
      description: online.value ? undefined : 'Akan disinkronkan setelah kembali online.'
    })
  } catch (error) {
    toast.add({
      title: 'Gagal menyimpan alamat',
      description: apiMessage(error, 'Coba lagi sebentar.'),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

async function removeAddress(id: string) {
  try {
    if (online.value) {
      await $fetch(`/api/addresses/${id}`, { method: 'DELETE' })
      await refresh()
      return
    }

    writeApiCache('addresses', addresses.value.filter(a => a.id !== id))
    await enqueue({
      method: 'DELETE',
      url: `/api/addresses/${id}`,
      invalidates: ['addresses'],
      label: 'alamat'
    })
    toast.add({ title: 'Dihapus offline', description: 'Akan disinkronkan setelah kembali online.' })
  } catch (error) {
    toast.add({
      title: 'Gagal menghapus alamat',
      description: apiMessage(error, 'Coba lagi sebentar.'),
      color: 'error'
    })
  }
}

async function setMain(id: string) {
  try {
    if (online.value) {
      await $fetch(`/api/addresses/${id}`, { method: 'PATCH', body: { main: true } })
      await refresh()
      return
    }

    writeApiCache('addresses', addresses.value.map(a => ({ ...a, main: a.id === id })))
    await enqueue({
      method: 'PATCH',
      url: `/api/addresses/${id}`,
      body: { main: true },
      invalidates: ['addresses'],
      label: 'alamat utama'
    })
  } catch (error) {
    toast.add({
      title: 'Gagal mengubah alamat utama',
      description: apiMessage(error, 'Coba lagi sebentar.'),
      color: 'error'
    })
  }
}
```

Add the import at the top of the script block if not already present:

```ts
import type { Address } from '~/types'
```

Pass the badge in the template — change the `AlamatAddressCard` usage:

```vue
        <AlamatAddressCard
          v-for="address in addresses"
          :key="address.id"
          :address="address"
          :pending="isPending(address)"
          @edit="openEdit"
          @remove="removeAddress"
          @set-main="setMain"
        />
```

- [ ] **Step 3: Queue the profile edit in `app/pages/profil/pengaturan.vue`**

Add after the existing `const { data: profile, status, refresh: refreshProfile } = useProfile()`:

```ts
const online = useOnline()
const { enqueue } = useOutbox()
```

Replace the body of `saveProfile`'s `try` block with:

```ts
    const body = { nama: form.nama.trim(), telp: form.telp.trim() || null }

    if (online.value) {
      await $fetch('/api/profile', { method: 'PATCH', body })
      await refreshProfile()
      flash(profileSaved)
      toast.add({ title: 'Profil diperbarui', color: 'success', icon: 'i-lucide-circle-check' })
    } else {
      if (profile.value) writeApiCache('profile', { ...profile.value, ...body })
      await enqueue({
        method: 'PATCH',
        url: '/api/profile',
        body,
        invalidates: ['profile'],
        label: 'profil'
      })
      flash(profileSaved)
      toast.add({
        title: 'Tersimpan offline',
        description: 'Akan disinkronkan setelah kembali online.',
        icon: 'i-lucide-cloud-off'
      })
    }
```

- [ ] **Step 4: Verify lint and types**

Run: `pnpm lint && pnpm typecheck`
Expected: both pass. `AddressFormPayload` must structurally cover `label`, `nama`, `telp`, `alamat`, `destinationId`, `destinationLabel`, `zipCode` — if typecheck disagrees about a field, read `app/components/alamat/AddressForm.vue` and match its exported type rather than casting.

- [ ] **Step 5: Manual check — queue, survive reload, replay**

`pnpm dev`, sign in, go to `/alamat`. DevTools → Network → Offline.

1. Add an address. Expected: it appears immediately with a "Menunggu sinkron" badge, and a "Tersimpan offline" toast.
2. Edit that same new address, still offline. Expected: the edit shows; `outbox` now holds a POST and a PATCH.
3. Reload the page while still offline. Expected: the address and its badge are still there and the outbox still holds both entries.
4. Go back online. Expected: the queue drains, the badge clears, and the list matches the server. Check the database or reload — there must be exactly **one** address, carrying the edited values, not two.

- [ ] **Step 6: Manual check — rejected write is dropped**

Offline, edit the profile to a value the API rejects (e.g. an empty `nama` if the Zod schema requires one — check `server/api/profile.patch.ts` for a field that will 400). Go online. Expected: one Indonesian error toast, the entry is gone from `outbox`, and it does not retry on the next reconnect.

- [ ] **Step 7: Commit**

```bash
git add app/pages/alamat.vue app/pages/profil/pengaturan.vue app/components/alamat/AddressCard.vue
git commit -m "feat(offline): queue alamat and profil writes made offline"
```

---

### Task 8: Block order actions offline

**Files:**
- Modify: `app/pages/kirim/detail.vue:344-358` (the sticky checkout button)
- Modify: `app/pages/riwayat/[id].vue` (the bayar and batalkan buttons)

**Interfaces:**
- Consumes: `useOnline()` from VueUse.
- Produces: nothing other tasks consume.

- [ ] **Step 1: Guard the checkout button in `app/pages/kirim/detail.vue`**

Add to `<script setup>` after `const pending = ref(false)`:

```ts
// Creating an order calls RajaOngkir/Komship and books a real shipment at the
// quoted tariff, so it is never queued — it waits for a live connection.
const online = useOnline()
```

Add a guard clause at the top of `checkout()`, after the `if (pending.value) return`:

```ts
  if (!online.value) {
    toast.add({
      title: 'Butuh koneksi internet',
      description: 'Pembuatan pesanan memerlukan koneksi aktif.',
      color: 'warning'
    })
    return
  }
```

Change the button in the template:

```vue
        :disabled="pending || !online"
```

and its label expression:

```vue
        <span class="relative z-10 pointer-events-none">
          {{ !online ? 'Butuh koneksi internet' : pending ? 'Memproses...' : `Bayar ${formatRupiah(booking.total)}` }}
        </span>
```

- [ ] **Step 2: Guard bayar and batalkan in `app/pages/riwayat/[id].vue`**

Add after `const pending = ref(false)`:

```ts
const online = useOnline()
```

Add the same guard clause as the first statement inside both `pay()` and `cancel()`:

```ts
  if (!online.value) {
    toast.add({
      title: 'Butuh koneksi internet',
      description: 'Tindakan ini memerlukan koneksi aktif.',
      color: 'warning'
    })
    return
  }
```

In the template, find the bayar and batalkan buttons and add `|| !online` to each `:disabled` binding. Where a button has no `:disabled` yet, add `:disabled="pending || !online"`. Set `title="Butuh koneksi internet"` on each when offline:

```vue
        :disabled="pending || !online"
        :title="!online ? 'Butuh koneksi internet' : undefined"
```

- [ ] **Step 3: Verify lint and types**

Run: `pnpm lint && pnpm typecheck`
Expected: both pass.

- [ ] **Step 4: Manual check**

`pnpm dev`, DevTools → Network → Offline.

Expected: on `/kirim/detail` the pay button is visibly disabled and reads "Butuh koneksi internet". On `/riwayat/<id>` of an unpaid order, both bayar and batalkan are disabled. Nothing is queued in `outbox` for any of them. Going back online re-enables all three.

- [ ] **Step 5: Commit**

```bash
git add app/pages/kirim/detail.vue "app/pages/riwayat/[id].vue"
git commit -m "feat(offline): require a connection for order actions"
```

---

### Task 9: Pull-to-refresh

**Files:**
- Create: `app/components/app/AppPullToRefresh.vue`
- Create: `app/composables/usePageRefresh.ts`
- Create: `app/types/page-meta.d.ts`
- Modify: `app/assets/css/main.css` (the existing `html, body` rule)
- Modify: `app/layouts/default.vue`
- Modify: `app/pages/index.vue`, `app/pages/riwayat/index.vue`, `app/pages/alamat.vue`, `app/pages/profil/index.vue`, `app/pages/lacak/index.vue` (add `definePageMeta`)
- Modify: `app/pages/riwayat/[id].vue` (register its own handler)

**Interfaces:**
- Consumes: `invalidateApiData`, `ApiKey` (existing); `useOutbox().drain` (Task 6).
- Produces:
  - `registerPageRefresh(fn: () => Promise<void>): void`
  - `usePageRefresh(): { handler: ShallowRef<(() => Promise<void>) | null> }`
  - `PageMeta.refreshKeys?: ApiKey[]`

- [ ] **Step 1: Stop the browser's own pull-to-refresh, in `app/assets/css/main.css`**

Change the existing rule:

```css
html,
body {
  overflow-x: hidden;
  max-width: 100%;
}
```

to:

```css
html,
body {
  overflow-x: hidden;
  max-width: 100%;
  /* Without this, Android Chrome runs its own pull-to-refresh alongside
     AppPullToRefresh — two spinners and a full page reload. */
  overscroll-behavior-y: contain;
}
```

- [ ] **Step 2: Create `app/types/page-meta.d.ts`**

```ts
import type { ApiKey } from '~/composables/useApi'

declare module '#app' {
  interface PageMeta {
    /** `useApi` keys a pull-to-refresh on this page should refetch. */
    refreshKeys?: ApiKey[]
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    refreshKeys?: ApiKey[]
  }
}

export {}
```

- [ ] **Step 3: Create `app/composables/usePageRefresh.ts`**

```ts
/**
 * An escape hatch for pages whose data is not one of the `useApi` keys.
 * `riwayat/[id]` fetches one order through its own `useAsyncData`, so a pull
 * that only invalidated the `orders` list would refresh the list behind the
 * screen and leave the screen itself stale.
 */
const handler = shallowRef<(() => Promise<void>) | null>(null)

export function registerPageRefresh(fn: () => Promise<void>): void {
  handler.value = fn
  onScopeDispose(() => {
    if (handler.value === fn) handler.value = null
  })
}

export function usePageRefresh() {
  return { handler }
}
```

- [ ] **Step 4: Create `app/components/app/AppPullToRefresh.vue`**

```vue
<script setup lang="ts">
const props = defineProps<{
  /** Runs on release past the threshold. The indicator holds until it settles. */
  refresh: () => Promise<void>
  disabled?: boolean
}>()

/** Translated pixels, not finger pixels — the drag is damped by half. */
const THRESHOLD = 64
const MAX = 80
const HOLD = 56

const root = useTemplateRef<HTMLElement>('root')
const distance = ref(0)
const refreshing = ref(false)
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')

let startY = 0
let startX = 0
let active = false
let tracking = false

const progress = computed(() => Math.min(distance.value / THRESHOLD, 1))
const visible = computed(() => distance.value > 0 || refreshing.value)

const offset = computed(() => (reduced.value ? 0 : distance.value))
const contentStyle = computed(() => ({
  transform: `translateY(${offset.value}px)`,
  transition: tracking ? 'none' : 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)'
}))

function onTouchStart(event: TouchEvent) {
  if (props.disabled || refreshing.value) return

  const touch = event.touches[0]
  if (!touch) return

  // A sheet locks body scroll, so scrollY stays 0 while the user drags inside
  // it — without this, dragging in the alamat form would refresh the page.
  if ((event.target as Element | null)?.closest('[role="dialog"]')) return
  if (window.scrollY > 0) return

  startY = touch.clientY
  startX = touch.clientX
  active = true
}

function onTouchMove(event: TouchEvent) {
  if (!active) return

  const touch = event.touches[0]
  if (!touch) return

  const dy = touch.clientY - startY
  const dx = touch.clientX - startX

  // Horizontal drags belong to the segmented tabs and carousels.
  if (!tracking && Math.abs(dx) > Math.abs(dy)) {
    active = false
    return
  }

  if (dy <= 0) {
    if (!tracking) active = false
    return
  }

  tracking = true
  // Claim the gesture so the page neither scrolls nor triggers the browser's
  // own refresh. Requires a non-passive listener, registered below.
  if (event.cancelable) event.preventDefault()
  distance.value = Math.min(dy * 0.5, MAX)
}

async function onTouchEnd() {
  if (!active) return
  active = false

  if (!tracking) return
  tracking = false

  if (distance.value < THRESHOLD) {
    distance.value = 0
    return
  }

  refreshing.value = true
  distance.value = HOLD

  try {
    await props.refresh()
  } finally {
    refreshing.value = false
    distance.value = 0
  }
}

// `{ passive: false }` is what makes preventDefault legal in onTouchMove.
useEventListener(root, 'touchstart', onTouchStart, { passive: true })
useEventListener(root, 'touchmove', onTouchMove, { passive: false })
useEventListener(root, 'touchend', onTouchEnd, { passive: true })
useEventListener(root, 'touchcancel', onTouchEnd, { passive: true })
</script>

<template>
  <div ref="root">
    <div
      class="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      :style="{
        transform: `translateY(${Math.max(offset, refreshing ? HOLD : 0) - 44}px)`,
        transition: tracking ? 'none' : 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: visible ? 1 : 0
      }"
    >
      <span class="flex size-9 items-center justify-center rounded-full bg-white shadow-card">
        <UIcon
          name="i-lucide-refresh-cw"
          class="size-4 text-primary"
          :class="refreshing ? 'animate-spin' : ''"
          :style="refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }"
        />
      </span>
    </div>

    <div :style="contentStyle">
      <slot />
    </div>
  </div>
</template>
```

- [ ] **Step 5: Wire it into `app/layouts/default.vue`**

```vue
<script setup lang="ts">
import type { ApiKey } from '~/composables/useApi'

const route = useRoute()
const toast = useToast()
const online = useOnline()
const { drain } = useOutbox()
const { handler } = usePageRefresh()

const refreshKeys = computed(() => (route.meta.refreshKeys ?? []) as ApiKey[])

// A page that declares neither gets no gesture at all — intended for the kirim
// wizard, where a stray pull mid-draft would be hostile.
const pullDisabled = computed(() => refreshKeys.value.length === 0 && !handler.value)

async function pullRefresh() {
  if (!online.value) {
    toast.add({
      title: 'Tidak ada koneksi',
      description: 'Data akan diperbarui setelah kembali online.',
      color: 'warning'
    })
    return
  }

  await drain()
  await Promise.all([
    refreshKeys.value.length ? invalidateApiData(refreshKeys.value) : Promise.resolve(),
    handler.value ? handler.value() : Promise.resolve()
  ])
}
</script>

<template>
  <div class="min-h-screen bg-[#f8f9fb]">
    <AppOfflineBanner />
    <AppSidebar />
    <div class="w-full lg:ml-68 lg:w-[calc(100%-17rem)]">
      <div class="relative mx-auto min-h-screen w-full md:max-lg:max-w-105 md:max-lg:overflow-hidden md:max-lg:shadow-2xl">
        <AppPullToRefresh
          :refresh="pullRefresh"
          :disabled="pullDisabled"
        >
          <div class="animate-page-in pb-28">
            <slot />
          </div>
        </AppPullToRefresh>
      </div>
    </div>
    <AppBottomNav />
  </div>
</template>
```

- [ ] **Step 6: Declare `refreshKeys` on the five keyed pages**

Add as the first statement in each `<script setup>` block:

`app/pages/index.vue`:
```ts
definePageMeta({ refreshKeys: ['profile', 'shipments', 'orders', 'stats'] })
```

`app/pages/riwayat/index.vue`:
```ts
definePageMeta({ refreshKeys: ['orders'] })
```

`app/pages/alamat.vue`:
```ts
definePageMeta({ refreshKeys: ['addresses'] })
```

`app/pages/profil/index.vue`:
```ts
definePageMeta({ refreshKeys: ['profile', 'stats'] })
```

`app/pages/lacak/index.vue`:
```ts
definePageMeta({ refreshKeys: ['shipments'] })
```

- [ ] **Step 7: Register the custom handler on `app/pages/riwayat/[id].vue`**

Add after the existing `useAsyncData` call (which is what actually feeds this screen):

```ts
// This page's data is `order-<id>`, not a `useApi` key, so it refreshes itself
// and then syncs the lists that the change would also affect.
registerPageRefresh(async () => {
  await refresh()
  await invalidateApiData(['orders', 'shipments', 'stats'])
})
```

- [ ] **Step 8: Verify lint and types**

Run: `pnpm lint && pnpm typecheck`
Expected: both pass. If `route.meta.refreshKeys` is typed `unknown`, confirm `app/types/page-meta.d.ts` is picked up — it must be inside `app/` and `pnpm postinstall` may need re-running.

- [ ] **Step 9: Manual check — desktop regression pass**

`pnpm dev` on desktop. Expected: normal mouse scrolling on every page is unchanged, no indicator ever appears, and dialogs open and scroll normally.

- [ ] **Step 10: Manual check — the gesture on a real device**

This must be checked on an actual touchscreen; Chrome's device emulation does not reproduce the native overscroll conflict.

Run `pnpm build && pnpm preview --host`, open the app on an Android phone on the same network, and on each of beranda, riwayat, alamat, profil and lacak:

1. Pull down from the top. Expected: **one** spinner, the content eases down, and on release the data refetches. No browser reload, no second native spinner.
2. Scroll down, then pull. Expected: nothing happens — the gesture only arms at the top.
3. On `/alamat`, open the "Tambah alamat baru" sheet and drag down inside it. Expected: the sheet scrolls; the page does **not** refresh.
4. On `/kirim` (the wizard), pull down. Expected: no gesture at all.
5. On `/riwayat/<id>`, pull down. Expected: the detail on screen updates, not just the list behind it.
6. Offline, pull anywhere. Expected: the "Tidak ada koneksi" toast, and no request in the network log.

- [ ] **Step 11: Commit**

```bash
git add app/components/app/AppPullToRefresh.vue app/composables/usePageRefresh.ts app/types/page-meta.d.ts app/assets/css/main.css app/layouts/default.vue app/pages/index.vue app/pages/riwayat/index.vue app/pages/alamat.vue app/pages/profil/index.vue app/pages/lacak/index.vue "app/pages/riwayat/[id].vue"
git commit -m "feat(ui): add pull-to-refresh to the main screens"
```

---

### Task 10: Full-feature verification pass

**Files:** none — this task only runs the spec's checklist and fixes what it finds.

**Interfaces:**
- Consumes: everything from Tasks 1-9.
- Produces: a green checklist.

- [ ] **Step 1: Build and serve**

Run: `pnpm lint && pnpm typecheck && pnpm build && pnpm preview --host`
Expected: all four succeed.

- [ ] **Step 2: Work the spec checklist**

Walk items 1-10 in `docs/superpowers/specs/2026-09-20-pwa-offline-design.md` § Verification, on a real Android device for the gesture items. Fix anything that fails, then re-run this step.

Pay particular attention to item 10 — sign out, sign in as the second seeded account, and confirm DevTools → Application → IndexedDB holds no trace of the first account's rows and the outbox is empty.

- [ ] **Step 3: Lighthouse**

In Chrome DevTools → Lighthouse, run a mobile audit against `pnpm preview`.
Expected: the installability checks pass (manifest, icons, service worker). Note the score in the commit message if anything is still amber.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(offline): address verification findings"
```

## Self-Review

**Spec coverage** — every section maps to a task: manifest and SW → Task 1; update and install → Task 2; IDB wrapper → Task 3; offline reads (persist, hydrate, userId scoping, logout purge) → Task 4; offline banner → Task 5; outbox with tmp-id rewrite, 4xx drop, attempt cap and resync → Tasks 6-7; blocked order actions → Task 8; pull-to-refresh including `overscroll-behavior-y`, the dialog guard and reduced motion → Task 9; the spec's 10-item verification list → Task 10.

**Known deviation** — `riwayat/[id].vue` gets `registerPageRefresh()` rather than `refreshKeys`, for the reason given at the top of this plan. `lacak/[resi].vue` still has no gesture, per the approved spec.

**Type consistency** — `fetchedAtState`, `writeApiCache`, `hydrateApiCache`, `clearOfflineStores` (Task 4) are used under those exact names in Tasks 5, 6, 7. `useOutbox()` returns `{ pending, enqueue, drain, loadPending }` in Task 6 and is destructured accordingly in Tasks 5, 6 and 9. `OutboxEntry` and the `idb*` helpers match Task 3's definitions. `CachedEntry.key` is `string` (not `ApiKey`) because IndexedDB keys are strings, and is cast at the one place it re-enters typed code.

**Ordering note** — Task 5 consumes `useOutbox` from Task 6. Step 3 of Task 5 names the stub and Task 6 Step 3 removes it. Executing Task 6 before Task 5 avoids the stub entirely and is acceptable.
