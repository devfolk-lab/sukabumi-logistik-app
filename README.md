# Sukabumi Logistik

Sukabumi Logistik is a multi-ekspedisi shipping app: pengguna dapat mengirim
paket lewat beberapa mitra kurir, melacak status pengiriman, meninjau riwayat
pesanan, dan mengelola alamat tersimpan serta profil akun mereka.

This repository is a Nuxt 4 port of an HTML/CSS/JS prototype into a typed,
component-driven, store-backed application.

## Stack

- [Nuxt 4](https://nuxt.com) + Vue 3 (`<script setup>`, Composition API)
- [Nuxt UI](https://ui.nuxt.com) for form controls, badges, tabs and toasts
- [Pinia](https://pinia.vuejs.org) for in-memory domain stores (orders,
  shipments, addresses, couriers, auth, booking)
- [Tailwind CSS v4](https://tailwindcss.com) with a small custom theme
  (`app/assets/css/main.css`) for brand tokens, shadows and the ripple effect
- [Vitest](https://vitest.dev) for store unit tests
- TypeScript throughout, checked with `vue-tsc`

## Getting started

Install dependencies:

```bash
pnpm install
```

Run the dev server at `http://localhost:3000`:

```bash
pnpm dev
```

Build for production:

```bash
pnpm build
```

## Quality checks

```bash
pnpm lint       # eslint
pnpm typecheck  # nuxt typecheck (vue-tsc)
pnpm test       # vitest
```

## Project structure

- `app/pages/` — routes (auth flow, home, kirim wizard, lacak, riwayat,
  alamat, profil)
- `app/components/` — page-scoped components, grouped by feature directory
  (`kirim/`, `mitra/`, `riwayat/`, `lacak/`, `alamat/`, `home/`, `app/` for
  shell chrome)
- `app/stores/` — Pinia stores holding the app's in-memory dummy data
- `app/types/` — shared domain types (`Order`, `Shipment`, `Address`, ...)
- `app/composables/` — `useAppNav()` and other shared composables
- `app/plugins/` — the `v-ripple` directive plugin

## Reference material

- `docs/superpowers/specs/` — the design spec this port was built from
- `docs/superpowers/reference/mmbc-prototype.html` — the original static
  HTML/CSS/JS prototype (markup source of truth for every screen)
