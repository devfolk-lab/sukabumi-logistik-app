# Sukabumi Logistik — HTML prototype → Nuxt 4 app

**Date:** 2026-09-09
**Status:** Approved
**Source:** `mmbc_redesigned_fixed.html` (2981 lines — 15 screens, ~470 lines hand-written CSS, ~480 lines vanilla JS)

## Goal

Port the single-file prototype into the existing Nuxt 4 / Nuxt UI 4 starter as real
pages, components and Pinia stores, replacing every hand-written CSS rule with
Tailwind v4 utilities and theme tokens. Behaviour and visual design stay as the
prototype defines them; the architecture becomes idiomatic Nuxt.

## Decisions

Confirmed with the user before writing this spec:

| Decision | Choice |
|---|---|
| Component strategy | Nuxt UI where it fits (buttons, inputs, switches, checkboxes, tabs, badges), hand-built for the bespoke pieces (mitra card, timelines, route connector, hero headers) |
| Icons | Lucide (`i-lucide-*`) replacing every emoji; courier brand badges keep text initials |
| Data layer | Pinia stores with inline seed data — no `server/api` |
| Color mode | Light only; `UColorModeButton` removed |

## Brand

The prototype predates the real brand assets. Both are now in the repo:

- `app/assets/img/logo-full.png` — horizontal lockup (navy `SUKABUMI` / gold `LOGISTIK` / `ANTAR LANGSUNG` ribbon), 1600×592 RGBA
- `app/assets/img/logo-mark.svg` — square isometric "S" cube mark
- `public/favicon.{ico,svg}`, `public/favicon-96x96.png`, `public/apple-touch-icon.png`, `public/web-app-manifest-{192,512}.png`

Usage: the full lockup on light surfaces (sidebar header, auth form column). On the
navy gradient auth panel, the mark plus HTML text — white `SUKABUMI`, gold
`LOGISTIK` — since no white raster variant exists. Tagline where one is needed:
**Antar Langsung** (it is part of the logo artwork itself; the brand knowledge base
lists other candidate taglines but marks them as not yet final).

The prototype's `#002144` / `#d4a124` are kept as the design tokens. The logo art
uses very slightly different values (`#0C1F46` / `#EBA31C`) and keeps them — it is
an image asset, not a token consumer.

**Known issue, not fixed here:** the supplied `web-app-manifest-*.png` icons place
the mark in the lower-right quadrant of a white square rather than centered, so they
are poor maskable icons. Regenerating them needs image tooling this project does not
have. Left as-is and reported.

## Architecture

### Routing

`goTo()` / `goBack()` / the `navHistory` array / the `sectionMap` lookup all disappear
into the router. The 15 `.page` divs become 15 route files:

| Route | Prototype id | Layout |
|---|---|---|
| `/login` | `page-login` | `auth` |
| `/register` | `page-register` | `auth` |
| `/lupa-password` | `page-forgot-password` | `auth` |
| `/lupa-password/terkirim` | `page-forgot-sent` | `auth` |
| `/reset-password` | `page-reset-password` | `auth` |
| `/reset-password/berhasil` | `page-reset-success` | `auth` |
| `/` | `page-home` | `default` |
| `/kirim` | `page-send` | `default` |
| `/kirim/kurir` | `page-mitra` | `default` |
| `/kirim/detail` | `page-detail` | `default` |
| `/riwayat` | `page-riwayat` | `default` |
| `/riwayat/[id]` | `page-riwayat-detail` | `default` |
| `/lacak` | `page-lacak` | `default` |
| `/lacak/[resi]` | `page-lacak-detail` | `default` |
| `/alamat` | `page-alamat` | `default` |
| `/profil` | `page-profil` | `default` |

The `app-root.auth-mode` class toggle is deleted outright: the layout *is* the mode.
`layouts/auth.vue` owns the split shell (gradient brand panel at `lg:` 40% + form
column); `layouts/default.vue` owns the fixed sidebar (`lg:`) and the bottom nav
(`lg:hidden`).

