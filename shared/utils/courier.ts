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
 */
const COURIER_META: Record<string, CourierMeta> = {
  jne: { label: 'JNE', brand: { from: '#D40511', to: '#a5040d', initials: 'JNE' } },
  sicepat: { label: 'SiCepat Express', brand: { from: '#4B0082', to: '#36005c', initials: 'SICE' } },
  jnt: { label: 'J&T Express', brand: { from: '#E31E24', to: '#b91c1c', initials: 'J&T' } },
  anteraja: { label: 'AnterAja', brand: { from: '#00A8E8', to: '#0086ba', initials: 'ANT' } },
  ninja: { label: 'Ninja Xpress', brand: { from: '#6B21A8', to: '#4c1579', initials: 'NIN' } },
  lion: { label: 'Lion Parcel', brand: { from: '#00A651', to: '#008542', icon: 'i-lucide-plane' } },
  pos: { label: 'POS Indonesia', brand: { from: '#F5A623', to: '#c4841a', initials: 'POS' } },
  tiki: { label: 'TIKI', brand: { from: '#0066CC', to: '#0052a3', initials: 'TIKI' } },
  ide: { label: 'ID Express', brand: { from: '#EC1C24', to: '#c0161c', initials: 'IDE' } },
  sap: { label: 'SAP Express', brand: { from: '#F58220', to: '#c4681a', initials: 'SAP' } },
  ncs: { label: 'NCS', brand: { from: '#1B458F', to: '#143670', initials: 'NCS' } },
  rex: { label: 'REX Express', brand: { from: '#E4002B', to: '#b60022', initials: 'REX' } },
  rpx: { label: 'RPX Logistics', brand: { from: '#002144', to: '#001a35', initials: 'RPX' } },
  sentral: { label: 'Sentral Cargo', brand: { from: '#0A5C36', to: '#074428', initials: 'SCP' } },
  star: { label: 'Star Cargo', brand: { from: '#F7941D', to: '#c67617', initials: 'STAR' } },
  wahana: { label: 'Wahana', brand: { from: '#F9A11B', to: '#c78015', initials: 'WHN' } },
  spx: { label: 'SPX Express', brand: { from: '#EE4D2D', to: '#c33e24', initials: 'SPX' } }
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

/** Carrier badges on the home screen. Not every partner is a bookable code. */
export const PARTNER_BADGES: PartnerBadge[] = [
  { label: 'JNE', initials: 'JNE', color: '#D40511', textClass: 'text-white', courierCode: 'jne' },
  { label: 'J&T', initials: 'J&T', color: '#E31E24', textClass: 'text-white', courierCode: 'jnt' },
  { label: 'SiCepat', initials: 'SICE', color: '#4B0082', textClass: 'text-white', courierCode: 'sicepat' },
  { label: 'Tiki', initials: 'TIKI', color: '#0066CC', textClass: 'text-white', courierCode: 'tiki' },
  { label: 'Pos', initials: 'POS', color: '#FDB913', textClass: 'text-primary', courierCode: 'pos' },
  { label: 'Anteraja', initials: 'ANT', color: '#00A8E8', textClass: 'text-white', courierCode: 'anteraja' },
  { label: 'Lion', icon: 'i-lucide-plane', color: '#00A651', textClass: 'text-white', courierCode: 'lion' },
  { label: 'Ninja', initials: 'NIN', color: '#6B21A8', textClass: 'text-white', courierCode: 'ninja' },
  { label: 'SPX', initials: 'SPX', color: '#EE4D2D', textClass: 'text-white', courierCode: 'spx' },
  { label: 'ID Express', initials: 'IDE', color: '#EC1C24', textClass: 'text-white', courierCode: 'ide' }
]
