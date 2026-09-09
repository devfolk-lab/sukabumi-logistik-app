# Sukabumi Logistik Nuxt Port — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the single-file `mmbc_redesigned_fixed.html` prototype into the existing Nuxt 4 starter as real routes, components and Pinia stores, replacing every hand-written CSS rule with Tailwind v4 utilities and theme tokens.

**Architecture:** 15 prototype `.page` divs become 15 file-based routes across two layouts (`auth`, `default`). The `goTo()`/`navHistory` page switcher is deleted in favour of the Nuxt router. All prototype global state (`selectedMitra`, `alamatData`, `riwayatData`, `shipmentData`, `pendingMitraName`) moves into six Pinia stores with inline seed data. Nuxt UI 4 supplies form controls, tabs and badges; bespoke pieces (mitra card, timelines, hero headers) are hand-built with Tailwind utilities.

**Tech Stack:** Nuxt 4.5, Nuxt UI 4.11, Tailwind CSS v4 (CSS-first, no config file), Pinia, Vitest, TypeScript, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-09-mmbc-nuxt-port-design.md`

**Source of truth for markup:** `docs/superpowers/reference/mmbc-prototype.html` (committed copy of the original). All line references below point into this file.

---

## Global Constraints

These apply to **every** task. Re-read them before starting any task.

- **Language:** all user-facing copy is Indonesian. Copy strings verbatim from the prototype. Do not translate, do not add i18n.
- **Icons:** every emoji in the prototype becomes a Lucide icon via `<UIcon name="i-lucide-..." />`. Courier brand marks keep their text initials (`J&T`, `JNE`, `SICE`, `ANT`, `NIN`, `RPX`); the three that used an emoji as their mark get an icon instead (GrabExpress → `i-lucide-bike`, Lion Parcel → `i-lucide-plane`, LalaMove → `i-lucide-truck`).
- **No new global CSS.** `app/assets/css/main.css` is written once in Task 1 and must not grow. Everything else is utility classes in components. If you think you need a new CSS rule, you are almost certainly missing a Tailwind utility.
- **Do not redefine `--color-primary-*` or `--color-secondary-*`.** `@nuxt/ui` owns those variables (verified in `.nuxt/ui.css`). The brand ramps are named `navy` and `gold`; `app.config.ts` maps them onto `primary`/`secondary`.
- **Class mapping** — apply these substitutions everywhere while porting markup:
  | Prototype | Replacement |
  |---|---|
  | `bg-primary-light` | `bg-primary-50` |
  | `bg-secondary-light` | `bg-secondary-50` |
  | `card-shadow` | `shadow-card lg:shadow-card-flat` |
  | `card-shadow-hover` | `lg:hover:shadow-card-hover` |
  | `gradient-primary` | `bg-linear-135 from-[#002144] via-[#003366] to-[#004080]` |
  | `class="page"` / `page active` | delete — the router owns this |
  | `class="ripple"` | `v-ripple` |
  | `class="ripple-dark"` | `v-ripple.dark` |
  | `onclick="goTo('x')"` | `@click="navigateTo('/x')"` or `<NuxtLink to="/x">` |
  | `.status-badge` | `<UBadge>` |
  | `.input-field` | `<UInput>` / `<UTextarea>` |
  | `.switch-toggle` | `<USwitch>` |
  | `.checkbox-custom` | `<UCheckbox>` |
  | `.tab-btn` | `<UTabs>` |
- **Money:** stored as integers (`28000`). Rendered only through `formatRupiah()`. Never store or compare pre-formatted `'Rp 28.000'` strings.
- **Stores use explicit imports** (`import { defineStore } from 'pinia'`, `import { ref, computed } from 'vue'`) rather than Nuxt auto-imports, so Vitest can load them without the Nuxt runtime.
- **Verification gate for every task:** `pnpm lint && pnpm typecheck && pnpm test` must all pass before committing.
- **ESLint style:** no trailing commas (`commaDangle: 'never'`), 1TBS braces, 2-space indent, LF endings.

---

## File Structure

```
app/
  app.vue                     rewritten — UApp + NuxtLayout/NuxtPage only
  app.config.ts               rewritten — navy/gold color mapping
  assets/css/main.css         rewritten — tokens + ~35 lines of CSS
  assets/img/                 logo-full.png, logo-mark.svg  (already placed)
  types/index.ts              Courier, PartnerBadge, Order, Shipment, Address, User
  utils/format.ts             formatRupiah, normalizeResi
  utils/ripple.ts             rippleGeometry (pure, tested)
  plugins/ripple.ts           v-ripple directive (universal — must register on the
                              server too, or SSR cannot resolve the directive)
  composables/useAppNav.ts    back-with-fallback
  stores/                     couriers, shipments, orders, addresses, booking, auth
  layouts/                    default.vue, auth.vue
  components/
    app/                      AppSidebar, AppBottomNav, AppLogo, AppPageHero,
                              AppPageContent, AppStickyBar
    home/                     HomeSearch, QuickActions, PartnerCarriers, ActiveShipmentCard
    mitra/                    MitraCard, MitraFilterTabs, MitraSummaryBar, RouteCard
    kirim/                    PartyDetailsSection, PackageForm, InstantToggle
    riwayat/                  RiwayatCard, OrderStepper, StatusBadge
    lacak/                    TrackingSearch, TrackingTimeline
    alamat/                   AddressCard, AddressForm
  pages/                      16 route files (see Task 11-19)
test/                         Vitest specs, one per store + utils
vitest.config.ts
```

---

### Task 1: Foundation — dependencies, theme, Vitest

**Files:**
- Modify: `package.json`, `nuxt.config.ts`, `app/app.config.ts`, `app/assets/css/main.css`, `.github/workflows/ci.yml`
- Create: `vitest.config.ts`, `app/utils/format.ts`, `test/format.test.ts`
- Delete: `app/components/TemplateMenu.vue`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `formatRupiah(n: number): string`, `normalizeResi(v: string): string` from `~/utils/format`; the `navy`/`gold` Tailwind palettes; `shadow-card`, `shadow-card-flat`, `shadow-card-hover`, `animate-page-in`, `route-dash`, `route-dash-light`, `hide-scrollbar` utilities.

- [ ] **Step 1: Install dependencies**

```bash
pnpm add pinia @pinia/nuxt
pnpm add -D vitest
```

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.ts`:

```ts
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts']
  },
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url))
    }
  }
})
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 3: Write the failing test**

Create `test/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { formatRupiah, normalizeResi } from '~/utils/format'

describe('formatRupiah', () => {
  it('formats with Indonesian thousand separators', () => {
    expect(formatRupiah(28000)).toBe('Rp 28.000')
  })

  it('formats zero', () => {
    expect(formatRupiah(0)).toBe('Rp 0')
  })

  it('formats values above one million', () => {
    expect(formatRupiah(1250000)).toBe('Rp 1.250.000')
  })
})

describe('normalizeResi', () => {
  it('uppercases and strips a leading hash', () => {
    expect(normalizeResi('#sl-2026-8843')).toBe('SL-2026-8843')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeResi('  SL-2026-8801  ')).toBe('SL-2026-8801')
  })

  it('returns an empty string for nullish input', () => {
    expect(normalizeResi('')).toBe('')
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm test`
Expected: FAIL — cannot resolve `~/utils/format`.

- [ ] **Step 5: Write the implementation**

Create `app/utils/format.ts`:

```ts
export function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`
}

export function normalizeResi(v: string): string {
  return String(v || '').trim().toUpperCase().replace(/^#/, '')
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm test`
Expected: PASS, 6 tests.

- [ ] **Step 7: Rewrite the stylesheet**

Replace `app/assets/css/main.css` entirely:

```css
@import "tailwindcss";
@import "@nuxt/ui";

@theme static {
  --font-sans: 'Plus Jakarta Sans', sans-serif;

  --color-navy-50: #e8f0f8;
  --color-navy-100: #d5e3f0;
  --color-navy-200: #adc7e0;
  --color-navy-300: #7ba3ca;
  --color-navy-400: #3f6f9f;
  --color-navy-500: #002144;
  --color-navy-600: #001d3d;
  --color-navy-700: #001832;
  --color-navy-800: #001328;
  --color-navy-900: #000f1f;
  --color-navy-950: #000913;

  --color-gold-50: #fdf6e3;
  --color-gold-100: #fbedc6;
  --color-gold-200: #f7dc8d;
  --color-gold-300: #f0c65a;
  --color-gold-400: #e3b038;
  --color-gold-500: #d4a124;
  --color-gold-600: #b3821c;
  --color-gold-700: #8d631a;
  --color-gold-800: #6f4e1b;
  --color-gold-900: #5c4019;
  --color-gold-950: #34220b;

  --shadow-card: 0 2px 12px rgb(0 33 68 / 0.06), 0 1px 4px rgb(0 33 68 / 0.04);
  --shadow-card-flat: 0 1px 2px rgb(0 33 68 / 0.05), 0 1px 4px rgb(0 33 68 / 0.04);
  --shadow-card-hover: 0 10px 28px rgb(0 33 68 / 0.12);

  --animate-page-in: page-in 0.3s ease;
}

@keyframes page-in {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@utility hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

@utility route-dash {
  background: repeating-linear-gradient(to bottom, #d1d5db 0, #d1d5db 6px, transparent 6px, transparent 12px);
}

@utility route-dash-light {
  background: repeating-linear-gradient(to bottom, rgb(255 255 255 / 0.3) 0, rgb(255 255 255 / 0.3) 5px, transparent 5px, transparent 10px);
}

html,
body {
  overflow-x: hidden;
  max-width: 100%;
}

* {
  -webkit-tap-highlight-color: transparent;
}

.ripple-circle {
  position: absolute;
  border-radius: 50%;
  transform: scale(0);
  opacity: 0;
  pointer-events: none;
  transition: transform 450ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-out;
}

.ripple-circle.grow {
  transform: scale(1);
  opacity: 1;
}

.ripple-circle.release {
  transition: transform 450ms cubic-bezier(0.4, 0, 0.2, 1), opacity 350ms ease-out;
  opacity: 0;
}
```

- [ ] **Step 8: Map the palettes onto Nuxt UI**

Replace `app/app.config.ts`:

```ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'navy',
      secondary: 'gold',
      neutral: 'slate'
    }
  }
})
```

- [ ] **Step 9: Register Pinia and pin light mode**

In `nuxt.config.ts`, add `'@pinia/nuxt'` to `modules`, and add:

```ts
  colorMode: {
    preference: 'light',
    fallback: 'light'
  },

  pinia: {
    storesDirs: ['./app/stores/**']
  },
```

- [ ] **Step 10: Delete the starter's template menu**

```bash
rm app/components/TemplateMenu.vue
```

(`app.vue` still references it; Task 10 rewrites `app.vue`. Until then `pnpm dev` will warn — that is expected and resolved in Task 10. `pnpm lint` and `pnpm typecheck` still pass.)

- [ ] **Step 11: Add the test step to CI**

In `.github/workflows/ci.yml`, after the `Typecheck` step:

```yaml
      - name: Test
        run: pnpm run test
```

- [ ] **Step 12: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: brand theme tokens, pinia, and vitest foundation"
```

---

### Task 2: Domain types

**Files:**
- Create: `app/types/index.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `CourierType`, `Courier`, `PartnerBadge`, `OrderStatus`, `Order`, `TimelineStep`, `Shipment`, `Address`, `Party`, `RoutePoint`, `User`. Every later task imports from `~/types`.

- [ ] **Step 1: Write the types**

Create `app/types/index.ts`:

```ts
export type CourierType = 'regular' | 'instant' | 'sameday'