`goBack(fallback)` becomes a `useAppNav()` composable wrapping `router.back()` with a
fallback route, so a deep-linked page still has a working back button.

The existing `routeRules: { '/': { prerender: true } }` stays.

### Pinia stores

`pinia` + `@pinia/nuxt` are the only new dependencies.

- **`auth`** — dummy user (`Fulan`, `fulan@email.com`), `login()`, `register()`,
  `logout()`, `isAuthenticated`. No route guards: the prototype has none and this is
  a design port, not an auth implementation.
- **`couriers`** — the 9 mitra (J&T, SiCepat, GrabExpress, JNE, AnterAja, Ninja,
  Lion Parcel, LalaMove, RPX) with `type` / `price` / `eta`, plus the 10 home-screen
  partner badges with their brand colors. Getter `byType(type)` replaces
  `filterMitra()`'s `style.display` loop.
- **`booking`** — the whole Kirim wizard: sender/receiver/package fields, route
  addresses, `selectedCourier`, `instant` and `insurance` toggles, and computed
  `ongkir` / `asuransi` / `total`. Replaces `selectedMitra`, `pendingMitraName`,
  `updateTotal()` and `goToDetailOrder()`.
- **`orders`** — riwayat, 4 seeds, `byId(id)`, `byStatus(status)`.
- **`shipments`** — the tracking dataset (4 resi with full timelines),
  `findByResi(input)` carrying over the `#`-stripping / uppercase normalisation.
- **`addresses`** — alamat CRUD (`add`, `remove`, `setMain`), 2 seeds.

Prices are stored as **integers** (`28000`), not the pre-formatted `'Rp 28.000'`
strings the prototype used. `parseRupiah()` existed only to undo that formatting; a
`formatRupiah()` helper in `app/utils/` is all that survives.

**Wizard state:** the `booking` store is the single source of truth across all three
Kirim steps. `/kirim/kurir` and `/kirim/detail` get a page-level guard redirecting to
`/kirim` when the store is empty. This structurally fixes a prototype bug —
`goToDetailOrder()` could only `alert('Silakan pilih kurir terlebih dahulu')` because
step state lived in DOM text nodes.

### Tailwind v4 — how ~470 CSS lines become ~35

Roughly 80% of the stylesheet is the responsive app shell: `#sidebar`, `#main-col`,
`.page-header`, `.header-inner`, `.page-content`, `.sticky-bar`, the `.grid-*`
list→grid conversions, the `.qa-*` quick-action reflow, and the desktop flattening
rules. All of it exists only because a single HTML file had no component boundaries.
It becomes ordinary responsive utilities inside `layouts/` and the components.

Deleted entirely, replaced by Nuxt UI components:

| Prototype CSS | Replacement |
|---|---|
| `.switch-toggle` (`appearance:none` + `::after` knob) | `USwitch` |
| `.checkbox-custom` (`appearance:none` + rotated `::after` tick) | `UCheckbox` |
| `.input-field` | `UInput` / `UTextarea` / `UFormField` |
| `.tab-btn` / `.tab-btn.active` | `UTabs` |
| `.status-badge`, `.feature-chip` | `UBadge` |

Expressed as `@theme` tokens rather than CSS rules.

**Verified against the installed `@nuxt/ui@4.11.0`, not assumed.** `.nuxt/ui.css`
shows that the module already owns both `--color-primary-*` and bare
`--color-primary`:

```css
/* generated by @nuxt/ui — do not redefine these */
--color-primary-500: var(--ui-color-primary-500);
--color-primary:     var(--ui-primary);
```

`--ui-color-primary-*` and `--ui-primary` are emitted at build time from the palette
named in `app.config.ts`, and `--ui-primary` resolves to shade **500** in light mode.
Declaring `--color-primary-500` ourselves in `@theme static` would override the alias
and desync the module's own variables. So the brand ramps get their **own names** and
`app.config.ts` points Nuxt UI at them:

