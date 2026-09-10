import type { Address as DomainAddress, Order as DomainOrder, OrderStage, Shipment, TimelineStep } from '#shared/types'
import type { Address, Order, TrackingEvent } from '../generated/prisma/client'

/** Happy-path lifecycle, in order. `BATAL` is handled separately. */
const FLOW: { stage: OrderStage, title: string }[] = [
  { stage: 'MENUNGGU_PEMBAYARAN', title: 'Pesanan Dibuat' },
  { stage: 'DIPROSES', title: 'Pesanan Diproses' },
  { stage: 'DIJEMPUT', title: 'Paket Dijemput Kurir' },
  { stage: 'DALAM_PERJALANAN', title: 'Sedang Dalam Perjalanan' },
  { stage: 'SELESAI', title: 'Paket Diterima' }
]

export function toDomainAddress(a: Address): DomainAddress {
  return {
    id: a.id,
    label: a.label,
    main: a.isMain,
    nama: a.nama,
    telp: a.telp,
    alamat: a.alamat,
    destinationId: a.destinationId,
    destinationLabel: a.destinationLabel,
    zipCode: a.zipCode
  }
}

/**
 * "AnterAja ECO" rather than "AnterAja Anteraja Economy" — RajaOngkir's service
 * description often repeats the carrier name.
 */
function courierDisplay(o: Order): string {
  return `${o.courierName} ${o.serviceCode}`.trim()
}

export function toDomainOrder(o: Order): DomainOrder {
  return {
    id: o.id,
    orderNo: o.orderNo,
    resi: `#${o.orderNo}`,
    stage: o.status,
    status: stageToStatus(o.status),
    date: formatTanggal(o.createdAt),
    pickup: `${o.originCity}, ${o.originArea}`,
    delivery: `${o.destinationCity}, ${o.destinationArea}`,
    courier: courierDisplay(o),
    price: o.total,
    weight: formatBerat(o.weightGram),
    content: o.content,
    awb: o.awb
  }
}

/** Timeline derived from the persisted stage, used until an AWB exists. */
function stageTimeline(o: Order): TimelineStep[] {
  if (o.status === 'BATAL') {
    return [
      { title: 'Pesanan Dibuat', location: `${o.originCity}, ${o.originArea}`, time: formatWaktu(o.createdAt), done: true },
      { title: 'Pesanan Dibatalkan', location: `${o.originCity}, ${o.originArea}`, time: formatWaktu(o.updatedAt), done: true }
    ]
  }

  const current = FLOW.findIndex(f => f.stage === o.status)

  return FLOW.map((step, index) => ({
    title: step.title,
    location: index >= 3 ? `${o.destinationCity}, ${o.destinationArea}` : `${o.originCity}, ${o.originArea}`,
    time: index === 0
      ? formatWaktu(o.createdAt)
      : index < current ? formatWaktu(o.updatedAt) : index === current ? formatWaktu(o.updatedAt) : 'Menunggu',
    done: index < current || o.status === 'SELESAI',
    current: index === current && o.status !== 'SELESAI'
  }))
}

/** Timeline built from carrier manifest events cached in `tracking_events`. */
function eventTimeline(o: Order, events: TrackingEvent[]): TimelineStep[] {
  return events.map((e, index) => ({
    title: e.title,
    location: e.location ?? `${o.originCity}, ${o.originArea}`,
    time: formatWaktu(e.occurredAt),
    done: o.status === 'SELESAI' || index < events.length - 1,
    current: o.status !== 'SELESAI' && index === events.length - 1
  }))
}

function etaText(o: Order): string {
  if (o.status === 'SELESAI') return `Diterima ${formatWaktu(o.updatedAt)}`
  if (o.status === 'BATAL') return 'Pesanan dibatalkan'
  if (o.status === 'MENUNGGU_PEMBAYARAN') return 'Menunggu pembayaran'
  return o.etd ? `Estimasi tiba ${o.etd}` : 'Estimasi menyusul'
}

export function toShipment(o: Order & { trackingEvents?: TrackingEvent[] }): Shipment {
  const events = o.trackingEvents ?? []

  return {
    resi: o.awb ?? o.orderNo,
    orderId: o.id,
    courier: courierDisplay(o),
    price: o.total,
    weight: formatBerat(o.weightGram),
    content: o.content,
    pickup: { city: o.originCity, area: o.originArea },
    delivery: { city: o.destinationCity, area: o.destinationArea },
    status: stageLabel(o.status),
    eta: etaText(o),
    timeline: events.length ? eventTimeline(o, events) : stageTimeline(o)
  }
}

/** Splits a RajaOngkir subdistrict label into the city/area pair the UI shows. */
export function splitDestination(label: string): { city: string, area: string } {
  const parts = label.split(',').map(p => p.trim()).filter(Boolean)
  return {
    city: parts[2] ?? parts[1] ?? parts[0] ?? '-',
    area: parts[0] ?? '-'
  }
}

/** Sequential-ish, human-readable reference: SL-2026-8843. */
export function generateOrderNo(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(1000 + Math.random() * 9000)
  return `SL-${year}-${random}`
}
