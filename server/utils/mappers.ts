import type { Address as DomainAddress, Order as DomainOrder, OrderStage, Shipment, TimelineStep } from '#shared/types'
import type { Address, Order, TrackingEvent } from '../generated/prisma/client'
import type { RawWaybill } from './rajaongkir'

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
 * "Lion Parcel REGPACK" — carrier name plus RajaOngkir's service code, which
 * is what the carrier's own tracking page calls it.
 */
function courierDisplay(o: Order): string {
  return `${o.courierName} ${o.serviceCode}`.trim()
}

/**
 * The reference a customer can use outside this app: the carrier's AWB once
 * assigned, otherwise Komship's order number. Our internal `orderNo` is the
 * last resort and only exists before the handoff.
 */
export function publicReference(o: Pick<Order, 'awb' | 'komshipOrderNo' | 'orderNo'>): string {
  return o.awb || o.komshipOrderNo || o.orderNo
}

export function toDomainOrder(o: Order): DomainOrder {
  return {
    id: o.id,
    orderNo: o.orderNo,
    resi: publicReference(o),
    komshipOrderNo: o.komshipOrderNo,
    stage: o.status,
    status: stageToStatus(o.status),
    date: formatTanggal(o.createdAt),
    pickup: `${o.originCity}, ${o.originArea}`,
    delivery: `${o.destinationCity}, ${o.destinationArea}`,
    originLabel: o.originLabel,
    destinationLabel: o.destinationLabel,
    courier: courierDisplay(o),
    courierCode: o.courierCode,
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
  return o.etd ? `Estimasi tiba ${formatEtd(o.etd)}` : 'Estimasi belum tersedia'
}

export function toShipment(o: Order & { trackingEvents?: TrackingEvent[] }): Shipment {
  const events = o.trackingEvents ?? []

  return {
    resi: publicReference(o),
    orderId: o.id,
    courier: courierDisplay(o),
    courierCode: o.courierCode,
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

/** RajaOngkir manifests carry date and time as separate strings. */
export function manifestDate(date: string, time: string): Date {
  const parsed = new Date(`${date} ${time || '00:00'}`)
  return Number.isNaN(parsed.getTime()) ? new Date(date) : parsed
}

/**
 * A waybill tracked straight from RajaOngkir, for a shipment that was not
 * booked here. Everything shown comes from the carrier; there is no price,
 * weight or contents to show because we never saw the booking.
 */
export function waybillToShipment(w: RawWaybill): Shipment {
  const events = w.manifest.map((m, index) => ({
    title: m.manifest_description,
    location: m.city_name ?? '',
    time: formatWaktu(manifestDate(m.manifest_date, m.manifest_time)),
    done: w.delivered || index < w.manifest.length - 1,
    current: !w.delivered && index === w.manifest.length - 1
  }))

  const status = w.delivered
    ? 'Paket Sudah Diterima'
    : w.delivery_status.status || w.summary.status || 'Sedang Dalam Perjalanan'

  const eta = w.delivered && w.delivery_status.pod_date
    ? `Diterima ${w.delivery_status.pod_date} ${w.delivery_status.pod_time ?? ''}`.trim()
    : w.delivered ? 'Paket sudah diterima' : 'Dilacak langsung dari kurir'

  return {
    resi: w.summary.waybill_number,
    orderId: null,
    courier: `${courierLabel(w.summary.courier_code, w.summary.courier_name)} ${w.summary.service_code}`.trim(),
    courierCode: w.summary.courier_code.toLowerCase(),
    price: null,
    weight: '-',
    content: '-',
    pickup: { city: w.summary.origin, area: w.summary.shipper_name },
    delivery: { city: w.summary.destination, area: w.summary.receiver_name },
    status,
    eta,
    timeline: events
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