export interface CourierBrand {
  from: string
  to: string
  initials?: string
  icon?: string
}

export interface Courier {
  id: string
  name: string
  type: CourierType
  price: number
  eta: string
  pickup: string
  insured: boolean
  vehicle: { label: string, icon: string }
  brand: CourierBrand
}

export interface PartnerBadge {
  label: string
  color: string
  initials?: string
  icon?: string
  textClass: string
  courierId?: string
}

export type OrderStatus = 'selesai' | 'proses' | 'batal'

export interface Order {
  id: number
  resi: string
  status: OrderStatus
  date: string
  pickup: string
  delivery: string
  courier: string
  price: number
  weight: string
  content: string
}

export interface TimelineStep {
  title: string
  location: string
  time: string
  done: boolean
  current?: boolean
}

export interface RoutePoint {
  city: string
  area: string
}

export interface Shipment {
  resi: string
  courier: string
  price: number
  weight: string
  content: string
  pickup: RoutePoint
  delivery: RoutePoint
  status: string
  eta: string
  timeline: TimelineStep[]
}

export interface Address {
  id: number
  label: string
  main: boolean
  nama: string
  telp: string
  alamat: string
}

export interface Party {
  nama: string
  telp: string
  alamat: string
}

export interface User {
  nama: string
  email: string
}
```

- [ ] **Step 2: Verify and commit**

```bash
pnpm lint && pnpm typecheck
git add app/types/index.ts
git commit -m "feat: add domain types"
```

---

### Task 3: Couriers store

**Files:**
- Create: `app/stores/couriers.ts`, `test/couriers.test.ts`

**Interfaces:**
- Consumes: `Courier`, `CourierType`, `PartnerBadge` from `~/types`
- Produces: `useCouriersStore()` with `list: Courier[]`, `partners: PartnerBadge[]`, `byType(type: CourierType | 'all'): Courier[]`, `byId(id: string): Courier | undefined`

- [ ] **Step 1: Write the failing test**

Create `test/couriers.test.ts`:

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCouriersStore } from '~/stores/couriers'

describe('couriers store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seeds nine couriers', () => {
    expect(useCouriersStore().list).toHaveLength(9)
  })

  it('seeds ten home partner badges', () => {
    expect(useCouriersStore().partners).toHaveLength(10)
  })

  it('returns every courier for the "all" filter', () => {
    const store = useCouriersStore()
    expect(store.byType('all')).toHaveLength(9)
  })

  it('filters by type', () => {
    const store = useCouriersStore()
    expect(store.byType('instant').map(c => c.name)).toEqual(['GrabExpress', 'LalaMove'])
    expect(store.byType('sameday').map(c => c.name)).toEqual(['AnterAja'])
    expect(store.byType('regular')).toHaveLength(6)
  })

  it('looks a courier up by id', () => {
    const store = useCouriersStore()
    expect(store.byId('jnt')?.price).toBe(28000)
    expect(store.byId('nope')).toBeUndefined()
  })

  it('stores prices as integers', () => {
    for (const c of useCouriersStore().list) {
      expect(typeof c.price).toBe('number')
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test test/couriers.test.ts`
Expected: FAIL — cannot resolve `~/stores/couriers`.

- [ ] **Step 3: Write the implementation**

Create `app/stores/couriers.ts`. Data transcribed from prototype lines 1519–1826 (mitra cards) and 906–1000 (home partner badges):

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Courier, CourierType, PartnerBadge } from '~/types'

const TRUK = { label: 'Truk', icon: 'i-lucide-truck' }
const MOTOR = { label: 'Motor', icon: 'i-lucide-bike' }
const MOBIL = { label: 'Mobil', icon: 'i-lucide-car' }
const PESAWAT = { label: 'Pesawat', icon: 'i-lucide-plane' }

const BESOK = 'Jemput besok'
const HARI_INI = 'Jemput hari ini'