```css
@import "tailwindcss";
@import "@nuxt/ui";

@theme static {
  --font-sans: 'Plus Jakarta Sans', sans-serif;

  /* brand navy — 500 is the brand value, so `primary` resolves to it in light mode */
  --color-navy-50:  #e8f0f8;   /* was --color-primary-light */
  --color-navy-100: #d5e3f0;
  --color-navy-200: #adc7e0;
  --color-navy-300: #7ba3ca;
  --color-navy-400: #3f6f9f;
  --color-navy-500: #002144;   /* brand */
  --color-navy-600: #001d3d;
  --color-navy-700: #001832;
  --color-navy-800: #001328;
  --color-navy-900: #000f1f;
  --color-navy-950: #000913;

  /* brand gold */
  --color-gold-50:  #fdf6e3;   /* was --color-secondary-light */
  --color-gold-100: #fbedc6;
  --color-gold-200: #f7dc8d;
  --color-gold-300: #f0c65a;
  --color-gold-400: #e3b038;
  --color-gold-500: #d4a124;   /* brand */
  --color-gold-600: #b3821c;
  --color-gold-700: #8d631a;
  --color-gold-800: #6f4e1b;
  --color-gold-900: #5c4019;
  --color-gold-950: #34220b;

  --shadow-card:       0 2px 12px rgb(0 33 68 / .06), 0 1px 4px rgb(0 33 68 / .04);
  --shadow-card-flat:  0 1px 2px  rgb(0 33 68 / .05), 0 1px 4px rgb(0 33 68 / .04);
  --shadow-card-hover: 0 10px 28px rgb(0 33 68 / .12);

  --animate-page-in: page-in .3s ease;
}
```

```ts
// app/app.config.ts
export default defineAppConfig({
  ui: { colors: { primary: 'navy', secondary: 'gold', neutral: 'slate' } }
})
```

With that indirection in place the prototype's existing classes keep working
verbatim — `text-primary` and `bg-primary` resolve to `#002144`, `text-secondary` and
`bg-secondary/10` to `#d4a124` — while `bg-primary-light` / `bg-secondary-light`
become `bg-primary-50` / `bg-secondary-50`. Nuxt UI component props (`color="primary"`)
stay in sync because they read the same generated variables.

Then:

- `.card-shadow` → `shadow-card lg:shadow-card-flat`
- `.card-shadow-hover` / the `[onclick].card-shadow:hover` desktop rule →
  `lg:hover:shadow-card-hover lg:hover:-translate-y-[3px] transition`
- `.gradient-primary` → `bg-linear-135 from-[#002144] via-[#003366] to-[#004080]`
- `.page` + `@keyframes fadeIn` → `animate-page-in` on the page root
- `.mitra-card.selected`, `.filter-btn-active`, `.nav-item.active`,
  `.sidenav-item.active`, `.timeline-v-item.done/.current`, `.timeline-step.completed`
  → all conditional Vue `:class` bindings, since they were only ever state toggles
- `.price-tag`, `.gold-accent`, `.gold-bg`, `.route-pill`, `.fab`, `.partner-badge`,
  `.expand-btn`, `.auth-shell`, `.auth-brand`, `.auth-form-wrap`, `.step-dot`,
  `.step-line`, `.timeline-v-dot`, `.timeline-v-line` → plain utilities in components

Surviving hand-written CSS in `app/assets/css/main.css`, ~35 lines total:

1. Ripple base styles (`.ripple-circle` and its `.grow` / `.release` transitions) —
   genuinely not expressible as utilities; the directive positions each circle inline.
2. `@utility route-dash` / `@utility route-dash-light` — the dashed
   `repeating-linear-gradient` route connectors.
3. `@utility hide-scrollbar` — needs `::-webkit-scrollbar`.
4. `@keyframes page-in`.
5. `* { -webkit-tap-highlight-color: transparent }` and the `html,body { overflow-x: hidden }`
   safety net.

Plus Jakarta Sans is resolved by `@nuxt/fonts` (bundled inside Nuxt UI) from the
`--font-sans` token — no Google Fonts `<link>`. The Font Awesome CDN link is dropped;
nothing used it.

### The ripple

