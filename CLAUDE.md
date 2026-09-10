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
pnpm db:studio    # prisma studio
```

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
- `app/composables/useApi.ts` — every server-state read. These wrap `useAsyncData` with fixed keys so components share one request, and they use `useRequestFetch()` rather than bare `$fetch`: during SSR a bare `$fetch` sends no cookies and every authenticated route answers 401.
- `app/stores/booking.ts` — the only Pinia store. It holds the kirim wizard draft, which spans three routes. Do not add stores for server state.

### Server

- `server/utils/prisma.ts` — the Prisma singleton. Supabase's Postgres certificate is signed by a private CA (pinned in `server/utils/supabase-ca.ts`), and node-postgres lets a connection-string `sslmode` override an explicit `ssl` object, so the URL's `sslmode` is stripped before the adapter sees it.
- `server/utils/auth.ts` — `requireProfile(event)` guards every user-scoped route. `serverSupabaseUser()` returns decoded JWT *claims*, not a `User`: the id is `sub`, and claims carry an index signature, so `.id` typechecks and is silently undefined.
- `server/utils/rajaongkir.ts` — RajaOngkir API V2. The product is called V2 but the path is `/api/v1`; there is no `/api/v2`. Errors arrive in the response envelope as well as in the status code.
- `server/utils/komship.ts` — the carrier handoff. Komship's carrier catalog and tariffs are **separate** from the RajaOngkir cost API's, so a quoted service must be re-resolved via `resolveKomshipService()` or the store call fails with "expedition not found".
- `server/utils/mappers.ts` — Prisma rows to the domain types in `shared/types`.

### Data

`prisma/schema.prisma` owns the `public` schema; Supabase Auth owns `auth`, and Prisma never touches it. `Profile.id` mirrors `auth.users.id` and is upserted on the first authenticated request. Datasource URLs live in `prisma.config.ts`, not in the schema (Prisma 7 removed `directUrl`); migrations run against the session pooler (5432) because the transaction pooler (6543) cannot hold Prisma Migrate's advisory locks.

### Styling

Tailwind CSS **v4**, configured CSS-first — there is no `tailwind.config.js` and there should not be one. `main.css` does `@import "tailwindcss"` then `@import "@nuxt/ui"`, and declares design tokens inside an `@theme static { ... }` block (font family, color ramps). Add or override tokens there; Tailwind generates utilities from them.

Prefer Nuxt UI components (`U*`) and Tailwind utility classes over hand-written CSS. Use Nuxt UI's semantic classes (`text-muted`, `outline-primary`, etc.) rather than hard-coded palette values so dark mode keeps working.

Icons come from Iconify collections installed as deps: `i-lucide-*` and `i-simple-icons-*`. Using an icon from another collection requires adding its `@iconify-json/*` package.

Carriers have no brand metadata in the RajaOngkir response, so `shared/utils/courier.ts` supplies colors, initials and vehicle icons keyed by courier code. Add new carriers there.

### Modules

`@nuxt/eslint`, `@nuxt/ui`, `@vueuse/nuxt` (VueUse composables auto-imported), `@vite-pwa/nuxt` (PWA; currently no `pwa` options block in `nuxt.config.ts`), `@pinia/nuxt`, `@nuxtjs/supabase`.

Every route is user-scoped, so nothing is prerendered — `routeRules` sets `ssr: true` throughout. `@nuxtjs/supabase` `redirectOptions` sends unauthenticated users to `/login`; the auth pages are in its `exclude` list.

Secrets reach the server through `runtimeConfig`, so `NUXT_RAJAONGKIR_SHIPPING_COST_API_KEY` maps to `rajaongkir.shippingCostApiKey`, and so on. See `.env.example`.

## Conventions

ESLint is `@nuxt/eslint` with stylistic rules enabled and two explicit overrides in `nuxt.config.ts`: **no trailing commas** (`commaDangle: 'never'`) and **1TBS brace style**. `.editorconfig`: 2-space indent, LF, final newline, trimmed trailing whitespace. Lint failures on style are usually one of these.

User-facing copy is Indonesian. Keep error messages from the API in Indonesian too — the UI surfaces `statusMessage` directly in toasts.
