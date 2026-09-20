# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (pinned via `packageManager: pnpm@12.3.4`).

```bash
pnpm install      # install deps (runs `prisma generate && nuxt prepare` via postinstall)
pnpm dev          # dev server on http://localhost:3000
pnpm build        # production build
pnpm preview      # preview the production build locally
pnpm lint         # eslint . — CI gate
pnpm typecheck    # nuxt typecheck (vue-tsc) — CI gate
pnpm db:migrate   # prisma migrate dev
pnpm db:seed      # prisma db seed — demo logins + demo data
pnpm db:reset     # DESTRUCTIVE: migrate reset + db push + seed, in that order
pnpm db:studio    # prisma studio
```

`db:reset` drops and rebuilds the `public` schema, so it is dev-only. Prisma 7 removed both `migrate reset --skip-seed` and reset's implicit seeding, so the three steps each run exactly once. `auth` is a separate schema and survives the reset; the seeder finds the existing `auth.users` rows by email and reuses their ids, which is what keeps `Profile.id` mirroring them.

`pnpm lint -- --fix` applies autofixes. There is no test runner configured; CI (`.github/workflows/ci.yml`, Node 22) runs only lint + typecheck, so both must pass before a change is done.

If `.nuxt/` is missing or stale, `pnpm postinstall` regenerates it — ESLint and TypeScript both resolve their configs out of `.nuxt/`, so lint/typecheck will fail confusingly without it. The same command regenerates `server/generated/prisma/`, which is gitignored.

## Architecture

Nuxt 4 SSR app in three layers: `app/` (UI), `server/` (Nitro API and integrations), `shared/` (types and helpers auto-imported by both). Nuxt 4 srcDir layout — no `src/`, no `nuxt.config` `srcDir` override.

### App

- `app/app.vue` — root shell. Wraps everything in `<UApp>` with `UHeader` / `UMain` / `UFooter` from Nuxt UI; `<NuxtPage />` renders the routed page. Global `useHead` / `useSeoMeta` live here.
- `app/pages/` — file-based routing.
- `app/components/` — auto-imported by filename (no explicit imports needed).
- `app/app.config.ts` — Nuxt UI runtime theme (`ui.colors.primary` / `neutral`). Change semantic colors here, not in CSS.
- `app/assets/css/main.css` — the only global stylesheet, registered via `nuxt.config.ts` `css:`.
- `app/composables/useApi.ts` — every server-state read. These wrap `useAsyncData` with fixed keys so components share one request. Pages do **not** `await` them: the app is client-rendered, so each page reads `status` and shows `USkeleton`s while it is `'idle'` / `'pending'`, and lookups that miss render `AppNotFound` in-page rather than `throw createError`.
- `app/stores/booking.ts` — the only Pinia store. It holds the kirim wizard draft, which spans three routes. Do not add stores for server state.

### Server

- `server/utils/prisma.ts` — the Prisma singleton. Supabase's Postgres certificate is signed by a private CA (pinned in `server/utils/supabase-ca.ts`), and node-postgres lets a connection-string `sslmode` override an explicit `ssl` object, so the URL's `sslmode` is stripped before the adapter sees it.
- `server/utils/auth.ts` — `requireProfile(event)` guards every user-scoped route. `serverSupabaseUser()` returns decoded JWT *claims*, not a `User`: the id is `sub`, and claims carry an index signature, so `.id` typechecks and is silently undefined.
- `server/utils/rajaongkir.ts` — RajaOngkir API V2. The product is called V2 but the path is `/api/v1`; there is no `/api/v2`. Errors arrive in the response envelope as well as in the status code. `/api/couriers/rates` passes RajaOngkir's `name/service/description/cost/etd` through verbatim (only `id` and `brand` are ours) and is restricted to `ALLOWED_COURIERS` (`shared/utils/courier.ts`, currently Lion Parcel only) — the cost API quotes no insurance and no cashback, so the UI carries neither.
- `server/api/shipments/[resi].get.ts` — looks up our own orders by AWB, Komship order number or internal number, and otherwise tracks the waybill straight from RajaOngkir, trying each allowed carrier when no `courier` query is given. The Komship handoff runs against the **sandbox**, so the AWBs it returns are not known to real carriers until a production key exists.
- `server/utils/destinations.ts` — local destination index. RajaOngkir's hosted search only matches whole words (`cibad` → nothing, `cibadak` → results), so `/api/destinations` searches `server/assets/destinations.tsv.gz` — built by `pnpm build:destinations` (`scripts/build-destinations.ts`, ~7,500 paced requests, resumable via `scripts/.cache/`) — and only falls back to the hosted search when the snapshot is missing.
- `server/utils/komship.ts` — the carrier handoff. Komship's carrier catalog and tariffs are **separate** from the RajaOngkir cost API's, so a quoted service must be re-resolved via `resolveKomshipService()` or the store call fails with "expedition not found".
- `server/utils/mappers.ts` — Prisma rows to the domain types in `shared/types`.

### Data

`prisma/schema.prisma` owns the `public` schema; Supabase Auth owns `auth`, and Prisma never touches it. `Profile.id` mirrors `auth.users.id` and is upserted on the first authenticated request. There is no `DATABASE_URL`: both pooler connection strings are derived by `server/utils/supabase-db.ts` from `NUXT_SUPABASE_URL` (project ref), `NUXT_SUPABASE_PASSWORD` and `NUXT_SUPABASE_POOLER_HOST` (region is not derivable from the URL), so the password lives in one place. The datasource is set in `prisma.config.ts`, not in the schema (Prisma 7 removed `directUrl`), and only when those settings are present so `prisma generate` still runs in CI without a `.env`; migrations run against the session pooler (5432) because the transaction pooler (6543) cannot hold Prisma Migrate's advisory locks.

