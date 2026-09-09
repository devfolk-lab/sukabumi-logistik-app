# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **pnpm** (pinned via `packageManager: pnpm@12.3.4`).

```bash
pnpm install      # install deps (runs `nuxt prepare` via postinstall)
pnpm dev          # dev server on http://localhost:3000
pnpm build        # production build
pnpm preview      # preview the production build locally
pnpm lint         # eslint . — CI gate
pnpm typecheck    # nuxt typecheck (vue-tsc) — CI gate
```

`pnpm lint -- --fix` applies autofixes. There is no test runner configured; CI (`.github/workflows/ci.yml`, Node 22) runs only lint + typecheck, so both must pass before a change is done.

If `.nuxt/` is missing or stale, `pnpm postinstall` (i.e. `nuxt prepare`) regenerates it — ESLint and TypeScript both resolve their configs out of `.nuxt/`, so lint/typecheck will fail confusingly without it.

## Architecture

Nuxt 4 SPA/SSR app in `app/` (Nuxt 4 srcDir layout — no `src/`, no `nuxt.config` `srcDir` override).

- `app/app.vue` — root shell. Wraps everything in `<UApp>` with `UHeader` / `UMain` / `UFooter` from Nuxt UI; `<NuxtPage />` renders the routed page. Global `useHead` / `useSeoMeta` live here.
- `app/pages/` — file-based routing.
- `app/components/` — auto-imported by filename (no explicit imports needed).
- `app/app.config.ts` — Nuxt UI runtime theme (`ui.colors.primary` / `neutral`). Change semantic colors here, not in CSS.
- `app/assets/css/main.css` — the only global stylesheet, registered via `nuxt.config.ts` `css:`.

### Styling

Tailwind CSS **v4**, configured CSS-first — there is no `tailwind.config.js` and there should not be one. `main.css` does `@import "tailwindcss"` then `@import "@nuxt/ui"`, and declares design tokens inside an `@theme static { ... }` block (font family, color ramps). Add or override tokens there; Tailwind generates utilities from them.

Prefer Nuxt UI components (`U*`) and Tailwind utility classes over hand-written CSS. Use Nuxt UI's semantic classes (`text-muted`, `outline-primary`, etc.) rather than hard-coded palette values so dark mode keeps working.

Icons come from Iconify collections installed as deps: `i-lucide-*` and `i-simple-icons-*`. Using an icon from another collection requires adding its `@iconify-json/*` package.

### Modules

`@nuxt/eslint`, `@nuxt/ui`, `@vueuse/nuxt` (VueUse composables auto-imported), `@vite-pwa/nuxt` (PWA; currently no `pwa` options block in `nuxt.config.ts`).

`routeRules` prerenders `/`. Adding new statically-renderable routes means extending `routeRules`.

## Conventions

ESLint is `@nuxt/eslint` with stylistic rules enabled and two explicit overrides in `nuxt.config.ts`: **no trailing commas** (`commaDangle: 'never'`) and **1TBS brace style**. `.editorconfig`: 2-space indent, LF, final newline, trimmed trailing whitespace. Lint failures on style are usually one of these.
