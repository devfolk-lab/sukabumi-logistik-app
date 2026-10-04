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
 * One Biteship rate row. Only `id` and `brand` are ours; everything else is
 * Biteship's own value so what the customer sees is exactly what was quoted.
 */
export interface Courier {
  /** `${code}:${serviceCode}` — unique per rate row, not per carrier. */
  id: string
  code: string
  name: string
  /** Biteship's `courier_service_name`, e.g. "Reg Pack". */
  service: string
  /** Biteship's `courier_service_code`, e.g. "reg_pack" — what an order is booked with. */
  serviceCode: string
  description: string
  cost: number
  /** Biteship's `duration` verbatim (e.g. "2 - 3 days", or "" when not provided). */
  etd: string
  brand: CourierBrand
}

export interface PartnerBadge {
  label: string
  courierCode: string
}

/**
 * One Biteship area from `/v1/maps/areas`, key for key: a kecamatan with its
 * postal code, e.g. "IDNP9IDNC421IDND5206IDZ43351". Addresses and orders store
 * it verbatim, so what we keep is exactly what Biteship returned.
 *
 * Level 1 is the provinsi, level 2 the kota/kabupaten, level 3 the kecamatan.
 */
export interface Area {
  id: string
  /** "Cibadak, Sukabumi, Jawa Barat. 43351" */
  name: string
  country_name: string
  country_code: string
  administrative_division_level_1_name: string
  administrative_division_level_1_type: string
  administrative_division_level_2_name: string
  administrative_division_level_2_type: string
  administrative_division_level_3_name: string
  administrative_division_level_3_type: string
  postal_code: number
}

/**
 * One package line, with the same fields Biteship takes in `items` on rates
 * and orders. Weight is in grams, dimensions in centimetres, value in rupiah.
 * Optional text is `''` and an unknown dimension is `null`.
 */
export interface PackageItem {
  name: string
  description: string
  category: string
  sku: string
  value: number
  quantity: number
  weight: number
  length: number | null
  width: number | null
  height: number | null
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
  /** Best public reference: carrier AWB, else `orderNo`. */
  resi: string
  /** Biteship's order id, once an admin has approved the order and booked it. */
  biteshipOrderId: string | null
  /** When the payment was confirmed ("3 Okt 2026, 14:05"), or null while unpaid. */
  paidAt: string | null
  stage: OrderStage
  status: OrderStatus
  date: string
  pickup: string
  delivery: string
  origin: Area
  destination: Area
  sender: Party
  receiver: Party
  courier: string
  courierCode: string
  /** Biteship's `courier_service_name`, e.g. "Reg Pack". */
  service: string
  price: number
  weight: string
  weightGram: number
  /** Item names, for one-line summaries. */
  content: string
  items: PackageItem[]
  awb: string | null
}

export interface TimelineStep {
  title: string
  /**
   * Biteship status code (`picked`, `in_transit`, `delivered`…), lowercase.
   * Steps derived from our own order stage use `created` for the first one.
   * Picks the step's icon; null when unknown.
   */
  status: string | null
  /** The carrier's own note for this event, when it says more than the title. */
  note?: string
  location: string
  time: string
  done: boolean
  current?: boolean
}

/** One end of a shipment as the carrier knows it: who, and where. */
export interface ShipmentParty {
  nama: string
  alamat: string
}

export interface Shipment {
  resi: string
  /** Null for a waybill looked up straight from Biteship with no order here. */
  orderId: string | null
  /**
   * Where the shipment stands, as our lifecycle stage — the order's own, or
   * derived from the carrier's status for a waybill not booked here — so both
   * detail pages draw the same stepper.
   */
  stage: OrderStage
  /** The carrier's tracking page, when Biteship gives one. */
  link: string | null
  /** Sender and receiver as the carrier (or our order) has them. */
  origin: ShipmentParty
  destination: ShipmentParty
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
  /**
   * True when `timeline` is the carrier's own history from Biteship; false
   * when it is derived from our order stage because no history exists yet.
   */
  tracked: boolean
}

/** A waybill tracked on Lacak (not created in this app), as last looked up. */
export interface TrackedWaybill {
  id: string
  resi: string
  courierCode: string
  courier: string
  /** The carrier's status at the last lookup. */
  status: string
  stage: OrderStage
  origin: ShipmentParty
  destination: ShipmentParty
  /** "4 Okt 2026, 14:05" */
  lookedUpAt: string
}

export interface Address {
  id: string
  label: string
  main: boolean
  nama: string
  telp: string
  alamat: string
  /** Null for an address saved before it had a kecamatan; it cannot price a route. */
  area: Area | null
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

/**
 * What an account may do. `ADMIN` approves paid orders; `SUPERADMIN` can also
 * manage the staff. Mirrors the Prisma `Role` enum.
 */
export type Role = 'USER' | 'ADMIN' | 'SUPERADMIN'

/**
 * Who is signed in, as `/api/auth/session` reports it. The client keeps a copy
 * so a cold start offline still knows whose cached data it may show.
 */
export interface SessionUser {
  id: string
  email: string
  nama: string
  /** Only decides which menus show; the server checks it on every admin route. */
  role: Role
}

/** An order as the admin menu lists it: the customer's order plus who placed it. */
export interface AdminOrder extends Order {
  customer: { id: string, nama: string, email: string, telp: string | null }
  /** ISO timestamp, for sorting and "5 menit lalu". */
  createdAt: string
  /** When an admin approved it and who, or null while it waits. */
  approvedAt: string | null
  approvedBy: string | null
  /** Biteship's own status for the booked order, lowercase. */
  biteshipStatus: string | null
}

/** One account as the staff menu lists it. */
export interface StaffUser {
  id: string
  nama: string
  email: string
  telp: string | null
  role: Role
  /** False until the confirmation link was opened; such an account cannot sign in. */
  verified: boolean
  createdAt: string
}

export interface OrderStats {
  total: number
  proses: number
  selesai: number
  batal: number
}
