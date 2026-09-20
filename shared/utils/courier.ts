import type { CourierBrand, PartnerBadge } from '#shared/types'

/**
 * Courier codes RajaOngkir V2 accepts on /calculate/domestic-cost. Sending a
 * code outside this list makes the whole request fail with 422.
 */
export const SUPPORTED_COURIERS = [
  'jne', 'sicepat', 'jnt', 'anteraja', 'ninja', 'lion', 'pos', 'tiki',
  'ide', 'sap', 'ncs', 'rex', 'rpx', 'sentral', 'star', 'wahana', 'spx'
] as const

export type CourierCode = typeof SUPPORTED_COURIERS[number]

/**
 * The carriers this business actually ships with. Rates, order re-pricing,
 * partner badges and waybill tracking are all restricted to these.
 */
export const ALLOWED_COURIERS = ['jne', 'lion'] as const satisfies readonly CourierCode[]

export type AllowedCourierCode = typeof ALLOWED_COURIERS[number]

export function isAllowedCourier(code: string): code is AllowedCourierCode {
  return (ALLOWED_COURIERS as readonly string[]).includes(code.toLowerCase())
}

/**
 * Which of a carrier's services this business actually sells. JNE quotes its
 * regular parcel services (REG, YES, OKE, CTC…) alongside trucking, but only
 * JNE Trucking is offered here — so everything that is not JTR is dropped from
 * quotes and refused at order time. The weight-banded variants RajaOngkir
 * returns (`JTR<150`, `JTR250`, `JTR>250`) are all trucking, hence the prefix
 * match rather than an exact one.
 *
 * A carrier absent from this map sells every service it quotes.
 */
const ALLOWED_SERVICES: Partial<Record<AllowedCourierCode, (service: string) => boolean>> = {
  jne: service => service.toUpperCase().startsWith('JTR')
}

export function isAllowedService(code: string, service: string): boolean {
  if (!isAllowedCourier(code)) return false
  const allows = ALLOWED_SERVICES[code.toLowerCase() as AllowedCourierCode]
  return allows ? allows(service) : true
}

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

/** Display name for a carrier code when there is no live RajaOngkir `name`. */
export function courierLabel(code: string, fallback = code.toUpperCase()): string {
  return COURIER_META[code.toLowerCase()]?.label ?? fallback
}

/** "2-3 day" → "2-3 hari"; an empty `etd` is said so rather than invented. */
export function formatEtd(etd: string | null | undefined): string {
  const value = (etd ?? '').trim()
  if (!value || value === '-') return 'Estimasi belum tersedia'
  if (/jam|hour/i.test(value)) return value.replace(/hours?/i, 'jam')
  return value.replace(/\s*days?/i, ' hari')
}

/** Carrier badges on the home screen, in display order. */
export const PARTNER_BADGES: PartnerBadge[] = [
  { label: 'JNE Trucking', courierCode: 'jne' },
  { label: 'Lion Parcel', courierCode: 'lion' }
]
