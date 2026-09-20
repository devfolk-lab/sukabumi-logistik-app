# PWA, offline mode and pull-to-refresh

Date: 2026-09-20
Status: approved, ready for implementation planning

## Problem

`@vite-pwa/nuxt` is registered in `nuxt.config.ts` but has no `pwa` options
block, so the app today ships no manifest and no service worker: it cannot be
installed, and a lost connection leaves every screen empty. The app is
`ssr: false` and every route is user-scoped, so there is no server-rendered
fallback to fall back to.

`app/composables/useApi.ts` already implements stale-while-revalidate over five
keyed endpoints (`profile`, `addresses`, `orders`, `shipments`, `stats`), but
its cache lives in `nuxtApp.payload.data` and a module-level `Map`. Both die on
reload, so a cold start with no network shows skeletons forever.

## Goals

- Installable PWA with a correct manifest and an update prompt.
- Previously loaded data stays readable with no connection.
- Address-book and profile edits made offline are queued and replayed on
  reconnect.
- Pull-to-refresh on the main screens, refreshing only that screen's data.

## Non-goals

- Queuing anything that touches an order. `buat pesanan`, `bayar` and
  `batalkan` require a live connection (decided explicitly: order creation
  calls RajaOngkir/Komship and would replay a stale tariff into a real
  shipment).
- Encrypting cached data. It is the user's own data on their own device, and
  the Supabase session token already lives in the same origin.
- An offline fallback page for routes never visited. The shell precache covers
  the real case.
- Conflict resolution beyond last-write-wins on alamat and profil.
- A test runner. CI stays lint + typecheck; verification is the manual
  checklist below.

## Architecture

Two caches, split by what each is good at, with no overlap:

| Layer | Owns | Why |
|---|---|---|
| Service worker (Workbox `generateSW`) | Built shell, `img/couriers/**`, fonts, `/api/shipments/*`, `/api/destinations*` | Unkeyed GETs the app cannot model per-key |
| IndexedDB (`app/utils/offline-db.ts`) | The five `useApi` keys, the mutation outbox | `useApi` already tracks `fetchedAt` per key; this gives it a durable home and lets the UI state how old the data is |

The five keyed endpoints are explicitly **not** cached by the service worker,
and no mutation route is ever intercepted by it.

## Service worker and manifest

New `pwa` block in `nuxt.config.ts`.

Manifest: `name: 'Sukabumi Logistik'`, `short_name: 'SukLog'`,
`display: 'standalone'`, `start_url: '/'`, `lang: 'id'`,
`theme_color: '#002144'` (the hero navy, which sits under the status bar),
`background_color: '#f8f9fb'` matching `layouts/default.vue` and
`app/spa-loading-template.html` so the splash does not flash white. Icons reuse
`public/web-app-manifest-{192,512}.png`, with an added `maskable` entry on the
512 so Android does not letterbox it. The `apple-touch-icon` link already in
`app/app.vue` stays.

Strategy: `generateSW` (no custom SW logic that cannot be expressed as runtime
caching rules), `registerType: 'prompt'` so a new build never swaps itself in
under an in-progress kirim wizard.

Runtime caching, two rules only:

- `/api/shipments/*` — `NetworkFirst`, 5s timeout, 50 entries, 1 day. Tracking
  is worth showing stale, never worth showing instead of fresh.
- `/api/destinations*` — `CacheFirst`, 30 days. The destination index is a
  static snapshot rebuilt by `pnpm build:destinations`, not per-request data.

`devOptions.enabled: true` so the service worker runs under `pnpm dev`.

**To confirm against a real `pnpm build` during implementation:** the exact SPA
fallback document Nuxt 4 emits with `ssr: false`, which is what
`navigateFallback` must point at for a cold offline launch to work, and that
`navigateFallbackDenylist` excludes `/api/` so API calls are never served the
HTML shell.

## Offline reads

`app/utils/offline-db.ts` (new, ~60 lines, no new dependency): one IDB
database, two object stores — `cache` (key = `ApiKey`) and `outbox`
(auto-increment). Only get/set/delete/getAll are needed, which does not justify
a dependency.

