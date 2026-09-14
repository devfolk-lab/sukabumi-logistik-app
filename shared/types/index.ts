export interface CourierBrand {
  from: string
  to: string
  initials?: string
  icon?: string
  /** Public path of the carrier logo, when one is bundled. */
  logo?: string
  /** The logo is white-on-transparent and must sit on the brand gradient. */
  logoOnBrand?: boolean
}

/**
 * One RajaOngkir rate row, passed through as the API returns it. Only `id`
 * and `brand` are ours; everything else is RajaOngkir's own value so what the
 * customer sees is exactly what the carrier quoted.
 */
export interface Courier {
  /** `${code}:${service}` — unique per rate row, not per carrier. */
  id: string
  code: string
  name: string
  service: string
  description: string
  cost: number
  /** RajaOngkir's `etd` verbatim (e.g. "2-3 day", or "" when not provided). */
  etd: string
  brand: CourierBrand
}

export interface PartnerBadge {
  label: string
  courierCode: string
}

/** A RajaOngkir V2 subdistrict, the unit both origin and destination use. */
export interface Destination {
  id: number
  label: string
  province: string
  city: string
  district: string
  subdistrict: string
  zipCode: string
}

/** Persisted lifecycle stage, mirrors the Prisma `OrderStatus` enum. */
export type OrderStage
  = | 'MENUNGGU_PEMBAYARAN'
    | 'DIPROSES'
    | 'DIJEMPUT'
    | 'DALAM_PERJALANAN'
    | 'SELESAI'
    | 'BATAL'

/** The three buckets the riwayat tabs filter on. */
export type OrderStatus = 'selesai' | 'proses' | 'batal'

export interface RoutePoint {
  city: string
  area: string
}

export interface Order {
  id: string
  /** Internal reference (SL-2026-8843); shown only when nothing better exists. */
  orderNo: string
  /** Best public reference: carrier AWB, else Komship order number, else `orderNo`. */
  resi: string
  /** Komship's order number, once the shipment has been handed over. */
  komshipOrderNo: string | null
  stage: OrderStage
  status: OrderStatus
  date: string
  pickup: string
  delivery: string
  originLabel: string
  destinationLabel: string
  courier: string
  courierCode: string
  price: number
  weight: string
  content: string
  awb: string | null
}

export interface TimelineStep {
  title: string
  location: string
  time: string
  done: boolean
  current?: boolean
}

export interface Shipment {
  resi: string
  /** Null for a waybill looked up straight from RajaOngkir with no order here. */
  orderId: string | null
  courier: string
  courierCode: string
  price: number | null
  weight: string
  content: string
  pickup: RoutePoint
  delivery: RoutePoint
  status: string
  eta: string
  timeline: TimelineStep[]
}

export interface Address {
  id: string
  label: string
  main: boolean
  nama: string
  telp: string
  alamat: string
  destinationId: number | null
  destinationLabel: string | null
  zipCode: string | null
}

export interface Party {
  nama: string
  telp: string
  alamat: string
}

export interface User {
  nama: string
  email: string
  telp: string | null
}

export interface OrderStats {
  total: number
  proses: number
  selesai: number
  batal: number
}
