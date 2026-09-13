import type { CourierBrand, CourierType, PartnerBadge } from '#shared/types'

/**
 * Courier codes RajaOngkir V2 accepts on /calculate/domestic-cost. Sending a
 * code outside this list makes the whole request fail with 422.
 */
export const SUPPORTED_COURIERS = [
  'jne', 'sicepat', 'jnt', 'anteraja', 'ninja', 'lion', 'pos', 'tiki',
  'ide', 'sap', 'ncs', 'rex', 'rpx', 'sentral', 'star', 'wahana', 'spx'
] as const

export type CourierCode = typeof SUPPORTED_COURIERS[number]

interface CourierMeta {
  label: string
  brand: CourierBrand
}

/**
 * Brand presentation per carrier. RajaOngkir returns no visual metadata, so
 * these are merged onto live rates to keep the design intact.
 *
 * `logo` points at `public/img/couriers/`; carriers without one fall back to
 * initials on the gradient. `logoOnBrand` marks white-on-transparent logos
 * that only read against the brand colour.
 */
const COURIER_META: Record<string, CourierMeta> = {
  jne: { label: 'JNE', brand: { from: '#1E3378', to: '#15255a', initials: 'JNE', logo: '/img/couriers/jne.svg' } },
  sicepat: { label: 'SiCepat Express', brand: { from: '#B52025', to: '#8f191d', initials: 'SICE', logo: '/img/couriers/sicepat.svg' } },
  jnt: { label: 'J&T Express', brand: { from: '#E31E24', to: '#b91c1c', initials: 'J&T', logo: '/img/couriers/jnt.png', logoOnBrand: true } },
  anteraja: { label: 'AnterAja', brand: { from: '#E5007E', to: '#b50064', initials: 'ANT', logo: '/img/couriers/anteraja.png' } },
  ninja: { label: 'Ninja Xpress', brand: { from: '#C8102E', to: '#9d0c24', initials: 'NIN', logo: '/img/couriers/ninja.png', logoOnBrand: true } },
  lion: { label: 'Lion Parcel', brand: { from: '#E30613', to: '#b3050f', initials: 'LION', logo: '/img/couriers/lion.svg' } },
  pos: { label: 'POS Indonesia', brand: { from: '#1B2A5B', to: '#131e42', initials: 'POS', logo: '/img/couriers/pos.png' } },
  tiki: { label: 'TIKI', brand: { from: '#0C3F9E', to: '#093078', initials: 'TIKI', logo: '/img/couriers/tiki.png' } },
  ide: { label: 'ID Express', brand: { from: '#EC1C24', to: '#c0161c', initials: 'IDE', logo: '/img/couriers/ide.svg' } },
  sap: { label: 'SAP Express', brand: { from: '#862880', to: '#651e60', initials: 'SAP', logo: '/img/couriers/sap.svg' } },
  ncs: { label: 'NCS', brand: { from: '#1B458F', to: '#143670', initials: 'NCS', logo: '/img/couriers/ncs.png' } },
  rex: { label: 'REX Express', brand: { from: '#E4002B', to: '#b60022', initials: 'REX' } },
  rpx: { label: 'RPX Logistics', brand: { from: '#002144', to: '#001a35', initials: 'RPX', logo: '/img/couriers/rpx.png' } },
  sentral: { label: 'Sentral Cargo', brand: { from: '#0A5C36', to: '#074428', initials: 'SCP' } },
  star: { label: 'Star Cargo', brand: { from: '#F7941D', to: '#c67617', initials: 'STAR' } },
  wahana: { label: 'Wahana', brand: { from: '#1C3F94', to: '#152f70', initials: 'WHN', logo: '/img/couriers/wahana.png' } },
  spx: { label: 'SPX Express', brand: { from: '#EE4D2D', to: '#c33e24', initials: 'SPX', logo: '/img/couriers/spx.svg' } }
}

const FALLBACK_BRAND: CourierBrand = { from: '#64748b', to: '#475569' }

export function courierBrand(code: string): CourierBrand {
  return COURIER_META[code.toLowerCase()]?.brand ?? {
    ...FALLBACK_BRAND,
    initials: code.slice(0, 4).toUpperCase()
  }
}

export function courierLabel(code: string, apiName: string): string {
  return COURIER_META[code.toLowerCase()]?.label ?? apiName
}

const TRUK = { label: 'Truk', icon: 'i-lucide-truck' }
const MOTOR = { label: 'Motor', icon: 'i-lucide-bike' }
const PESAWAT = { label: 'Pesawat', icon: 'i-lucide-plane' }

/**
 * RajaOngkir has no speed field, so the tier is read off the service code and
 * description (e.g. SiCepat "SDS" or JNE "YES").
 */
export function courierType(service: string, description: string): CourierType {
  const haystack = `${service} ${description}`.toLowerCase()
  if (/instant|inst|2 ?jam|3 ?jam/.test(haystack)) return 'instant'
  if (/same ?day|\bsds\b|\bsd\b|\byes\b|esok/.test(haystack)) return 'sameday'
  return 'regular'
}

export function courierVehicle(type: CourierType, service: string, description: string) {
  if (type === 'instant') return MOTOR
  const haystack = `${service} ${description}`.toLowerCase()
  if (/udara|air|pesawat|\byes\b|\bsps\b|express/.test(haystack)) return PESAWAT
  if (type === 'sameday') return MOTOR
  return TRUK
}

export function courierPickup(type: CourierType): string {
  return type === 'regular' ? 'Jemput besok' : 'Jemput hari ini'
}

/** Formats RajaOngkir's `etd` (e.g. "2-3 day", "", "1 day") for display. */
export function courierEta(etd: string | null | undefined, type: CourierType): string {
  const value = (etd ?? '').trim()
  if (!value) return type === 'instant' ? '< 3 jam' : 'Estimasi menyusul'
  if (/jam|hour/i.test(value)) return value.replace(/hours?/i, 'jam')
  const days = value.replace(/days?/i, '').trim()
  return days ? `${days} hari` : value
}

/** Carrier badges on the home screen, in display order. */
export const PARTNER_BADGES: PartnerBadge[] = [
  { label: 'JNE', courierCode: 'jne' },
  { label: 'J&T', courierCode: 'jnt' },
  { label: 'SiCepat', courierCode: 'sicepat' },
  { label: 'Tiki', courierCode: 'tiki' },
  { label: 'Pos', courierCode: 'pos' },
  { label: 'Anteraja', courierCode: 'anteraja' },
  { label: 'Lion', courierCode: 'lion' },
  { label: 'Ninja', courierCode: 'ninja' },
  { label: 'SPX', courierCode: 'spx' },
  { label: 'ID Express', courierCode: 'ide' }
]