`app/composables/useApi.ts` changes:

- Each successful fetch writes `{ data, fetchedAt, userId }` to `cache`. The
  two existing `fetchedAt.set()` sites (`useApi.ts:49` in `fetchFresh` and
  `:135` in `prefetchApiData`) are the two that persist; the background
  revalidate path is covered because it goes through `fetchFresh`.
- `fetchedAt` becomes reactive so the offline banner can render it.
- `clearApiCache()` additionally purges the IDB stores and `caches.delete()`s
  the service worker's API runtime cache.

`app/plugins/offline.client.ts` (new) awaits a read of all `cache` entries
before mount and seeds `nuxtApp.payload.data[key]` plus `fetchedAt`. Entries
whose `userId` does not match the current session are dropped — this is the
guard against one account seeing another's data.

Nothing else in `useApi` changes: `getCachedData` finds the seed and paints
immediately, the existing stale check fires a background revalidate, and when
that revalidate fails for lack of network the cached copy simply stays on
screen.

## Offline writes (the outbox)

`app/composables/useOutbox.ts` (new) exposes `enqueue()`, `drain()` and a
reactive `pending` count. Entries are
`{ method, url, body, invalidates: ApiKey[], label }`.

Queued call sites — all five route through one helper that uses a normal
`$fetch` when online and enqueues when not:

- `app/pages/alamat.vue:31` PATCH, `:33` POST, `:51` DELETE, `:64` set-main
- `app/pages/profil/pengaturan.vue:41` profile PATCH

Blocked-when-offline call sites, with the button disabled and
*"Butuh koneksi internet"* on the control itself rather than a toast after the
tap:

- `app/pages/kirim/detail.vue:32` (buat pesanan), `:47` (bayar)
- `app/pages/riwayat/[id].vue:43` (bayar), `:57` (batalkan)

Offline behaviour: enqueue, apply the change optimistically to the cached
array, persist, and toast *"Tersimpan offline — akan disinkronkan"*.
`AlamatAddressCard` gains a `pending` prop rendering a *"Menunggu sinkron"*
badge.

Three edge cases handled explicitly:

1. **Temporary ids.** An address created offline gets a `tmp-` id. If the user
   then edits or deletes it while still offline, that entry targets an id the
   server has never seen, so when the POST replays its real id is patched into
   every later queued entry referencing the tmp one.
2. **Replay outcomes.** Drain is sequential in insertion order, triggered on
   boot and on the `online` event via VueUse's `useOnline`. A 4xx drops the
   entry and toasts the Indonesian `statusMessage` — replaying a rejected write
   helps nobody. A 5xx or network error keeps it for the next drain, capped at
   5 attempts, then dropped with a toast.
3. **Resync.** After a drain, `invalidateApiData()` runs on the touched keys so
   server truth replaces the optimistic copy, including server-assigned ids.

## Pull-to-refresh

`app/components/app/AppPullToRefresh.vue` (new) wraps the `<slot />` in
`layouts/default.vue`. Touch events only, so it never fires on desktop.

Behaviour: engages on `touchstart` only when `window.scrollY <= 0`, tracks a
vertical-dominant delta, translates content down with resistance
(`delta * 0.5`, capped at 80px) behind a spinner whose rotation tracks
progress. Past a 64px threshold, release fires the refresh and the indicator
holds at 56px until it settles.

Three details that make or break the feel:

- **`overscroll-behavior-y: contain` on `html`/`body`** in
  `app/assets/css/main.css`. Without it, Android Chrome's own pull-to-refresh
  fires simultaneously, producing two spinners and a full page reload.
- **Bail when the touch starts inside `[role="dialog"]`.** `UModal` locks body
  scroll, leaving `scrollY` at 0, so without this guard a drag inside the
  alamat form sheet would refresh the page.
- **`prefers-reduced-motion`** skips the translate and shows only the spinner.

What a pull refreshes is declared by the page:
`definePageMeta({ refreshKeys: ['orders'] })`, with `refreshKeys?: ApiKey[]`
added to `PageMeta` by module augmentation so it typechecks. The layout reads
`route.meta.refreshKeys` and calls `invalidateApiData()` on exactly those. A
page declaring none has no gesture — intended for the kirim wizard, where a
stray pull mid-draft would be hostile.

