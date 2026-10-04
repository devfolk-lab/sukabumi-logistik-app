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

`db:reset` drops and rebuilds the `public` schema, so it is dev-only. Prisma 7 removed both `migrate reset --skip-seed` and reset's implicit seeding, so the three steps each run exactly once. Accounts live in `public` too, so a reset deletes every login; the seeder recreates only the demo ones. Against the shared Supabase database use `prisma migrate deploy`, never `db:reset` or `db push`.

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
- Authentication is our own, on Postgres — no Supabase Auth, so the app runs on any Postgres. `server/utils/auth.ts` owns sessions: a random 256-bit token in the httpOnly cookie `suklog_session`, stored only as its SHA-256 in `sessions`, 30 days, extended when used with under 15 left. `requireProfile(event)` guards every user-scoped route (401 otherwise) and caches a resolved session for 60 s per instance; `revokeSessions()` clears that cache locally, so another instance may honour a revoked session for up to a minute. Passwords are bcrypt cost 10 (`server/utils/password.ts`, `bcryptjs`), the scheme Supabase Auth used, which is why the imported hashes verify unchanged.
- `/api/auth/*`: `login`, `logout`, `session` (who the cookie belongs to; always 200), `register`, `resend-confirmation`, `verify-email`, `forgot-password`, `check-reset-token`, `reset-password`, `change-password`. Login is refused (403) until the email is confirmed, and says so only after the password checks out; a wrong password and an unknown address get the same 401 and the same bcrypt cost. Reset signs every device out; change-password signs out all but this one. The emailed links carry single-use tokens from `server/utils/auth-tokens.ts` (`auth_tokens`, SHA-256 only, confirm 24 h, reset 1 h; issuing one deletes the previous) and are sent through `useNodeMailer()` (`server/utils/auth-mail.ts`). Links are built from `NUXT_PUBLIC_SITE_URL`, never the Host header, so a forged Host cannot redirect a reset token. Forgot/resend answer the same for unknown addresses. `server/utils/rate-limit.ts` (in memory, per instance) allows one email per address per minute per kind and ten logins per address per 15 minutes.
- Client side, `app/plugins/00.auth.client.ts` asks `/api/auth/session` on launch (named `00.` so it runs before `offline.client.ts`) and `app/middleware/auth.global.ts` sends signed-out visitors to `/login`; `isPublicRoute()` in `app/composables/useAuthUser.ts` lists the pages that need no account. The cookie is httpOnly, so the client keeps who is signed in (`useAuthUser`) plus a copy in localStorage: with a copy the app starts on it at once, which is what lets a cold start offline open the cached screens, and the server's answer arrives in the background. `handleUnauthorized()` turns a 401 from `useApi` into a redirect to login.
- `server/utils/biteship.ts` — the only carrier integration: area search, rates, order handoff, cancellation and tracking. Biteship signals failure as `{ success: false, error }` with English messages; `biteshipFailure()` converts them to Indonesian `statusMessage`s and logs the original. The key's prefix picks the environment — a `biteship_test.` key creates orders no courier collects and returns `WYB-…` placeholder waybills. **Rates (`/v1/rates/couriers`) and waybill tracking (`/v1/trackings/:awb/couriers/:code`) are billed per call and refused with "No sufficient balance" while the account balance is empty, even in test mode**; order create/get/cancel and tracking by `tracking_id` are not. `/api/couriers/rates` passes Biteship's price, service and duration through verbatim (only `id`, `brand` and the carrier's full name are ours) and is restricted to `ALLOWED_COURIERS` (`shared/utils/courier.ts`, currently Lion Parcel and J&T Cargo). Rates and orders send the customer's own package lines (`PackageItem`: name, description, category, sku, value, quantity, weight in grams, length/width/height in cm) as Biteship's `items`; `server/utils/schemas.ts` validates them. No insurance is quoted, so the UI carries none.
- Checkout is a draft order paid by manual bank transfer. "Buat Pesanan" on `/kirim/detail` calls `POST /api/orders`, which re-prices on Biteship, stores the order as `MENUNGGU_PEMBAYARAN` and opens a Biteship **draft order** (`server/utils/payment.ts` `ensureDraft`, our `orderNo` as `reference_id`); if Biteship refuses, our row is deleted again. The app then opens the order page, whose "Bayar" shows the steps (`RiwayatPaymentSteps`): transfer to `PAYMENT_ACCOUNT` (`shared/utils/payment.ts`, placeholder details), then send the prefilled WhatsApp message (`paymentRequestMessage`: "Order ID" is the draft id, "No. Referensi" our `orderNo`) to `NUXT_PUBLIC_HELP_WHATSAPP`, then the transfer proof. A draft has **no waybill or tracking id** until it is confirmed, which is why the message carries no waybill. The admin confirms the draft in the Biteship dashboard; nothing calls back, so `syncPayment` asks Biteship (at most once per order per 15 s) whenever an unpaid order is read — order detail, order list, active shipments — and on `confirmed` records `paymentMethod: "TRANSFER"`, `paidAt` and the booked order's ids, after which `syncTracking` follows it. A deleted draft cancels the order. The order page re-reads every 20 s while unpaid. Cancelling an unpaid order deletes its draft; Biteship refuses that once confirmed, and the API answers 409. Unpaid orders from before drafts get one from `POST /api/orders/[id]/draft` when "Bayar" is opened. Orders paid under the earlier demo checkout carry `paymentMethod: "DEMO"`.
- `server/utils/tracking.ts` — follows booked orders via Biteship `tracking_id` (free), caches history in `tracking_events`, and advances the order stage forward only. Orders without a tracking id (seed data, pre-Biteship Komship sandbox AWBs) are never looked up by waybill, since that call is billed and could only fail.
- `server/api/shipments/[resi].get.ts` — looks up our own orders by AWB or internal number, and otherwise tracks the waybill straight from Biteship (billed), trying each allowed carrier when no `courier` query is given.
- `/api/destinations` is Biteship's `/v1/maps/areas` (kecamatan + postal code, e.g. `IDNP9IDNC421IDND5206IDZ43351`) passed through as `Area`, key for key in Biteship's snake_case. It matches whole words only and needs 3+ characters; `useDestinationSearch` waits one second after the last keystroke. The UI says "Kecamatan" and shows kecamatan, kota, provinsi and kode pos (`AppAreaDetails`, `areaTitle`/`areaSubtitle` in `shared/utils/area.ts`).
- `server/utils/mappers.ts` — Prisma rows to the domain types in `shared/types`, and Biteship statuses to Indonesian timeline titles and order stages. Every order query uses `ORDER_INCLUDE` so the items come along.
- The 100 × 150 mm shipping label is `ResiLabel` (Code 128 barcode from `app/utils/barcode.ts`). "Cetak Resi" and "Unduh Resi" on riwayat both go through `ResiPrinter` and never leave the page. Printing mounts the label in a sheet teleported to `<body>` and adds a stylesheet, for that job only, that hides every other child of `<body>` and sets the page size; both are removed on `afterprint`, not after `window.print()` returns, because on Android it returns before the page is captured. The PDF is a copy mounted off screen at exactly 100 mm and rasterised (`downloadLabelPdf` in `app/utils/resi.ts`; `modern-screenshot` + `jspdf`, loaded on first use).
- `/resi/[id]` is a standalone label page (layout-less) that prints itself once the label renders; nothing in the app links to it any more. It renders the label from the cached order even while `useAsyncData` refetches — gating it on `status` puts the skeleton on the page when `window.print()` fires, and the print comes out blank.
- The order detail page shows the carrier's own history ("Riwayat Pelacakan") from `shipment.timeline` when `shipment.tracked`. Each `tracking_events` row keeps Biteship's raw `status` and `note` beside the Indonesian title; `trackingStatusMeta()` (`app/utils/tracking-status.ts`) maps the status to the step's icon and colour. "Kirim Lagi" there calls `booking.repeatOrder()` to start a new booking over the same two addresses.

### Data

`prisma/schema.prisma` owns the `public` schema, accounts included: `users` (credentials), `sessions`, `auth_tokens`, and `profiles`, whose id is the user's id (foreign key, cascading) and is created with the account at sign-up. Migration `20261001090000_own_auth` imported the Supabase Auth accounts (`auth.users`: ids, bcrypt hashes, confirmation state) and created profiles for those that never signed in; the import is skipped where no `auth` schema exists, so the migration runs on any Postgres. The app no longer reads `auth` at all. Places are stored as the Biteship area object itself in `jsonb` (`Address.area`, `Order.originArea` / `destinationArea`); package lines live in `order_items` with Biteship's item field names, and `Order.weightGram` is their total. The two pooler connection strings are pasted as-is from the dashboard's "Connect" dialog: `NUXT_SUPABASE_DATABASE_URL` (transaction pooler, 6543) is the app's runtime connection, `NUXT_SUPABASE_DIRECT_URL` (session pooler, 5432) is used by Prisma Migrate and the seeder; `server/utils/supabase-db.ts` reads both from `process.env`, not `runtimeConfig`. The datasource is set in `prisma.config.ts`, not in the schema (Prisma 7 removed `directUrl`), and only when `NUXT_SUPABASE_DIRECT_URL` is present so `prisma generate` still runs in CI without a `.env`; migrations run against the session pooler because the transaction pooler cannot hold Prisma Migrate's advisory locks.

`prisma/seed.ts` (run by `pnpm db:seed`, wired through `prisma.config.ts` `migrations.seed`, run by `tsx` because the generated client's `.js` specifiers only exist as `.ts`) upserts the demo logins into `users` already confirmed, hashed exactly as the login route expects (bcrypt cost 10), reusing the id of any account that already owns the email, and signs out their old sessions. It ends by checking each password against the stored hash, so a broken row fails the run instead of the login page. It only ever deletes rows belonging to the accounts in `prisma/seed/fixtures.ts`.

### Styling

Tailwind CSS **v4**, configured CSS-first — there is no `tailwind.config.js` and there should not be one. `main.css` does `@import "tailwindcss"` then `@import "@nuxt/ui"`, and declares design tokens inside an `@theme static { ... }` block (font family, color ramps). Add or override tokens there; Tailwind generates utilities from them.

Prefer Nuxt UI components (`U*`) and Tailwind utility classes over hand-written CSS. Use Nuxt UI's semantic classes (`text-muted`, `outline-primary`, etc.) rather than hard-coded palette values so dark mode keeps working.

Icons come from Iconify collections installed as deps: `i-lucide-*` and `i-simple-icons-*`. Using an icon from another collection requires adding its `@iconify-json/*` package.

Carriers have no brand metadata in the Biteship response, so `shared/utils/courier.ts` supplies colors, initials, logos and vehicle icons keyed by courier code, rendered everywhere through `AppCourierLogo`. Logos live in `public/img/couriers/` (pulled from each carrier's own site); a carrier without one falls back to initials on its gradient, and `logoOnBrand` marks white logos that need the gradient behind them. Add new carriers there.

Every clickable surface carries `v-ripple` (light ink) or `v-ripple.dark`; pass `v-ripple="{ dark }"` when the surface flips between light and dark. Interactive elements get a base transition from `main.css`, so hover utilities never snap.

### Modules

`@nuxt/eslint`, `@nuxt/ui`, `@vueuse/nuxt` (VueUse composables auto-imported), `@vite-pwa/nuxt`, `@pinia/nuxt`, `nuxt-nodemailer` (server-only `useNodeMailer()` over Gmail SMTP; credentials come from `NUXT_NODEMAILER_*`, and only keys declared under `nodemailer` in `nuxt.config.ts` can be overridden from env).

### PWA and offline

Offline support is split between two caches that never overlap. The service worker (Workbox `generateSW`, `registerType: 'prompt'`) owns the shell, the courier logos and the two *unkeyed* GETs — `/api/shipments/*` (`NetworkFirst`) and `/api/destinations*` (`CacheFirst`). IndexedDB (`app/utils/offline-db.ts`) owns the five `useApi` keys and the mutation outbox, so the UI can state how old a cached screen is.

Two build-order facts are load-bearing. With `ssr: false` the shell is rendered per request and never written to disk, so `nitro.prerender.routes: ['/']` emits one; and because the service worker is generated *before* Nitro prerenders, `html` is kept out of `globPatterns` and `/` is precached through `additionalManifestEntries` instead — globbing it would pick up the previous build's `index.html` and collide. PWA head tags live in `app.head`, not `app.vue`, because a `useHead` call only runs after hydration and never reaches the prerendered document.

`app/plugins/offline.client.ts` seeds the payload from IndexedDB before the first page mounts, then drains the outbox on boot and on reconnect. Writes made offline are queued for alamat and profil only; anything touching an order (buat pesanan, bayar, batalkan) requires a live connection, because replaying a quote into Biteship would book a real shipment at a stale tariff. A 4xx on replay drops the entry, a 5xx retries up to five times.

Pull-to-refresh (`AppPullToRefresh`, mounted in `layouts/default.vue`) is declared per page via `definePageMeta({ refreshKeys })`; a page that declares none has no gesture. Pages fetching outside the keyed endpoints use `registerPageRefresh()` instead — `riwayat/[id]` does. `overscroll-behavior-y: contain` in `main.css` is what stops Android Chrome running its own pull-to-refresh alongside it.

The app is client-rendered (`ssr: false`): every route is user-scoped and there is nothing to index. `app/spa-loading-template.html` is the branded splash the server ships before hydration, and `<NuxtLoadingIndicator>` in `app.vue` covers route changes. `app/middleware/auth.global.ts` sends signed-out users to `/login`; the auth pages are listed in `isPublicRoute()`.

Secrets reach the server through `runtimeConfig`, so `NUXT_BITESHIP_API_KEY` maps to `biteship.apiKey`, and so on. See `.env.example`.

## Conventions

ESLint is `@nuxt/eslint` with stylistic rules enabled and two explicit overrides in `nuxt.config.ts`: **no trailing commas** (`commaDangle: 'never'`) and **1TBS brace style**. `.editorconfig`: 2-space indent, LF, final newline, trimmed trailing whitespace. Lint failures on style are usually one of these.

User-facing copy is Indonesian. Keep error messages from the API in Indonesian too — the UI surfaces `statusMessage` directly in toasts.