export const useCouriersStore = defineStore('couriers', () => {
  const list = ref<Courier[]>([
    { id: 'jnt', name: 'J&T Express', type: 'regular', price: 28000, eta: '2-3 hari', pickup: BESOK, insured: true, vehicle: TRUK, brand: { from: '#E31E24', to: '#b91c1c', initials: 'J&T' } },
    { id: 'sicepat', name: 'SiCepat Express', type: 'regular', price: 26500, eta: '2-3 hari', pickup: BESOK, insured: false, vehicle: TRUK, brand: { from: '#4B0082', to: '#36005c', initials: 'SICE' } },
    { id: 'grab', name: 'GrabExpress', type: 'instant', price: 45000, eta: '< 2 jam', pickup: HARI_INI, insured: false, vehicle: MOTOR, brand: { from: '#00B14F', to: '#008f3f', icon: 'i-lucide-bike' } },
    { id: 'jne', name: 'JNE Reguler', type: 'regular', price: 30000, eta: '3-4 hari', pickup: BESOK, insured: false, vehicle: TRUK, brand: { from: '#D40511', to: '#a5040d', initials: 'JNE' } },
    { id: 'anteraja', name: 'AnterAja', type: 'sameday', price: 38000, eta: '1 hari', pickup: HARI_INI, insured: false, vehicle: MOTOR, brand: { from: '#00A8E8', to: '#0086ba', initials: 'ANT' } },
    { id: 'ninja', name: 'Ninja Xpress', type: 'regular', price: 27000, eta: '2-3 hari', pickup: BESOK, insured: false, vehicle: TRUK, brand: { from: '#6B21A8', to: '#4c1579', initials: 'NIN' } },
    { id: 'lion', name: 'Lion Parcel', type: 'regular', price: 29000, eta: '2-4 hari', pickup: BESOK, insured: false, vehicle: PESAWAT, brand: { from: '#00A651', to: '#008542', icon: 'i-lucide-plane' } },
    { id: 'lalamove', name: 'LalaMove', type: 'instant', price: 52000, eta: '< 3 jam', pickup: HARI_INI, insured: false, vehicle: MOBIL, brand: { from: '#FF6B00', to: '#cc5500', icon: 'i-lucide-truck' } },
    { id: 'rpx', name: 'RPX Logistics', type: 'regular', price: 31000, eta: '2-3 hari', pickup: BESOK, insured: false, vehicle: TRUK, brand: { from: '#002144', to: '#001a35', initials: 'RPX' } }
  ])

  const partners = ref<PartnerBadge[]>([
    { label: 'DHL', initials: 'DHL', color: '#D40511', textClass: 'text-white' },
    { label: 'JNE', initials: 'JNE', color: '#D40511', textClass: 'text-white', courierId: 'jne' },
    { label: 'Tiki', initials: 'TIKI', color: '#0066CC', textClass: 'text-white' },
    { label: 'J&T', initials: 'J&T', color: '#E31E24', textClass: 'text-white', courierId: 'jnt' },
    { label: 'Pos', initials: 'POS', color: '#FDB913', textClass: 'text-primary' },
    { label: 'SiCepat', initials: 'SICE', color: '#4B0082', textClass: 'text-white', courierId: 'sicepat' },
    { label: 'Lion', icon: 'i-lucide-plane', color: '#00A651', textClass: 'text-white', courierId: 'lion' },
    { label: 'Grab', initials: 'GRAB', color: '#00B14F', textClass: 'text-white', courierId: 'grab' },
    { label: 'Gojek', icon: 'i-lucide-bike', color: '#00AA13', textClass: 'text-white' },
    { label: 'Anteraja', initials: 'ANT', color: '#00A8E8', textClass: 'text-white', courierId: 'anteraja' }
  ])

  function byType(type: CourierType | 'all'): Courier[] {
    return type === 'all' ? list.value : list.value.filter(c => c.type === type)
  }

  function byId(id: string): Courier | undefined {
    return list.value.find(c => c.id === id)
  }

  return { list, partners, byType, byId }
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test test/couriers.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add app/stores/couriers.ts test/couriers.test.ts
git commit -m "feat: add couriers store"
```

---

### Task 4: Shipments store

**Files:**
- Create: `app/stores/shipments.ts`, `test/shipments.test.ts`

**Interfaces:**
- Consumes: `Shipment` from `~/types`, `normalizeResi` from `~/utils/format`
- Produces: `useShipmentsStore()` with `list: Shipment[]`, `findByResi(input: string): Shipment | undefined`, `active: Shipment[]`

- [ ] **Step 1: Write the failing test**

Create `test/shipments.test.ts`:

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useShipmentsStore } from '~/stores/shipments'

describe('shipments store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seeds four shipments', () => {
    expect(useShipmentsStore().list).toHaveLength(4)
  })

  it('finds a shipment by exact resi', () => {
    const store = useShipmentsStore()
    expect(store.findByResi('SL-2026-8843')?.courier).toBe('J&T Express')
  })

  it('finds a shipment despite a leading hash, lowercase and whitespace', () => {
    const store = useShipmentsStore()
    expect(store.findByResi('  #sl-2026-8801 ')?.courier).toBe('SiCepat Express')
  })

  it('returns undefined for an unknown resi', () => {
    expect(useShipmentsStore().findByResi('SL-0000-0000')).toBeUndefined()
  })

  it('exposes only in-progress shipments as active', () => {
    const store = useShipmentsStore()
    const resis = store.active.map(s => s.resi)
    expect(resis).not.toContain('SL-2026-8843')
    expect(resis).toContain('SL-2026-8801')
  })

  it('gives every shipment a timeline whose last step is delivery', () => {
    for (const s of useShipmentsStore().list) {
      expect(s.timeline.length).toBeGreaterThan(0)
      expect(s.timeline.at(-1)!.title).toMatch(/Diterima/)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test test/shipments.test.ts`
Expected: FAIL — cannot resolve `~/stores/shipments`.

- [ ] **Step 3: Write the implementation**

Create `app/stores/shipments.ts`. Data transcribed from prototype lines 2815–2870 (`shipmentData`). A shipment is "active" when its final timeline step is not `done`.

```ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Shipment } from '~/types'
import { normalizeResi } from '~/utils/format'

export const useShipmentsStore = defineStore('shipments', () => {
  const list = ref<Shipment[]>([
    {
      resi: 'SL-2026-8843',
      courier: 'J&T Express',
      price: 28000,
      weight: '2.5 kg',
      content: 'Skin Care, Pakaian',
      pickup: { city: 'Jakarta Selatan', area: 'Tebet' },
      delivery: { city: 'Surabaya', area: 'Wonokromo' },
      status: 'Paket Sudah Diterima',
      eta: 'Diterima 7 Sep 2026, 10:20',
      timeline: [
        { title: 'Pesanan Dibuat', location: 'Jakarta Selatan, Tebet', time: '5 Sep 2026, 09:15', done: true },
        { title: 'Paket Dijemput Kurir', location: 'Jakarta Selatan, Tebet', time: '5 Sep 2026, 11:40', done: true },
        { title: 'Tiba di Gudang Sortir', location: 'Jakarta Timur', time: '5 Sep 2026, 16:20', done: true },
        { title: 'Tiba di Kota Tujuan', location: 'Surabaya', time: '6 Sep 2026, 20:10', done: true },
        { title: 'Paket Diterima', location: 'Surabaya, Wonokromo', time: '7 Sep 2026, 10:20', done: true }
      ]
    },
    {
      resi: 'SL-2026-8801',
      courier: 'SiCepat Express',
      price: 26500,
      weight: '1.2 kg',
      content: 'Dokumen Penting',
      pickup: { city: 'Jakarta Selatan', area: 'Tebet' },
      delivery: { city: 'Bandung', area: 'Cibiru' },
      status: 'Sedang Dalam Perjalanan',
      eta: 'Estimasi tiba besok, sebelum 18:00',
      timeline: [
        { title: 'Pesanan Dibuat', location: 'Jakarta Selatan, Tebet', time: '3 Sep 2026, 08:05', done: true },
        { title: 'Paket Dijemput Kurir', location: 'Jakarta Selatan, Tebet', time: '3 Sep 2026, 10:30', done: true },
        { title: 'Tiba di Gudang Sortir', location: 'Jakarta Timur', time: '3 Sep 2026, 15:00', done: true },
        { title: 'Dalam Perjalanan ke Kota Tujuan', location: 'Menuju Bandung', time: '4 Sep 2026, 07:15', done: false, current: true },
        { title: 'Tiba di Kota Tujuan', location: 'Bandung', time: 'Menunggu', done: false },
        { title: 'Paket Diterima', location: 'Bandung, Cibiru', time: 'Menunggu', done: false }
      ]
    },
    {
      resi: 'SL-2026-9002',
      courier: 'DHL Express',
      price: 65000,
      weight: '3.0 kg',
      content: 'Peralatan Kantor',
      pickup: { city: 'Jakarta Selatan', area: 'Tebet' },
      delivery: { city: 'Surabaya', area: 'Gubeng' },
      status: 'Paket Sedang Diantar',
      eta: 'Estimasi tiba hari ini, sebelum 15:00',
      timeline: [
        { title: 'Pesanan Dibuat', location: 'Jakarta Selatan, Tebet', time: '6 Sep 2026, 09:00', done: true },
        { title: 'Paket Dijemput Kurir', location: 'Jakarta Selatan, Tebet', time: '6 Sep 2026, 11:10', done: true },
        { title: 'Tiba di Gudang Sortir', location: 'Jakarta Timur', time: '6 Sep 2026, 17:30', done: true },
        { title: 'Tiba di Kota Tujuan', location: 'Surabaya', time: '8 Sep 2026, 06:00', done: true },
        { title: 'Paket Sedang Diantar ke Alamat Tujuan', location: 'Surabaya, Gubeng', time: '9 Sep 2026, 08:45', done: false, current: true },
        { title: 'Paket Diterima', location: 'Surabaya, Gubeng', time: 'Menunggu', done: false }
      ]
    },
    {
      resi: 'SL-2026-9010',
      courier: 'Lion Parcel',
      price: 120000,
      weight: '0.8 kg',
      content: 'Dokumen Ekspor',
      pickup: { city: 'Denpasar', area: 'Bali' },
      delivery: { city: 'Singapura', area: 'Changi' },
      status: 'Baru Dijemput Kurir',
      eta: 'Estimasi tiba 2-3 hari kerja',
      timeline: [
        { title: 'Pesanan Dibuat', location: 'Denpasar, Bali', time: '9 Sep 2026, 07:30', done: true },
        { title: 'Paket Dijemput Kurir', location: 'Denpasar, Bali', time: '9 Sep 2026, 09:00', done: false, current: true },
        { title: 'Tiba di Gudang Sortir', location: 'Denpasar', time: 'Menunggu', done: false },
        { title: 'Proses Bea Cukai', location: 'Ekspor', time: 'Menunggu', done: false },
        { title: 'Tiba di Negara Tujuan', location: 'Singapura', time: 'Menunggu', done: false },
        { title: 'Paket Diterima', location: 'Singapura, Changi', time: 'Menunggu', done: false }
      ]
    }
  ])

  const active = computed(() => list.value.filter(s => !s.timeline.at(-1)?.done))

  function findByResi(input: string): Shipment | undefined {
    const key = normalizeResi(input)
    return list.value.find(s => s.resi === key)
  }

  return { list, active, findByResi }
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test test/shipments.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add app/stores/shipments.ts test/shipments.test.ts
git commit -m "feat: add shipments store with tracking dataset"
```

---

### Task 5: Orders store

**Files:**
- Create: `app/stores/orders.ts`, `test/orders.test.ts`

**Interfaces:**
- Consumes: `Order`, `OrderStatus` from `~/types`
- Produces: `useOrdersStore()` with `list: Order[]`, `byId(id: number): Order | undefined`, `byStatus(status: OrderStatus | 'all'): Order[]`, `stepsCompleted(status: OrderStatus): number`

- [ ] **Step 1: Write the failing test**

Create `test/orders.test.ts`:

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useOrdersStore } from '~/stores/orders'

describe('orders store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seeds four orders', () => {
    expect(useOrdersStore().list).toHaveLength(4)
  })

  it('returns everything for the "all" filter', () => {
    expect(useOrdersStore().byStatus('all')).toHaveLength(4)
  })

  it('filters by status', () => {
    const store = useOrdersStore()
    expect(store.byStatus('selesai')).toHaveLength(2)
    expect(store.byStatus('proses')).toHaveLength(1)
    expect(store.byStatus('batal')).toHaveLength(1)
  })

  it('looks an order up by id', () => {
    const store = useOrdersStore()
    expect(store.byId(1)?.resi).toBe('#SL-2026-8843')
    expect(store.byId(99)).toBeUndefined()
  })

  it('reports four completed steps for a finished order and two for one in progress', () => {
    const store = useOrdersStore()
    expect(store.stepsCompleted('selesai')).toBe(4)
    expect(store.stepsCompleted('proses')).toBe(2)
  })

  it('stores prices as integers', () => {
    for (const o of useOrdersStore().list) {
      expect(typeof o.price).toBe('number')
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test test/orders.test.ts`
Expected: FAIL — cannot resolve `~/stores/orders`.

- [ ] **Step 3: Write the implementation**

Create `app/stores/orders.ts`. Data transcribed from prototype lines 2712–2717 (`riwayatData`); `stepsCompleted` from lines 2775–2776.

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Order, OrderStatus } from '~/types'

export const useOrdersStore = defineStore('orders', () => {
  const list = ref<Order[]>([
    { id: 1, resi: '#SL-2026-8843', status: 'selesai', date: '5 Sep 2026', pickup: 'Jakarta Selatan, Tebet', delivery: 'Surabaya, Wonokromo', courier: 'J&T Express', price: 28000, weight: '2.5 kg', content: 'Skin Care, Pakaian' },
    { id: 2, resi: '#SL-2026-8801', status: 'proses', date: '3 Sep 2026', pickup: 'Jakarta Selatan, Tebet', delivery: 'Bandung, Cibiru', courier: 'SiCepat Express', price: 26500, weight: '1.2 kg', content: 'Dokumen Penting' },
    { id: 3, resi: '#SL-2026-8790', status: 'selesai', date: '28 Agu 2026', pickup: 'Jakarta Selatan, Tebet', delivery: 'Semarang, Pedurungan', courier: 'GrabExpress', price: 45000, weight: '0.8 kg', content: 'Aksesoris Fashion' },
    { id: 4, resi: '#SL-2026-8765', status: 'batal', date: '20 Agu 2026', pickup: 'Jakarta Selatan, Tebet', delivery: 'Denpasar, Bali', courier: 'JNE Reguler', price: 30000, weight: '3.0 kg', content: 'Peralatan Elektronik' }
  ])

  function byId(id: number): Order | undefined {
    return list.value.find(o => o.id === id)
  }

  function byStatus(status: OrderStatus | 'all'): Order[] {
    return status === 'all' ? list.value : list.value.filter(o => o.status === status)
  }

  function stepsCompleted(status: OrderStatus): number {
    return status === 'selesai' ? 4 : 2
  }

  return { list, byId, byStatus, stepsCompleted }
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test test/orders.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add app/stores/orders.ts test/orders.test.ts
git commit -m "feat: add orders store"
```

---

### Task 6: Addresses store

**Files:**
- Create: `app/stores/addresses.ts`, `test/addresses.test.ts`

**Interfaces:**
- Consumes: `Address` from `~/types`
- Produces: `useAddressesStore()` with `list: Address[]`, `add(input: Omit<Address, 'id' | 'main'>): Address`, `remove(id: number): void`, `setMain(id: number): void`

- [ ] **Step 1: Write the failing test**

Create `test/addresses.test.ts`:

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAddressesStore } from '~/stores/addresses'

describe('addresses store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seeds two addresses with Rumah as the main one', () => {
    const store = useAddressesStore()
    expect(store.list).toHaveLength(2)
    expect(store.list.filter(a => a.main)).toHaveLength(1)
    expect(store.list.find(a => a.main)?.label).toBe('Rumah')
  })

  it('appends a new address with a fresh id and main false', () => {
    const store = useAddressesStore()
    const created = store.add({ label: 'Gudang', nama: 'Budi', telp: '0811', alamat: 'Jl. Test 1' })
    expect(store.list).toHaveLength(3)
    expect(created.id).toBe(3)
    expect(created.main).toBe(false)
  })

  it('keeps ids unique after a removal', () => {
    const store = useAddressesStore()
    store.remove(2)
    const created = store.add({ label: 'Gudang', nama: 'Budi', telp: '0811', alamat: 'Jl. Test 1' })
    expect(store.list.map(a => a.id)).toEqual([1, created.id])
    expect(created.id).not.toBe(1)
  })

  it('removes an address by id', () => {
    const store = useAddressesStore()
    store.remove(1)
    expect(store.list.map(a => a.id)).toEqual([2])
  })

  it('promotes exactly one address to main', () => {
    const store = useAddressesStore()
    store.setMain(2)
    expect(store.list.find(a => a.id === 2)?.main).toBe(true)
    expect(store.list.filter(a => a.main)).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test test/addresses.test.ts`
Expected: FAIL — cannot resolve `~/stores/addresses`.

- [ ] **Step 3: Write the implementation**

Create `app/stores/addresses.ts`. Data transcribed from prototype lines 2915–2918.

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Address } from '~/types'

export const useAddressesStore = defineStore('addresses', () => {
  const list = ref<Address[]>([
    { id: 1, label: 'Rumah', main: true, nama: 'Fulan', telp: '0812-3456-7890', alamat: 'Jl. Tebet Barat Dalam No. 12, RT 04/RW 02, Tebet, Jakarta Selatan, 12810' },
    { id: 2, label: 'Kantor', main: false, nama: 'Fulan', telp: '0812-3456-7890', alamat: 'Jl. Sudirman Kav. 25, Lantai 8, Jakarta Pusat, 10220' }
  ])

  const nextId = ref(3)

  function add(input: Omit<Address, 'id' | 'main'>): Address {
    const created: Address = { ...input, id: nextId.value++, main: false }
    list.value.push(created)
    return created
  }

  function remove(id: number): void {
    list.value = list.value.filter(a => a.id !== id)
  }

  function setMain(id: number): void {
    for (const a of list.value) {
      a.main = a.id === id
    }
  }

  return { list, add, remove, setMain }
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test test/addresses.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add app/stores/addresses.ts test/addresses.test.ts
git commit -m "feat: add addresses store with CRUD"
```

---

### Task 7: Booking store

**Files:**
- Create: `app/stores/booking.ts`, `test/booking.test.ts`

**Interfaces:**
- Consumes: `Party`, `RoutePoint`, `Courier` from `~/types`; `useCouriersStore` from `~/stores/couriers`
- Produces: `useBookingStore()` with state `pickup`, `delivery`, `sender`, `receiver`, `weight`, `content`, `instant`, `insurance`, `selectedCourierId`; getters `selectedCourier`, `hasCourier`, `ongkir`, `asuransi`, `total`; actions `selectCourier(id)`, `swapRoute()`, `reset()`. Constant `INSURANCE_FEE = 2000`.

- [ ] **Step 1: Write the failing test**

Create `test/booking.test.ts`:

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { INSURANCE_FEE, useBookingStore } from '~/stores/booking'

describe('booking store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with no courier selected', () => {
    const store = useBookingStore()
    expect(store.selectedCourier).toBeUndefined()
    expect(store.hasCourier).toBe(false)
    expect(store.total).toBe(0)
  })

  it('resolves the selected courier and its price as ongkir', () => {
    const store = useBookingStore()
    store.selectCourier('jnt')
    expect(store.hasCourier).toBe(true)
    expect(store.selectedCourier?.name).toBe('J&T Express')
    expect(store.ongkir).toBe(28000)
  })

  it('adds the insurance fee to the total only when insurance is on', () => {
    const store = useBookingStore()
    store.selectCourier('jnt')
    expect(store.asuransi).toBe(0)
    expect(store.total).toBe(28000)

    store.insurance = true
    expect(store.asuransi).toBe(INSURANCE_FEE)
    expect(store.total).toBe(28000 + INSURANCE_FEE)
  })

  it('swaps the pickup and delivery route points', () => {
    const store = useBookingStore()
    store.pickup = { city: 'Jakarta Selatan', area: 'Tebet' }
    store.delivery = { city: 'Surabaya', area: 'Wonokromo' }

    store.swapRoute()

    expect(store.pickup).toEqual({ city: 'Surabaya', area: 'Wonokromo' })
    expect(store.delivery).toEqual({ city: 'Jakarta Selatan', area: 'Tebet' })
  })

  it('clears every field on reset', () => {
    const store = useBookingStore()
    store.selectCourier('grab')
    store.insurance = true
    store.content = 'Dokumen'
    store.sender.nama = 'Fulan'

    store.reset()

    expect(store.hasCourier).toBe(false)
    expect(store.insurance).toBe(false)
    expect(store.content).toBe('')
    expect(store.sender.nama).toBe('')
  })

  it('ignores an unknown courier id', () => {
    const store = useBookingStore()
    store.selectCourier('does-not-exist')
    expect(store.hasCourier).toBe(false)
    expect(store.ongkir).toBe(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test test/booking.test.ts`
Expected: FAIL — cannot resolve `~/stores/booking`.

- [ ] **Step 3: Write the implementation**

Create `app/stores/booking.ts`. Replaces the prototype's `selectedMitra`, `pendingMitraName`, `updateTotal()` (lines 2688–2711) and `swapRoute()` (lines 2632–2646).

```ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Party, RoutePoint } from '~/types'
import { useCouriersStore } from '~/stores/couriers'

export const INSURANCE_FEE = 2000

function emptyParty(): Party {
  return { nama: '', telp: '', alamat: '' }
}

export const useBookingStore = defineStore('booking', () => {
  const pickup = ref<RoutePoint>({ city: '', area: '' })
  const delivery = ref<RoutePoint>({ city: '', area: '' })
  const sender = ref<Party>(emptyParty())
  const receiver = ref<Party>(emptyParty())
  const weight = ref(1)
  const content = ref('')
  const instant = ref(false)
  const insurance = ref(false)
  const selectedCourierId = ref<string | null>(null)

  const selectedCourier = computed(() => {
    if (!selectedCourierId.value) return undefined
    return useCouriersStore().byId(selectedCourierId.value)
  })

  const hasCourier = computed(() => Boolean(selectedCourier.value))
  const ongkir = computed(() => selectedCourier.value?.price ?? 0)
  const asuransi = computed(() => (insurance.value ? INSURANCE_FEE : 0))
  const total = computed(() => ongkir.value + (hasCourier.value ? asuransi.value : 0))

  function selectCourier(id: string): void {
    selectedCourierId.value = useCouriersStore().byId(id) ? id : null
  }

  function swapRoute(): void {
    const previous = pickup.value
    pickup.value = delivery.value
    delivery.value = previous
  }

  function reset(): void {
    pickup.value = { city: '', area: '' }
    delivery.value = { city: '', area: '' }
    sender.value = emptyParty()
    receiver.value = emptyParty()
    weight.value = 1
    content.value = ''
    instant.value = false
    insurance.value = false
    selectedCourierId.value = null
  }

  return {
    pickup,
    delivery,
    sender,
    receiver,
    weight,
    content,
    instant,
    insurance,
    selectedCourierId,
    selectedCourier,
    hasCourier,
    ongkir,
    asuransi,
    total,
    selectCourier,
    swapRoute,
    reset
  }
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test test/booking.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add app/stores/booking.ts test/booking.test.ts
git commit -m "feat: add booking store for the kirim wizard"
```

---

### Task 8: Auth store

**Files:**
- Create: `app/stores/auth.ts`, `test/auth.test.ts`

**Interfaces:**
- Consumes: `User` from `~/types`
- Produces: `useAuthStore()` with `user: User | null`, `isAuthenticated`, `login(email: string)`, `register(nama: string, email: string)`, `logout()`

- [ ] **Step 1: Write the failing test**

Create `test/auth.test.ts`:

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from '~/stores/auth'

describe('auth store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts logged out', () => {
    const store = useAuthStore()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })

  it('logs in with the dummy profile name', () => {
    const store = useAuthStore()
    store.login('fulan@email.com')
    expect(store.isAuthenticated).toBe(true)
    expect(store.user).toEqual({ nama: 'Fulan', email: 'fulan@email.com' })
  })

  it('registers with the supplied name', () => {
    const store = useAuthStore()
    store.register('Budi', 'budi@email.com')
    expect(store.user?.nama).toBe('Budi')
  })

  it('falls back to the default name when registering without one', () => {
    const store = useAuthStore()
    store.register('  ', 'budi@email.com')
    expect(store.user?.nama).toBe('Fulan')
  })

  it('clears the user on logout', () => {
    const store = useAuthStore()
    store.login('fulan@email.com')
    store.logout()
    expect(store.user).toBeNull()
    expect(store.isAuthenticated).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test test/auth.test.ts`
Expected: FAIL — cannot resolve `~/stores/auth`.

- [ ] **Step 3: Write the implementation**

Create `app/stores/auth.ts`:

```ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { User } from '~/types'

const DEFAULT_NAME = 'Fulan'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)

  const isAuthenticated = computed(() => user.value !== null)

  function login(email: string): void {
    user.value = { nama: DEFAULT_NAME, email }
  }

  function register(nama: string, email: string): void {
    user.value = { nama: nama.trim() || DEFAULT_NAME, email }
  }

  function logout(): void {
    user.value = null
  }

  return { user, isAuthenticated, login, register, logout }
})
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test test/auth.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add app/stores/auth.ts test/auth.test.ts
git commit -m "feat: add auth store"
```

---

### Task 9: Ripple directive and navigation composable

**Files:**
- Create: `app/utils/ripple.ts`, `test/ripple.test.ts`, `app/plugins/ripple.ts`, `app/composables/useAppNav.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `rippleGeometry(rect, clientX, clientY): { size, left, top }` from `~/utils/ripple`; the `v-ripple` directive (with a `.dark` modifier); `useAppNav()` returning `{ back(fallback?: string): void }`

- [ ] **Step 1: Write the failing test**

Create `test/ripple.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { rippleGeometry } from '~/utils/ripple'

const rect = { left: 0, top: 0, width: 100, height: 100 }

describe('rippleGeometry', () => {
  it('covers the whole element when pressed dead centre', () => {
    const { size } = rippleGeometry(rect, 50, 50)
    expect(size).toBeCloseTo(Math.hypot(50, 50) * 2)
  })

  it('grows to reach the far corner when pressed at an edge', () => {
    const { size } = rippleGeometry(rect, 0, 0)
    expect(size).toBeCloseTo(Math.hypot(100, 100) * 2)
  })

  it('centres the circle on the press point', () => {
    const { size, left, top } = rippleGeometry(rect, 50, 50)
    expect(left).toBeCloseTo(50 - size / 2)
    expect(top).toBeCloseTo(50 - size / 2)
  })

  it('accounts for the element offset within the viewport', () => {
    const offset = { left: 20, top: 10, width: 100, height: 100 }
    const { left, top, size } = rippleGeometry(offset, 70, 60)
    expect(left).toBeCloseTo(50 - size / 2)
    expect(top).toBeCloseTo(50 - size / 2)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test test/ripple.test.ts`
Expected: FAIL — cannot resolve `~/utils/ripple`.

- [ ] **Step 3: Write the geometry helper**

Create `app/utils/ripple.ts`. Extracted from prototype lines 2510–2517 so the maths is testable without a DOM.

```ts
export interface RippleRect {
  left: number
  top: number
  width: number
  height: number
}

export interface RippleGeometry {
  size: number
  left: number
  top: number
}

export function rippleGeometry(rect: RippleRect, clientX: number, clientY: number): RippleGeometry {
  const x = clientX - rect.left
  const y = clientY - rect.top
  const dx = Math.max(x, rect.width - x)
  const dy = Math.max(y, rect.height - y)
  const size = Math.hypot(dx, dy) * 2

  return { size, left: x - size / 2, top: y - size / 2 }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm test test/ripple.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Write the directive**

Create `app/plugins/ripple.ts`. Behaviour ported from prototype lines 2505–2534: the circle grows and holds while pressed, and only fades on `pointerup` / `pointercancel` / `pointerleave`.

```ts
import { rippleGeometry } from '~/utils/ripple'

function spawn(el: HTMLElement, event: PointerEvent, dark: boolean): void {
  const { size, left, top } = rippleGeometry(el.getBoundingClientRect(), event.clientX, event.clientY)

  const circle = document.createElement('span')
  circle.className = 'ripple-circle'
  circle.style.width = `${size}px`
  circle.style.height = `${size}px`
  circle.style.left = `${left}px`
  circle.style.top = `${top}px`
  circle.style.background = dark ? 'rgba(0, 33, 68, 0.12)' : 'rgba(255, 255, 255, 0.45)'
  el.appendChild(circle)

  requestAnimationFrame(() => circle.classList.add('grow'))

  let released = false
  const release = () => {
    if (released) return
    released = true
    circle.classList.add('release')
    circle.addEventListener('transitionend', () => circle.remove(), { once: true })
    setTimeout(() => circle.remove(), 500)
    el.removeEventListener('pointerleave', release)
  }

  document.addEventListener('pointerup', release, { once: true })
  document.addEventListener('pointercancel', release, { once: true })
  el.addEventListener('pointerleave', release)
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('ripple', {
    mounted(el: HTMLElement, binding) {
      el.classList.add('relative', 'overflow-hidden')
      el.addEventListener('pointerdown', (event: PointerEvent) => {
        spawn(el, event, Boolean(binding.modifiers.dark))
      })
    }
  })
})
```

- [ ] **Step 6: Write the navigation composable**

Create `app/composables/useAppNav.ts`. Replaces the prototype's `navHistory` array and `goBack()` (lines 2586–2589).

```ts
export function useAppNav() {
  const router = useRouter()

  function back(fallback = '/'): void {
    if (window.history.length > 1) {
      router.back()
      return
    }
    navigateTo(fallback)
  }

  return { back }
}
```

- [ ] **Step 7: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add app/utils/ripple.ts test/ripple.test.ts app/plugins/ripple.ts app/composables/useAppNav.ts
git commit -m "feat: add ripple directive and navigation composable"
```

---

### Task 10: App shell — layouts and chrome components

**Files:**
- Rewrite: `app/app.vue`, `app/components/AppLogo.vue`
- Create: `app/layouts/default.vue`, `app/layouts/auth.vue`, `app/components/app/AppSidebar.vue`, `app/components/app/AppBottomNav.vue`, `app/components/app/AppPageHero.vue`, `app/components/app/AppPageContent.vue`, `app/components/app/AppStickyBar.vue`
- Create: `app/pages/index.vue` (placeholder, replaced in Task 12)
- Delete: existing `app/pages/index.vue` starter content

**Interfaces:**
- Consumes: `useAuthStore`, `v-ripple`
- Produces: `<AppPageHero>` (props: `title?: string`, slots `default`, `actions`), `<AppPageContent>` (wrapper, default slot), `<AppStickyBar>` (default slot), `<AppSidebar>`, `<AppBottomNav>`, `<AppLogo>` (props: `variant?: 'full' | 'mark'`)

Source: prototype lines 474–536 (sidebar), 1032–1047 (bottom nav), and the `#sidebar` / `#main-col` / `.page-header` / `.page-content` / `.sticky-bar` CSS at lines 279–380.

- [ ] **Step 1: Rewrite the root component**

Replace `app/app.vue`:

```vue
<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no' }
  ],
  link: [
    { rel: 'icon', type: 'image/png', href: '/favicon-96x96.png', sizes: '96x96' },
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
    { rel: 'shortcut icon', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' }
  ],
  htmlAttrs: {
    lang: 'id'
  }
})

const title = 'Sukabumi Logistik'
const description = 'Layanan multi-ekspedisi dan solusi pengiriman untuk individu, UMKM, dan bisnis di Sukabumi.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
```

- [ ] **Step 2: Write the logo component**

Replace `app/components/AppLogo.vue`:

```vue
<script setup lang="ts">
import logoFull from '~/assets/img/logo-full.png'

withDefaults(defineProps<{ variant?: 'full' | 'mark' }>(), { variant: 'full' })
</script>

<template>
  <img
    v-if="variant === 'full'"
    :src="logoFull"
    alt="Sukabumi Logistik"
    class="h-auto w-auto"
  >
  <span
    v-else
    class="flex items-center gap-3"
  >
    <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080]">
      <UIcon
        name="i-lucide-package"
        class="size-5 text-white"
      />
    </span>
    <span class="min-w-0">
      <span class="block truncate text-base font-extrabold leading-tight text-white">SUKABUMI</span>
      <span class="block truncate text-xs font-bold tracking-wide text-secondary">LOGISTIK</span>
    </span>
  </span>
</template>
```

- [ ] **Step 3: Write the sidebar**

Create `app/components/app/AppSidebar.vue`. Port prototype lines 478–536. The six nav entries and their icons:

| Label | Route | Icon |
|---|---|---|
| Beranda | `/` | `i-lucide-house` |
| Kirim Paket | `/kirim` | `i-lucide-package` |
| Lacak Pengiriman | `/lacak` | `i-lucide-map-pin` |
| Riwayat | `/riwayat` | `i-lucide-history` |
| Alamat Tersimpan | `/alamat` | `i-lucide-mailbox` |
| Profil | `/profil` | `i-lucide-user` |

The prototype's `sectionMap` (lines 2540–2546) decided which nav item was highlighted for sub-pages. Replace it with route-prefix matching: an item is active when the current path equals its route or starts with `${route}/`.

```vue
<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const items = [
  { label: 'Beranda', to: '/', icon: 'i-lucide-house' },
  { label: 'Kirim Paket', to: '/kirim', icon: 'i-lucide-package' },
  { label: 'Lacak Pengiriman', to: '/lacak', icon: 'i-lucide-map-pin' },
  { label: 'Riwayat', to: '/riwayat', icon: 'i-lucide-history' },
  { label: 'Alamat Tersimpan', to: '/alamat', icon: 'i-lucide-mailbox' },
  { label: 'Profil', to: '/profil', icon: 'i-lucide-user' }
]

const route = useRoute()
const auth = useAuthStore()

function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path === to || route.path.startsWith(`${to}/`)
}

async function logout() {
  auth.logout()
  await navigateTo('/login')
}
</script>

<template>
  <aside class="fixed inset-y-0 left-0 z-40 hidden w-68 flex-col border-r border-gray-100 bg-white px-4 py-6 lg:flex lg:px-6">
    <NuxtLink
      to="/"
      class="mb-8 block px-2"
    >
      <AppLogo class="h-9" />
    </NuxtLink>

    <nav class="hide-scrollbar flex-1 space-y-1 overflow-y-auto">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        v-ripple.dark
        :to="item.to"
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
        :class="isActive(item.to) ? 'bg-primary-50 text-primary' : 'text-gray-500'"
      >
        <span
          class="flex size-9 shrink-0 items-center justify-center rounded-lg"
          :class="isActive(item.to) ? 'bg-primary text-white' : 'bg-gray-100'"
        >
          <UIcon
            :name="item.icon"
            class="size-4.5"
          />
        </span>
        <span class="pointer-events-none">{{ item.label }}</span>
      </NuxtLink>
    </nav>

    <div class="mt-4 shrink-0 border-t border-gray-100 pt-4">
      <div class="mb-3 flex items-center gap-3 px-2">
        <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-50">
          <UIcon
            name="i-lucide-user"
            class="size-4 text-primary"
          />
        </span>
        <div class="min-w-0">
          <p class="truncate text-sm font-bold text-gray-800">{{ auth.user?.nama ?? 'Fulan' }}</p>
          <p class="truncate text-xs text-gray-400">{{ auth.user?.email ?? 'fulan@email.com' }}</p>
        </div>
      </div>
      <button
        v-ripple.dark
        type="button"
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-500"
        @click="logout"
      >
        <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50">
          <UIcon
            name="i-lucide-log-out"
            class="size-4"
          />
        </span>
        <span class="pointer-events-none">Keluar</span>
      </button>
    </div>
  </aside>
</template>
```

- [ ] **Step 4: Write the bottom nav**

Create `app/components/app/AppBottomNav.vue`. Port prototype lines 1032–1047 — three entries only (Beranda, Riwayat, Profil), hidden at `lg:`.

```vue
<script setup lang="ts">
const items = [
  { label: 'Beranda', to: '/', icon: 'i-lucide-house' },
  { label: 'Riwayat', to: '/riwayat', icon: 'i-lucide-history' },
  { label: 'Profil', to: '/profil', icon: 'i-lucide-user' }
]

const route = useRoute()

function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <nav class="fixed bottom-0 left-1/2 z-50 w-full max-w-full -translate-x-1/2 border-t border-gray-100 bg-white/90 px-4 py-3 pb-6 backdrop-blur-xl md:max-lg:max-w-105 lg:hidden">
    <div class="flex items-center justify-between">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex w-16 flex-col items-center gap-1"
        :class="isActive(item.to) ? 'text-primary' : 'text-gray-400'"
      >
        <span
          v-ripple="!isActive(item.to)"
          class="flex size-11 items-center justify-center rounded-2xl transition-all"
          :class="isActive(item.to) ? 'bg-primary text-white shadow-lg shadow-primary/25' : ''"
        >
          <UIcon
            :name="item.icon"
            class="pointer-events-none size-5"
          />
        </span>
        <span class="text-xs font-semibold">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
```

- [ ] **Step 5: Write the layout helper components**

Create `app/components/app/AppPageContent.vue` — replaces the `.page-content` CSS at prototype line 356:

```vue
<template>
  <div class="px-5 lg:mx-auto lg:max-w-4xl lg:px-12">
    <slot />
  </div>
</template>
```

Create `app/components/app/AppPageHero.vue` — replaces `.page-header` / `.header-inner` (lines 348–378). The decorative blobs are hidden at `lg:`, the rounded bottom flattens, and a `sticky` variant becomes static at `lg:`.

```vue
<script setup lang="ts">
withDefaults(defineProps<{ sticky?: boolean }>(), { sticky: false })
</script>

<template>
  <div
    class="relative overflow-hidden bg-linear-135 from-[#002144] via-[#003366] to-[#004080] px-6 pt-14 pb-10 lg:rounded-none lg:px-12 lg:pt-10 lg:pb-8"
    :class="[
      sticky ? 'sticky top-0 z-30 lg:static' : '',
      'rounded-b-[2rem]'
    ]"
  >
    <div class="absolute top-0 right-0 size-72 -translate-y-1/3 translate-x-1/4 rounded-full bg-white/5 lg:hidden" />
    <div class="absolute bottom-0 left-0 size-48 translate-y-1/3 -translate-x-1/4 rounded-full bg-secondary/10 lg:hidden" />
    <div class="relative z-10 lg:mx-auto lg:max-w-4xl">
      <slot />
    </div>
  </div>
</template>
```

Create `app/components/app/AppStickyBar.vue` — replaces `.sticky-bar` (lines 380–397). Fixed to the viewport bottom on mobile, an inline right-aligned row at `lg:`.

```vue
<template>
  <div class="fixed inset-x-0 bottom-0 z-50 border-t border-gray-100 bg-white/90 backdrop-blur-xl lg:static lg:border-0 lg:bg-transparent lg:backdrop-blur-none">
    <div class="px-5 py-3 lg:mx-auto lg:flex lg:max-w-4xl lg:items-center lg:justify-end lg:gap-5 lg:px-12 lg:pt-2 lg:pb-12">
      <slot />
    </div>
  </div>
</template>
```

- [ ] **Step 6: Write the two layouts**

Create `app/layouts/default.vue`:

```vue
<template>
  <div class="min-h-screen bg-[#f8f9fb]">
    <AppSidebar />
    <div class="w-full lg:ml-68 lg:w-[calc(100%-17rem)]">
      <div class="relative mx-auto min-h-screen w-full md:max-lg:max-w-105 md:max-lg:overflow-hidden md:max-lg:shadow-2xl">
        <div class="animate-page-in pb-28">
          <slot />
        </div>
      </div>
    </div>
    <AppBottomNav />
  </div>
</template>
```

Create `app/layouts/auth.vue` — replaces `.auth-shell` / `.auth-brand` / `.auth-form-wrap` (lines 399–405). The brand panel is `lg:` only.

```vue
<template>
  <div class="flex min-h-screen flex-col bg-[#f8f9fb] lg:flex-row">
    <div class="relative hidden flex-col justify-between overflow-hidden bg-linear-135 from-[#002144] via-[#003366] to-[#004080] p-10 lg:flex lg:basis-2/5 lg:p-14">
      <div class="absolute top-0 right-0 size-80 -translate-y-1/3 translate-x-1/4 rounded-full bg-white/5" />
      <div class="absolute bottom-0 left-0 size-56 translate-y-1/3 -translate-x-1/4 rounded-full bg-secondary/10" />
      <AppLogo
        variant="mark"
        class="relative z-10"
      />
      <div class="relative z-10">
        <p class="text-3xl font-extrabold leading-tight text-white">Semua kebutuhan pengiriman, dalam satu pintu.</p>
        <p class="mt-3 text-sm font-bold tracking-wide text-secondary">ANTAR LANGSUNG</p>
      </div>
    </div>
    <div class="flex flex-1 items-center justify-center px-6 py-8 lg:p-12">
      <div class="animate-page-in w-full max-w-md">
        <slot />
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 7: Add a temporary home page so the app boots**

Replace `app/pages/index.vue` with a stub (Task 12 writes the real one):

```vue
<template>
  <div class="p-8">
    <h1 class="text-2xl font-bold text-gray-800">Beranda</h1>
  </div>
</template>
```

- [ ] **Step 8: Verify the app boots**

Run: `pnpm dev`, open `http://localhost:3000`.
Expected: the sidebar renders at desktop widths with the logo and six nav items; the bottom nav renders below `lg`; no console errors. Stop the server.

- [ ] **Step 9: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add app shell layouts and chrome components"
```

---

### Task 11: Auth pages

**Files:**
- Create: `app/pages/login.vue`, `app/pages/register.vue`, `app/pages/lupa-password/index.vue`, `app/pages/lupa-password/terkirim.vue`, `app/pages/reset-password/index.vue`, `app/pages/reset-password/berhasil.vue`

**Interfaces:**
- Consumes: `useAuthStore`, the `auth` layout
- Produces: routes `/login`, `/register`, `/lupa-password`, `/lupa-password/terkirim`, `/reset-password`, `/reset-password/berhasil`

Every page in this task starts with `definePageMeta({ layout: 'auth' })`.

Sources: login 541–620, register 621–705, forgot-password 706–751, forgot-sent 752–791, reset-password 792–827, reset-success 828–848. The auth logic is at lines 2781–2814.

- [ ] **Step 1: Build the login page**

Create `app/pages/login.vue`. Port the form fields from prototype lines 560–615. Replace `.input-field` inputs with `UInput` inside `UFormField`, and the `togglePasswordVisibility` emoji button with `UInput`'s trailing slot toggling `type`.

```vue
<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'auth' })

const auth = useAuthStore()
const email = ref('')
const password = ref('')
const showPassword = ref(false)

async function submit() {
  auth.login(email.value.trim() || 'fulan@email.com')
  await navigateTo('/')
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-extrabold text-gray-800">Masuk ke akun kamu</h1>
    <p class="mt-1.5 text-sm text-gray-500">Kelola semua pengiriman dari satu tempat.</p>

    <form
      class="mt-8 space-y-4"
      @submit.prevent="submit"
    >
      <UFormField label="Email">
        <UInput
          v-model="email"
          type="email"
          size="xl"
          placeholder="nama@email.com"
          icon="i-lucide-mail"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Password">
        <UInput
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          size="xl"
          placeholder="Masukkan password"
          icon="i-lucide-lock"
          class="w-full"
        >
          <template #trailing>
            <UButton
              color="neutral"
              variant="link"
              :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
              @click="showPassword = !showPassword"
            />
          </template>
        </UInput>
      </UFormField>

      <div class="flex justify-end">
        <NuxtLink
          to="/lupa-password"
          class="text-sm font-semibold text-primary"
        >
          Lupa password?
        </NuxtLink>
      </div>

      <UButton
        type="submit"
        size="xl"
        block
        class="font-bold"
      >
        Masuk
      </UButton>
    </form>

    <p class="mt-6 text-center text-sm text-gray-500">
      Belum punya akun?
      <NuxtLink
        to="/register"
        class="font-bold text-primary"
      >Daftar sekarang</NuxtLink>
    </p>
  </div>
</template>
```

- [ ] **Step 2: Build the register page**

Create `app/pages/register.vue`, porting fields from prototype lines 640–700 (nama, email, telepon, password, checkbox for terms). On submit call `auth.register(nama, email)`, show `useToast().add({ title: 'Akun berhasil dibuat!', description: ... })` — replacing `alert()` at line 2789 — then `navigateTo('/')`. Use `UCheckbox` for the terms checkbox and `UButton type="submit" size="xl" block`.

- [ ] **Step 3: Build the forgot-password pages**

Create `app/pages/lupa-password/index.vue` (source 706–751): one email field and a "Kirim tautan" button that stores the email and navigates to `/lupa-password/terkirim`. Pass the email via `useState('resetEmail')` so the confirmation page can display it — this replaces the prototype's `document.getElementById('fp-sent-email').textContent` assignment at line 2795.

Create `app/pages/lupa-password/terkirim.vue` (source 752–791): a success panel reading the same `useState('resetEmail')`, falling back to the string `'email kamu'` exactly as the prototype did.

- [ ] **Step 4: Build the reset-password pages**

Create `app/pages/reset-password/index.vue` (source 792–827). Port the validation from prototype lines 2798–2804, but as `UFormField` error text instead of `alert()`:

```ts
const errors = computed(() => ({
  password: password.value.length > 0 && password.value.length < 8 ? 'Password minimal 8 karakter' : undefined,
  confirm: confirm.value.length > 0 && confirm.value !== password.value ? 'Konfirmasi password tidak cocok' : undefined
}))

const canSubmit = computed(() => password.value.length >= 8 && password.value === confirm.value)
```

Bind them with `<UFormField :error="errors.password">` and `:disabled="!canSubmit"` on the submit button. On submit navigate to `/reset-password/berhasil`.

Create `app/pages/reset-password/berhasil.vue` (source 828–848): a success panel with a button to `/login`.

- [ ] **Step 5: Verify in the browser**

Run: `pnpm dev` and walk `/login` → `/lupa-password` → `/lupa-password/terkirim`, and `/reset-password` (try a 5-character password and mismatched confirmation).
Expected: the brand panel shows only at `lg:` and above; validation messages appear inline; no `alert()` anywhere.

- [ ] **Step 6: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add auth pages"
```

---

### Task 12: Home page

**Files:**
- Rewrite: `app/pages/index.vue`
- Create: `app/components/home/HomeSearch.vue`, `app/components/home/QuickActions.vue`, `app/components/home/PartnerCarriers.vue`, `app/components/home/ActiveShipmentCard.vue`

**Interfaces:**
- Consumes: `useCouriersStore` (`partners`), `useShipmentsStore` (`active`), `useBookingStore` (`selectCourier`), `AppPageHero`, `AppPageContent`, `formatRupiah`
- Produces: route `/`; `<ActiveShipmentCard :shipment="Shipment" :progress="number" />`

Source: prototype lines 849–1048.

- [ ] **Step 1: Build the quick actions**

Create `app/components/home/QuickActions.vue`, porting lines 881–905. Three tiles: Kirim Paket (`i-lucide-package`, `bg-primary-50 text-primary` → `/kirim`), Lacak Pengiriman (`i-lucide-map-pin`, `bg-orange-50 text-orange-500` → `/lacak`), Alamat Tersimpan (`i-lucide-house`, `bg-purple-50 text-purple-500` → `/alamat`).

The `.qa-*` desktop reflow (prototype lines 439–456) becomes utilities: the panel loses its card styling at `lg:` (`lg:bg-transparent lg:p-0 lg:shadow-none`), the row becomes `lg:grid lg:grid-cols-3 lg:gap-4`, and each tile flips from a centred icon stack to a horizontal card (`lg:w-auto lg:flex-row lg:items-center lg:justify-start lg:gap-3.5 lg:rounded-2xl lg:bg-white lg:px-5 lg:py-4 lg:shadow-card-flat lg:hover:-translate-y-[3px] lg:hover:shadow-card-hover`).

- [ ] **Step 2: Build the partner carriers row**

Create `app/components/home/PartnerCarriers.vue`, porting lines 908–1000. Iterate `useCouriersStore().partners` in a `grid grid-cols-5 gap-x-2 gap-y-5 lg:grid-cols-10`. Each badge is a `size-12 rounded-full` swatch using `:style="{ backgroundColor: partner.color }"` with `v-ripple`, showing `partner.initials` or `<UIcon :name="partner.icon" />`.

Tapping a badge replaces `openKirimWithMitra()` (prototype lines 2552–2557): pre-select the courier in the booking store, then navigate.

```ts
const booking = useBookingStore()

async function open(partner: PartnerBadge) {
  if (partner.courierId) booking.selectCourier(partner.courierId)
  await navigateTo('/kirim')
}
```

- [ ] **Step 3: Build the active shipment card**

Create `app/components/home/ActiveShipmentCard.vue`, porting lines 1005–1027. Props `shipment: Shipment` and `progress: number`. Renders the route as `{{ shipment.pickup.city }} → {{ shipment.delivery.city }}`, the resi and courier, a status pill, and a progress bar (`<div class="h-full rounded-full bg-linear-to-r from-primary to-blue-500" :style="{ width: progress + '%' }" />`).

Derive `progress` from the timeline rather than hard-coding the prototype's `75%` / `30%`:

```ts
const progress = computed(() => {
  const steps = props.shipment.timeline
  const done = steps.filter(s => s.done).length
  return Math.round((done / steps.length) * 100)
})
```

- [ ] **Step 4: Build the search bar**

Create `app/components/home/HomeSearch.vue`, porting lines 872–879. A rounded white card with a `size-11 rounded-xl bg-primary-50` icon block (`i-lucide-search`) and a borderless input bound to a local ref; submitting navigates to `/lacak/${normalizeResi(value)}`.

- [ ] **Step 5: Assemble the page**

Rewrite `app/pages/index.vue` composing `AppPageHero` (greeting "Selamat Pagi," + user name + a notification button with the `3` badge, source lines 851–869), then `HomeSearch` in a `-mt-4 relative z-20` wrapper, `QuickActions`, `PartnerCarriers`, and the active-shipments section.

The `.grid-active-shipments` CSS (line 411) becomes `flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5` on the list wrapper.

- [ ] **Step 6: Verify in the browser**

Run: `pnpm dev` and open `/`.
Expected: at mobile width the quick actions are a centred icon row and shipments stack; at ≥1024px the quick actions become three horizontal tiles and shipments become two columns. Tapping the J&T partner badge lands on `/kirim` with J&T already selected in the store (check Vue devtools).

- [ ] **Step 7: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add home page"
```

---

### Task 13: Kirim step 1 — package form

**Files:**
- Create: `app/pages/kirim/index.vue`, `app/components/kirim/PartyDetailsSection.vue`, `app/components/kirim/PackageForm.vue`, `app/components/kirim/InstantToggle.vue`

**Interfaces:**
- Consumes: `useBookingStore`, `AppPageHero`, `AppPageContent`, `AppStickyBar`
- Produces: route `/kirim`; `<PartyDetailsSection v-model="party" title="..." />`

Source: prototype lines 1169–1386. The expand/collapse logic is `toggleDetails()` at lines 2598–2606; the address preview is `showAddressPreview()` at lines 2609–2616; the instant toggle is `toggleInstant()` at lines 2619–2627.

- [ ] **Step 1: Build the expandable party section**

Create `app/components/kirim/PartyDetailsSection.vue`. Props: `title: string`, `icon: string`, `modelValue: Party`. Emits `update:modelValue`.

The prototype toggled a `.hidden` class and rotated a chevron via `.expand-btn.rotated`. Replace both with a local `open` ref:

```vue
<button
  type="button"
  class="flex w-full items-center justify-between gap-2"
  @click="open = !open"
>
  <span class="font-bold text-gray-800">{{ title }}</span>
  <UIcon
    name="i-lucide-chevron-down"
    class="size-5 text-gray-400 transition-transform duration-200"
    :class="open ? 'rotate-180' : ''"
  />
</button>
<div v-show="open" class="mt-4 space-y-3">
  <!-- nama, telp, alamat fields bound with UInput / UTextarea -->
</div>
```

The address preview (a block revealed once the input exceeds 2 characters) becomes `v-show="modelValue.alamat.length > 2"`.

- [ ] **Step 2: Build the instant toggle**

Create `app/components/kirim/InstantToggle.vue`. A `USwitch` bound to `booking.instant`, with the extra detail block rendered under `v-show="booking.instant"` — replacing the `.hidden` class toggle at prototype line 2622.

- [ ] **Step 3: Build the package form**

Create `app/components/kirim/PackageForm.vue`, porting the weight / content / route fields from lines 1230–1360. Bind every field to the booking store (`booking.weight`, `booking.content`, `booking.pickup.city`, etc.). Use `UInput type="number"` for weight and `UTextarea` for content.

- [ ] **Step 4: Assemble the page**

Create `app/pages/kirim/index.vue`: `AppPageHero` with the title "Kirim Paket" and a back button calling `useAppNav().back('/')`, then the two `PartyDetailsSection`s (Detail Pengirim → `booking.sender`, Detail Penerima → `booking.receiver`), `PackageForm`, `InstantToggle`, and an `AppStickyBar` whose button navigates to `/kirim/kurir`.

- [ ] **Step 5: Verify in the browser**

Run: `pnpm dev`, open `/kirim`.
Expected: both detail sections expand and collapse with a rotating chevron; the address preview appears after typing 3 characters; the instant switch reveals its detail block; the continue button reaches `/kirim/kurir`.

- [ ] **Step 6: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add kirim step 1"
```

---

### Task 14: Kirim step 2 — courier selection

**Files:**
- Create: `app/pages/kirim/kurir.vue`, `app/components/mitra/MitraCard.vue`, `app/components/mitra/MitraFilterTabs.vue`, `app/components/mitra/MitraSummaryBar.vue`, `app/components/mitra/RouteCard.vue`

**Interfaces:**
- Consumes: `useCouriersStore`, `useBookingStore`, `formatRupiah`
- Produces: route `/kirim/kurir`; `<MitraCard :courier="Courier" :selected="boolean" @select="id => ..." />`

Source: prototype lines 1387–1856. Selection logic is `selectMitra()` at lines 2661–2686; filtering is `filterMitra()` at lines 2649–2659.

- [ ] **Step 1: Build the mitra card**

Create `app/components/mitra/MitraCard.vue`. Props `courier: Courier`, `selected: boolean`; emits `select`.

The prototype's `selectMitra()` mutated classes and button text on every card imperatively. Here it is all derived:

```vue
<template>
  <div
    v-ripple.dark
    class="cursor-pointer overflow-hidden rounded-3xl border-2 bg-white shadow-card transition-all duration-250 lg:shadow-card-flat lg:hover:-translate-y-0.5"
    :class="selected ? 'border-primary bg-[#f0f7ff] shadow-xl shadow-primary/12' : 'border-transparent'"
    @click="emit('select', courier.id)"
  >
    <!-- brand mark, name, type badge, meta chips: source lines 1521-1545 -->
    <div class="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3">
      <UBadge
        color="primary"
        variant="soft"
        :icon="courier.vehicle.icon"
      >
        {{ courier.vehicle.label }}
      </UBadge>
      <div class="flex shrink-0 items-center gap-3">
        <p class="text-xl font-extrabold leading-none text-primary">{{ formatRupiah(courier.price) }}</p>
        <UButton
          :color="selected ? 'success' : 'primary'"
          size="lg"
          class="font-bold"
        >
          {{ selected ? 'Terpilih' : 'Pilih' }}
        </UButton>
      </div>
    </div>
  </div>
</template>
```

The brand mark is `<span class="flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-md" :style="{ backgroundImage: \`linear-gradient(to bottom right, ${courier.brand.from}, ${courier.brand.to})\` }">` containing either `courier.brand.initials` or `<UIcon :name="courier.brand.icon" />`.

Type badge colors, from prototype lines 1528, 1596, 1664: `regular` → `color="info"`, `instant` → `color="warning"`, `sameday` → `color="info" variant="soft"` with sky styling. Labels: Reguler / Instan / Same Day.

- [ ] **Step 2: Build the filter tabs**

Create `app/components/mitra/MitraFilterTabs.vue` using `UTabs` with items `Semua` / `Reguler` / `Instan` / `Same Day` mapped to `'all' | 'regular' | 'instant' | 'sameday'`, emitting the selected value via `defineModel<CourierType | 'all'>()`.

- [ ] **Step 3: Build the route card**

Create `app/components/mitra/RouteCard.vue`, porting lines 1440–1490. Two marker rows joined by a `route-dash-light` connector that `flex-1`s between them, plus a swap button calling `booking.swapRoute()` with a 300 ms rotation:

```ts
const spinning = ref(false)

function swap() {
  booking.swapRoute()
  spinning.value = true
  setTimeout(() => (spinning.value = false), 300)
}
```

Bind `:class="spinning ? 'rotate-180' : ''"` plus `transition-transform duration-300`.

- [ ] **Step 4: Build the summary bar**

Create `app/components/mitra/MitraSummaryBar.vue` — shown only when `booking.hasCourier`, displaying the selected courier's name, `formatRupiah(booking.ongkir)` and `{{ typeLabel }} • {{ eta }}`. Replaces the `#mitra-summary` block at prototype lines 1836–1855.

- [ ] **Step 5: Assemble the page**

Create `app/pages/kirim/kurir.vue`. Guard the step, replacing the prototype's `alert('Silakan pilih kurir terlebih dahulu')`:

```ts
const booking = useBookingStore()

const filter = ref<CourierType | 'all'>('all')
const couriers = computed(() => useCouriersStore().byType(filter.value))
```

Layout: a sticky `AppPageHero` containing the `RouteCard`, then `MitraFilterTabs`, then the list wrapper (`flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5` — replacing `.grid-mitra-list`), then an `AppStickyBar` holding `MitraSummaryBar` and a continue button with `:disabled="!booking.hasCourier"` that navigates to `/kirim/detail`.

- [ ] **Step 6: Verify in the browser**

Run: `pnpm dev`, open `/kirim/kurir`.
Expected: the tabs filter the list (Instan shows exactly GrabExpress and LalaMove); selecting a card turns its border navy, its button green and reading "Terpilih", and deselects any other; the summary bar appears; the continue button is disabled until a selection is made; the swap button actually exchanges the two addresses.

- [ ] **Step 7: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add kirim step 2 courier selection"
```

---

### Task 15: Kirim step 3 — order detail

**Files:**
- Create: `app/pages/kirim/detail.vue`

**Interfaces:**
- Consumes: `useBookingStore`, `formatRupiah`, `AppPageHero`, `AppPageContent`, `AppStickyBar`
- Produces: route `/kirim/detail`

Source: prototype lines 1857–2028; the cost logic is `updateTotal()` at lines 2694–2701.

- [ ] **Step 1: Guard the route**

The prototype could only `alert()` when no courier was chosen. Redirect instead:

```ts
const booking = useBookingStore()

if (!booking.hasCourier) {
  await navigateTo('/kirim/kurir', { replace: true })
}
```

- [ ] **Step 2: Build the page**

Create `app/pages/kirim/detail.vue`, porting the recap sections from lines 1870–2000: the selected courier row, sender/receiver recap, package recap, and the cost breakdown.

The cost breakdown reads straight from the store — no DOM parsing:

```vue
<dl class="space-y-2.5">
  <div class="flex justify-between">
    <dt class="text-sm text-gray-500">Biaya Ongkir</dt>
    <dd class="text-sm font-bold text-gray-800">{{ formatRupiah(booking.ongkir) }}</dd>
  </div>
  <div class="flex justify-between">
    <dt class="text-sm text-gray-500">Asuransi</dt>
    <dd class="text-sm font-bold text-gray-800">{{ formatRupiah(booking.asuransi) }}</dd>
  </div>
  <USeparator />
  <div class="flex justify-between">
    <dt class="text-base font-bold text-gray-800">Total Pembayaran</dt>
    <dd class="text-xl font-extrabold text-primary">{{ formatRupiah(booking.total) }}</dd>
  </div>
</dl>
```

The insurance switch is `<USwitch v-model="booking.insurance" />` — the total recomputes reactively, replacing the manual `updateTotal()` call.

- [ ] **Step 3: Verify in the browser**

Run: `pnpm dev`, complete `/kirim` → `/kirim/kurir` (pick J&T) → `/kirim/detail`.
Expected: total reads `Rp 28.000`; toggling insurance changes it to `Rp 30.000` and the asuransi row to `Rp 2.000`. Navigating directly to `/kirim/detail` in a fresh session redirects to `/kirim/kurir`.

- [ ] **Step 4: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add kirim step 3 order detail"
```

---

### Task 16: Riwayat list and detail

**Files:**
- Create: `app/pages/riwayat/index.vue`, `app/pages/riwayat/[id].vue`, `app/components/riwayat/RiwayatCard.vue`, `app/components/riwayat/OrderStepper.vue`, `app/components/riwayat/StatusBadge.vue`

**Interfaces:**
- Consumes: `useOrdersStore`, `formatRupiah`
- Produces: routes `/riwayat`, `/riwayat/:id`; `<StatusBadge :status="OrderStatus" />`, `<OrderStepper :completed="number" />`

Source: prototype lines 2029–2263; logic at lines 2719–2778.

- [ ] **Step 1: Build the status badge**

Create `app/components/riwayat/StatusBadge.vue`. Props `status: OrderStatus`. Map to `UBadge`: `selesai` → `color="success"` "Selesai"; `proses` → `color="info"` "Diproses"; `batal` → `color="error"` "Dibatalkan".

- [ ] **Step 2: Build the order stepper**

Create `app/components/riwayat/OrderStepper.vue`. Props `completed: number`. Four horizontal steps (Dibuat, Dijemput, Dikirim, Diterima) joined by connectors. Replaces the imperative class toggling at prototype lines 2777–2782:

```vue
<div
  v-for="(step, i) in steps"
  :key="step"
  class="flex flex-1 flex-col items-center"
>
  <span
    class="flex size-8 items-center justify-center rounded-full text-[13px] font-bold transition-colors"
    :class="i < completed ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'"
  >{{ i + 1 }}</span>
</div>
```

Connector segments use `:class="i < completed - 1 ? 'bg-emerald-500' : 'bg-gray-200'"`.

- [ ] **Step 3: Build the riwayat card**

Create `app/components/riwayat/RiwayatCard.vue`. Props `order: Order`. Renders the resi, date, route, courier and `formatRupiah(order.price)` with a `StatusBadge`, wrapped in a `NuxtLink` to `/riwayat/${order.id}`.

- [ ] **Step 4: Build the list page**

Create `app/pages/riwayat/index.vue` with `UTabs` (Semua / Selesai / Diproses / Dibatalkan) driving `orders.byStatus(filter)`. The list wrapper replaces `.grid-riwayat-list`: `flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:gap-5`.

- [ ] **Step 5: Build the detail page**

Create `app/pages/riwayat/[id].vue`. Replace the prototype's silent `if (!order) return` (line 2765) with a real 404:

```ts
const route = useRoute()
const order = useOrdersStore().byId(Number(route.params.id))

if (!order) {
  throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan', fatal: true })
}
```

Render the recap fields, then either `<OrderStepper :completed="orders.stepsCompleted(order.status)" />` or — when `order.status === 'batal'` — the cancelled banner from prototype lines 2240–2255. This replaces the `classList.toggle('hidden')` pair at lines 2769–2774.

- [ ] **Step 6: Verify in the browser**

Run: `pnpm dev`, open `/riwayat`.
Expected: tabs filter correctly (Selesai shows 2); opening order 1 shows four completed steps; order 2 shows two; order 4 shows the cancelled banner and no stepper; `/riwayat/99` renders a 404.

- [ ] **Step 7: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add riwayat list and detail"
```

---

### Task 17: Lacak list and detail

**Files:**
- Create: `app/pages/lacak/index.vue`, `app/pages/lacak/[resi].vue`, `app/components/lacak/TrackingSearch.vue`, `app/components/lacak/TrackingTimeline.vue`

**Interfaces:**
- Consumes: `useShipmentsStore`, `formatRupiah`, `normalizeResi`
- Produces: routes `/lacak`, `/lacak/:resi`; `<TrackingTimeline :steps="TimelineStep[]" />`

Source: prototype lines 2264–2447; logic at lines 2878–2911.

- [ ] **Step 1: Build the tracking timeline**

Create `app/components/lacak/TrackingTimeline.vue`. Props `steps: TimelineStep[]`. This replaces `renderTimeline()` (prototype lines 2877–2895), which built rows by concatenating `innerHTML` strings.

```vue
<script setup lang="ts">
import type { TimelineStep } from '~/types'

defineProps<{ steps: TimelineStep[] }>()
</script>

<template>
  <div>
    <div
      v-for="(step, i) in steps"
      :key="i"
      class="flex gap-3"
    >
      <div class="flex flex-col items-center">
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          :class="step.done ? 'bg-emerald-500 text-white' : step.current ? 'bg-primary text-white ring-4 ring-primary/15' : 'bg-gray-200 text-gray-400'"
        >
          <UIcon
            v-if="step.done"
            name="i-lucide-check"
            class="size-4"
          />
          <UIcon
            v-else-if="step.current"
            name="i-lucide-circle-dot"
            class="size-4"
          />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <span
          v-if="i < steps.length - 1"
          class="my-1 min-h-6 w-0.5 flex-1"
          :class="step.done ? 'bg-emerald-500' : 'bg-gray-200'"
        />
      </div>
      <div
        class="min-w-0 flex-1"
        :class="i < steps.length - 1 ? 'pb-6' : ''"
      >
        <p
          class="text-sm font-bold"
          :class="step.current ? 'text-primary' : 'text-gray-800'"
        >{{ step.title }}</p>
        <p class="mt-0.5 text-sm text-gray-500">{{ step.location }}</p>
        <p class="mt-1 text-xs font-semibold text-gray-400">{{ step.time }}</p>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2: Build the search component**

Create `app/components/lacak/TrackingSearch.vue`, porting lines 2280–2310. An input plus button; on submit, look the resi up and either navigate to `/lacak/${normalizeResi(input)}` or show the inline error block (prototype's `#lacak-search-error`, line 2306):

```ts
const shipments = useShipmentsStore()
const input = ref('')
const notFound = ref(false)

async function search() {
  const found = shipments.findByResi(input.value)
  notFound.value = !found
  if (found) await navigateTo(`/lacak/${found.resi}`)
}
```

- [ ] **Step 3: Build the list page**

Create `app/pages/lacak/index.vue`: the hero, `TrackingSearch`, and a list of `shipments.active` linking to their detail routes. Port the "Pengiriman Aktif" section from lines 2320–2350.

- [ ] **Step 4: Build the detail page**

Create `app/pages/lacak/[resi].vue`:

```ts
const route = useRoute()
const shipment = useShipmentsStore().findByResi(String(route.params.resi))

if (!shipment) {
  throw createError({ statusCode: 404, statusMessage: 'Resi tidak ditemukan', fatal: true })
}
```

Render the status hero (`shipment.status`, `shipment.eta`), the route card, the package facts (weight, content, courier, `formatRupiah(shipment.price)`), and `<TrackingTimeline :steps="shipment.timeline" />`.

- [ ] **Step 5: Verify in the browser**

Run: `pnpm dev`, open `/lacak`.
Expected: searching `#sl-2026-8843` (lowercase, with hash) opens the detail page; searching `SL-0000-0000` shows the inline error and does not navigate; the timeline shows green ticks for completed steps and a navy ringed dot for the current one; `/lacak/nope` renders a 404.

- [ ] **Step 6: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add lacak search and tracking detail"
```

---

### Task 18: Alamat page

**Files:**
- Create: `app/pages/alamat.vue`, `app/components/alamat/AddressCard.vue`, `app/components/alamat/AddressForm.vue`

**Interfaces:**
- Consumes: `useAddressesStore`
- Produces: route `/alamat`; `<AddressCard :address="Address" @remove="id => ..." />`, `<AddressForm @submit="payload => ..." @cancel="..." />`

Source: prototype lines 2448–2495; logic at lines 2920–2977.

- [ ] **Step 1: Build the address card**

Create `app/components/alamat/AddressCard.vue`. Props `address: Address`; emits `remove`. Replaces `renderAlamat()` (lines 2923–2945), another `innerHTML` string builder. Shows the label badge, a "Utama" badge when `address.main`, an edit button and a delete button, then nama / telp / alamat.

The prototype's edit button was `alert('Fitur edit alamat akan segera hadir')`; use `useToast().add({ title: 'Fitur edit alamat akan segera hadir' })` instead.

- [ ] **Step 2: Build the address form**

Create `app/components/alamat/AddressForm.vue`. A `USelect` for label (Rumah / Kantor / Lainnya) and `UInput`/`UTextarea` for nama, telp and alamat.

Replace `alert('Lengkapi semua data alamat terlebih dahulu')` (line 2967) with a disabled submit button plus inline `UFormField` errors:

```ts
const canSubmit = computed(() =>
  form.nama.trim() !== '' && form.telp.trim() !== '' && form.alamat.trim() !== ''
)
```

- [ ] **Step 3: Build the page**

Create `app/pages/alamat.vue`. A list of `AddressCard`s (wrapper `flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5`, replacing `.grid-addresses`), plus an "Tambah Alamat" button that swaps itself for `AddressForm` — replacing `toggleAddAlamat()` (line 2954) with a single `showForm` ref. On submit call `addresses.add(payload)`, hide the form and reset it.

- [ ] **Step 4: Verify in the browser**

Run: `pnpm dev`, open `/alamat`.
Expected: two seeded addresses; the add button reveals the form; submitting with an empty field is blocked; a valid submit appends a card and hides the form; the delete button removes a card.

- [ ] **Step 5: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add saved addresses page"
```

---

### Task 19: Profil page

**Files:**
- Create: `app/pages/profil.vue`

**Interfaces:**
- Consumes: `useAuthStore`, `AppPageHero`, `AppPageContent`
- Produces: route `/profil`

Source: prototype lines 1049–1168.

- [ ] **Step 1: Build the page**

Create `app/pages/profil.vue`, porting the avatar header, the stats row and the menu list. Each menu row becomes a `NuxtLink` or button with `v-ripple.dark`, a Lucide icon in a tinted square, a label and `i-lucide-chevron-right`.

The "Keluar" row calls `auth.logout()` then `navigateTo('/login')`.

- [ ] **Step 2: Verify in the browser**

Run: `pnpm dev`, open `/profil`.
Expected: the profile renders the store's user (or the `Fulan` fallback); every menu row shows a ripple on press; "Keluar" returns to `/login` and the sidebar disappears.

- [ ] **Step 3: Verify and commit**

```bash
pnpm lint && pnpm typecheck && pnpm test
git add -A
git commit -m "feat: add profil page"
```

---

### Task 20: Cleanup and final verification

**Files:**
- Modify: `README.md`
- Verify: no leftover starter files, no orphaned CSS

- [ ] **Step 1: Confirm no prototype CSS class names survive**

Run:

```bash
grep -rnE "card-shadow-hover|gradient-primary|input-field|switch-toggle|checkbox-custom|status-badge|feature-chip|tab-btn|mitra-card|timeline-v-|step-dot|step-line|sidenav-item|nav-item|qa-btn|qa-icon|qa-panel|auth-shell|auth-brand|page-header|page-content|sticky-bar|grid-active-shipments|grid-riwayat-list|grid-mitra-list|grid-addresses|mobile-shell-width|partner-badge|route-pill|gold-accent|gold-bg|price-tag|expand-btn|filter-btn-active" app/
```

Expected: no matches. Any hit is a class that was supposed to become a utility or a component — fix it before continuing.

- [ ] **Step 2: Confirm no leftover prototype JS patterns**

Run:

```bash
grep -rnE "goTo\(|goBack\(|alert\(|innerHTML|getElementById|querySelectorAll" app/
```

Expected: no matches.

- [ ] **Step 3: Confirm the stylesheet stayed small**

Run: `wc -l app/assets/css/main.css`
Expected: under 100 lines (the prototype's was 470, of which ~35 lines of genuine CSS survive alongside the token block).

- [ ] **Step 4: Rewrite the README**

Replace the Nuxt starter boilerplate in `README.md` with a short project README: what the app is (Sukabumi Logistik — multi-ekspedisi shipping app), the stack, the `pnpm install` / `dev` / `build` / `lint` / `typecheck` / `test` commands, and a pointer to `docs/superpowers/specs/` and `docs/superpowers/reference/mmbc-prototype.html`.

- [ ] **Step 5: Full verification**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected: all four succeed.

- [ ] **Step 6: Walk every route once**

Run `pnpm dev` and visit all 16 routes at both 390px and 1440px widths. Confirm: no horizontal scrollbar at any width; the sidebar appears only at ≥1024px and never on auth routes; the bottom nav appears only below 1024px.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: clean up starter remnants and update README"
```

---

## Self-Review

**Spec coverage:**

| Spec section | Task |
|---|---|
| Routing table (16 routes, 2 layouts) | 10, 11, 12, 13, 14, 15, 16, 17, 18, 19 |
| `useAppNav()` replacing `goBack` | 9 |
| Six Pinia stores | 3, 4, 5, 6, 7, 8 |
| Integer prices + `formatRupiah` | 1, 3, 5 |
| Wizard guard fixing the `alert()` bug | 15 |
| Theme tokens, navy/gold palettes | 1 |
| Nuxt UI replacements for form controls | 11, 13, 14, 15, 18 |
| `shadow-card` / `gradient-primary` / `animate-page-in` | 1, plus applied throughout |
| Ripple directive | 9 |
| Component inventory (~25) | 10, 12, 13, 14, 16, 17, 18 |
| `TrackingTimeline` replacing `innerHTML` | 17 |
| `AddressCard` replacing `renderAlamat` | 18 |
| Domain types | 2 |
| Error-handling table (alerts → toasts / inline errors / 404s) | 11, 15, 16, 17, 18 |
| Vitest for store logic | 1, 3, 4, 5, 6, 7, 8, 9 |
| Brand assets + favicons | 10 (already placed on disk) |
| Light-mode pinning, `UColorModeButton` removal | 1, 10 |

No gaps.

**Type consistency:** `Courier.vehicle` is `{ label, icon }` in Task 2 and consumed that way in Tasks 3 and 14. `Courier.brand` is `{ from, to, initials?, icon? }` in Task 2, seeded that way in Task 3, consumed that way in Task 14. `stepsCompleted(status)` is defined in Task 5 and called with the same name in Task 16. `byType`/`byId`/`byStatus`/`findByResi`/`add`/`remove`/`setMain`/`selectCourier`/`swapRoute`/`reset` are consistent between their defining tasks and their call sites. `formatRupiah`/`normalizeResi` are defined in Task 1 and imported unchanged everywhere after.

**Placeholder scan:** every code step contains real code; every port step names an exact source line range in the committed prototype plus the specific transformation required.

## Known risk

Task 1 deletes `TemplateMenu.vue` while `app.vue` still imports it; `pnpm dev` warns until Task 10 rewrites `app.vue`. `lint`, `typecheck` and `test` all still pass in between, so the Task 1 gate holds. If tasks are executed out of order, do Task 10 immediately after Task 1.