The Google-Meet-style press ripple is real interaction, not decoration: the circle
grows and *holds* while pressed, and only fades on release. It survives as a
`v-ripple` directive registered in `app/plugins/ripple.client.ts`, with a `.dark`
modifier (`v-ripple.dark`) for the light-background variant. This replaces the
document-level `pointerdown` delegation, which only existed because the prototype had
no component lifecycle to hook.

### Components

~25 components under `app/components/`, auto-imported by directory prefix:

- **`app/`** — `AppSidebar`, `AppBottomNav`, `AppLogo` (replaces the starter's),
  `AppPageHero` (gradient header with blobs, flattens at `lg:`), `AppPageContent`
  (the `max-w-4xl` / `lg:px-12` wrapper), `AppStickyBar` (fixed bottom bar on mobile,
  inline right-aligned row at `lg:`)
- **`home/`** — `HomeSearch`, `QuickActions`, `PartnerCarriers`, `ActiveShipmentCard`
- **`mitra/`** — `MitraCard`, `MitraFilterTabs`, `MitraSummaryBar`, `RouteCard`
  (with the working `swapRoute()` behaviour, now a store mutation instead of swapping
  `textContent` between four DOM nodes)
- **`kirim/`** — `PartyDetailsSection` (the expandable Detail Pengirim / Penerima),
  `PackageForm`, `InstantToggle`
- **`riwayat/`** — `RiwayatCard`, `OrderStepper` (horizontal 4-step), `StatusBadge`
- **`lacak/`** — `TrackingSearch`, `TrackingTimeline` (vertical)
- **`alamat/`** — `AddressCard`, `AddressForm`

`TrackingTimeline` replaces `renderTimeline()`, which built rows by concatenating
`innerHTML` template strings — an XSS vector the moment that data comes from a
server. Same for `renderAlamat()`, replaced by `AddressCard` in a `v-for`.

Shared types in `app/types/index.ts`: `Courier`, `PartnerBadge`, `Shipment`,
`TimelineStep`, `Order`, `OrderStatus`, `Address`, `User`.

## Error handling

The prototype used `alert()` for all four of its failure paths. Replacements:

| Prototype | Replacement |
|---|---|
| `alert('Silakan pilih kurir terlebih dahulu')` | Route guard — `/kirim/detail` is unreachable without a courier; the continue button is `:disabled` until one is picked |
| `alert('Password minimal 8 karakter')` / `alert('Konfirmasi password tidak cocok')` | `UFormField` error text under the field |
| `alert('Lengkapi semua data alamat terlebih dahulu')` | `UFormField` error text |
| `alert('Akun berhasil dibuat!...')`, `alert('Fitur edit alamat akan segera hadir')` | `useToast()` |
| `#lacak-search-error` hidden/shown | Same inline error block, driven by store state |

`/riwayat/[id]` and `/lacak/[resi]` throw a 404 via `createError` when the id or resi
is not in the store, instead of silently returning like `showRiwayatDetail()` did.

## Testing

The repo has no test runner; CI runs `pnpm lint` and `pnpm typecheck` only.

Adding **Vitest** with unit tests for the store logic that is genuinely testable:

- `formatRupiah` output for the Indonesian locale
- resi normalisation (`#sl-2026-8843` → `SL-2026-8843`) and lookup miss
- `booking` total with and without the Rp 2.000 insurance
- `orders.byStatus` and `couriers.byType` filters
- `addresses` add / remove / setMain

Component-level testing infrastructure is deliberately **not** added — it is scope the
user did not ask for on a design port. Visual verification is `pnpm dev` plus
`pnpm lint && pnpm typecheck`, both of which must pass.

## Out of scope

Stated explicitly so it is not silently added:

- Real authentication, API calls, or route guards beyond the wizard-step guard
- Form validation beyond what the prototype performed
- i18n — the app stays Indonesian, strings inline
- PWA configuration (`@vite-pwa/nuxt` is installed but unconfigured; it stays that way,
  though the icon set is now present should it be wired up later)
- Regenerating the badly-cropped maskable icons
- Dark mode