Wiring:

| Page | `refreshKeys` |
|---|---|
| `app/pages/index.vue` | `profile`, `shipments`, `orders`, `stats` |
| `app/pages/riwayat/index.vue`, `riwayat/[id].vue` | `orders` |
| `app/pages/alamat.vue` | `addresses` |
| `app/pages/profil/index.vue` | `profile`, `stats` |
| `app/pages/lacak/index.vue` | `shipments` |

`app/pages/lacak/[resi].vue` is excluded: it fetches by route param through its
own `$fetch`, not a keyed endpoint, so it does not fit this contract. Its
freshness comes from the service worker's `NetworkFirst` rule.

A pull while online also drains the outbox. A pull while offline skips the
requests and toasts *"Tidak ada koneksi"*.

## Offline banner, update and install

`app/components/app/AppOfflineBanner.vue` (new) in the default layout, driven
by `useOnline()`. Shows *"Mode offline — data terakhir diperbarui 14:32"* from
the oldest `fetchedAt` among the current route's `refreshKeys`, appending
*"· 2 perubahan menunggu sinkron"* when the outbox is non-empty.

Update and install use the module's own `$pwa` helper rather than hand-rolled
service worker listeners. `$pwa.needRefresh` drives a toast with a
*"Muat ulang"* action calling `$pwa.updateServiceWorker()`. Install adds a
*"Pasang aplikasi"* row to `app/pages/profil/pengaturan.vue`, shown when
`$pwa.showInstallPrompt` is true; on iOS, where `beforeinstallprompt` does not
exist, the row opens a dialog with the Share → *"Tambahkan ke Layar Utama"*
steps.

## Files

New:

- `app/utils/offline-db.ts`
- `app/composables/useOutbox.ts`
- `app/plugins/offline.client.ts`
- `app/components/app/AppPullToRefresh.vue`
- `app/components/app/AppOfflineBanner.vue`

Modified:

- `nuxt.config.ts` (`pwa` block)
- `app/composables/useApi.ts` (persist, hydrate, reactive `fetchedAt`, purge)
- `app/layouts/default.vue` (wrap slot, mount banner)
- `app/assets/css/main.css` (`overscroll-behavior-y`)
- `app/pages/alamat.vue`, `app/pages/profil/pengaturan.vue` (queued writes)
- `app/pages/kirim/detail.vue`, `app/pages/riwayat/[id].vue` (online guards)
- `app/components/alamat/AddressCard.vue` (`pending` badge)
- The six pages listed in the pull-to-refresh table (`refreshKeys` meta)

## Verification

No test runner (decided). `pnpm lint` and `pnpm typecheck` must pass, and the
following is checked by hand against `pnpm build && pnpm preview`:

1. Lighthouse PWA audit passes; the app installs on Android and iOS.
2. Cold launch with DevTools offline renders beranda, riwayat, alamat and
   profil from cache, each labelled with the correct last-updated time.
3. Offline: add, edit, set-main and delete an address, and edit the profile.
   Each shows the *"Menunggu sinkron"* badge. Reload while still offline — the
   queue and the optimistic state survive.
4. Go back online. The queue drains in order, badges clear, and the list
   matches the server after the resync.
5. Offline: an address created offline can be edited and deleted, and the
   replay produces one correct row (tmp-id rewrite).
6. A queued write the server rejects with a 4xx is dropped with an Indonesian
   toast, not retried forever.
7. Offline: buat pesanan, bayar and batalkan are disabled with
   *"Butuh koneksi internet"*.
8. Pull-to-refresh on a real Android device: one spinner, not two, and no
   browser reload. Works on all six wired pages, absent on the kirim wizard,
   and does not fire when dragging inside the alamat dialog.
9. Deploying a new build raises the *"Versi baru tersedia"* toast, and
   *"Muat ulang"* activates it.
10. Logging out and into a second account shows no trace of the first
    account's cached data or queued writes.
