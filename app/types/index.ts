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