`prisma/seed.ts` (run by `pnpm db:seed`, wired through `prisma.config.ts` `migrations.seed`, run by `tsx` because the generated client's `.js` specifiers only exist as `.ts`) is the **one** exception to "Prisma never touches `auth`": it writes `auth.users` and `auth.identities` directly, since signup obeys the project's email-confirmation and rate-limit settings and there is no service-role key in `.env`. Two details are load-bearing — passwords must be hashed with pgcrypto's `crypt(..., gen_salt('bf', 10))`, whose schema is resolved at runtime (`extensions` on Supabase), and `confirmation_token` / `recovery_token` / `email_change_token_new` / `email_change` must be `''` rather than NULL or every sign-in fails with "Database error querying schema". The seeder ends by actually signing in against GoTrue, so a broken row fails the run instead of the login page. It only ever deletes rows belonging to the accounts in `prisma/seed/fixtures.ts`.

### Styling

Tailwind CSS **v4**, configured CSS-first — there is no `tailwind.config.js` and there should not be one. `main.css` does `@import "tailwindcss"` then `@import "@nuxt/ui"`, and declares design tokens inside an `@theme static { ... }` block (font family, color ramps). Add or override tokens there; Tailwind generates utilities from them.

Prefer Nuxt UI components (`U*`) and Tailwind utility classes over hand-written CSS. Use Nuxt UI's semantic classes (`text-muted`, `outline-primary`, etc.) rather than hard-coded palette values so dark mode keeps working.

Icons come from Iconify collections installed as deps: `i-lucide-*` and `i-simple-icons-*`. Using an icon from another collection requires adding its `@iconify-json/*` package.

Carriers have no brand metadata in the RajaOngkir response, so `shared/utils/courier.ts` supplies colors, initials, logos and vehicle icons keyed by courier code, rendered everywhere through `AppCourierLogo`. Logos live in `public/img/couriers/` (pulled from each carrier's own site); a carrier without one falls back to initials on its gradient, and `logoOnBrand` marks white logos that need the gradient behind them. Add new carriers there.

Every clickable surface carries `v-ripple` (light ink) or `v-ripple.dark`; pass `v-ripple="{ dark }"` when the surface flips between light and dark. Interactive elements get a base transition from `main.css`, so hover utilities never snap.

### Modules

`@nuxt/eslint`, `@nuxt/ui`, `@vueuse/nuxt` (VueUse composables auto-imported), `@vite-pwa/nuxt`, `@pinia/nuxt`, `@nuxtjs/supabase`.

### PWA and offline

Offline support is split between two caches that never overlap. The service worker (Workbox `generateSW`, `registerType: 'prompt'`) owns the shell, the courier logos and the two *unkeyed* GETs — `/api/shipments/*` (`NetworkFirst`) and `/api/destinations*` (`CacheFirst`). IndexedDB (`app/utils/offline-db.ts`) owns the five `useApi` keys and the mutation outbox, so the UI can state how old a cached screen is.

Two build-order facts are load-bearing. With `ssr: false` the shell is rendered per request and never written to disk, so `nitro.prerender.routes: ['/']` emits one; and because the service worker is generated *before* Nitro prerenders, `html` is kept out of `globPatterns` and `/` is precached through `additionalManifestEntries` instead — globbing it would pick up the previous build's `index.html` and collide. PWA head tags live in `app.head`, not `app.vue`, because a `useHead` call only runs after hydration and never reaches the prerendered document.

`app/plugins/offline.client.ts` seeds the payload from IndexedDB before the first page mounts, then drains the outbox on boot and on reconnect. Writes made offline are queued for alamat and profil only; anything touching an order (buat pesanan, bayar, batalkan) requires a live connection, because replaying a quote into RajaOngkir/Komship would book a real shipment at a stale tariff. A 4xx on replay drops the entry, a 5xx retries up to five times.

Pull-to-refresh (`AppPullToRefresh`, mounted in `layouts/default.vue`) is declared per page via `definePageMeta({ refreshKeys })`; a page that declares none has no gesture. Pages fetching outside the keyed endpoints use `registerPageRefresh()` instead — `riwayat/[id]` does. `overscroll-behavior-y: contain` in `main.css` is what stops Android Chrome running its own pull-to-refresh alongside it.

The app is client-rendered (`ssr: false`): every route is user-scoped and there is nothing to index. `app/spa-loading-template.html` is the branded splash the server ships before hydration, and `<NuxtLoadingIndicator>` in `app.vue` covers route changes. `@nuxtjs/supabase` `redirectOptions` sends unauthenticated users to `/login`; the auth pages are in its `exclude` list.

Secrets reach the server through `runtimeConfig`, so `NUXT_RAJAONGKIR_SHIPPING_COST_API_KEY` maps to `rajaongkir.shippingCostApiKey`, and so on. See `.env.example`.

## Conventions

ESLint is `@nuxt/eslint` with stylistic rules enabled and two explicit overrides in `nuxt.config.ts`: **no trailing commas** (`commaDangle: 'never'`) and **1TBS brace style**. `.editorconfig`: 2-space indent, LF, final newline, trimmed trailing whitespace. Lint failures on style are usually one of these.

User-facing copy is Indonesian. Keep error messages from the API in Indonesian too — the UI surfaces `statusMessage` directly in toasts.
