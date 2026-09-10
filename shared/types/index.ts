export type CourierType = 'regular' | 'instant' | 'sameday'

export interface CourierBrand {
  from: string
  to: string
  initials?: string
  icon?: string
}

/** A live RajaOngkir rate with local brand metadata merged in. */
export interface Courier {
  /** `${code}:${service}` — unique per rate row, not per carrier. */
  id: string
  code: string
  name: string
  service: string
  serviceName: string
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
  courierCode?: string
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
  orderNo: string
  resi: string
  stage: OrderStage
  status: OrderStatus
  date: string
  pickup: string
  delivery: string
  courier: string
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
  orderId: string
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
