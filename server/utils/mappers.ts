import type { Address as DomainAddress, AdminOrder, Area, Order as DomainOrder, OrderStage, PackageItem, RoutePoint, Shipment, TimelineStep } from '#shared/types'
import type { Address, Order, OrderItem, Prisma, TrackingEvent } from '../generated/prisma/client'
import type { RawHistory, RawTracking } from './biteship'

/** What every order query includes, so `toDomainOrder` always has the items. */
export const ORDER_INCLUDE = {
  items: { orderBy: { position: 'asc' } }
} as const satisfies Prisma.OrderInclude

export type OrderWithItems = Order & { items: OrderItem[] }

/** Areas are stored as the Biteship object itself; this only restores the type. */
export function toArea(value: Prisma.JsonValue): Area {
  return value as unknown as Area
}

function toPackageItem(i: OrderItem): PackageItem {
  return {
    name: i.name,
    description: i.description ?? '',
    category: i.category ?? '',
    sku: i.sku ?? '',
    value: i.value,
    quantity: i.quantity,
    weight: i.weight,
    length: i.length,
    width: i.width,
    height: i.height
  }
}

function origin(o: Order): Area {
  return toArea(o.originArea)
}

function destination(o: Order): Area {
  return toArea(o.destinationArea)
}

/**
 * Happy-path lifecycle, in order, with the Biteship status each stage stands
 * for (so it gets the same icon). `BATAL` is handled separately.
 */
const FLOW: { stage: OrderStage, title: string, status: string }[] = [
  { stage: 'MENUNGGU_PEMBAYARAN', title: 'Pesanan Dibuat', status: 'created' },
  { stage: 'DIPROSES', title: 'Pesanan Diproses', status: 'confirmed' },
  { stage: 'DIJEMPUT', title: 'Paket Dijemput Kurir', status: 'picked' },
  { stage: 'DALAM_PERJALANAN', title: 'Sedang Dalam Perjalanan', status: 'in_transit' },
  { stage: 'SELESAI', title: 'Paket Diterima', status: 'delivered' }
]

export function toDomainAddress(a: Address): DomainAddress {
  return {
    id: a.id,
    label: a.label,
    main: a.isMain,
    nama: a.nama,
    telp: a.telp,
    alamat: a.alamat,
    area: a.area === null ? null : toArea(a.area)
  }
}

/** "Lion Parcel Reg Pack" — carrier name plus Biteship's service name. */
function courierDisplay(o: Order): string {
  return `${o.courierName} ${o.serviceName}`.trim()
}

/**
 * The reference a customer can use outside this app: the carrier's AWB once
 * assigned, otherwise our internal `orderNo`, which only stands alone before
 * the handoff.
 */
export function publicReference(o: Pick<Order, 'awb' | 'orderNo'>): string {
  return o.awb || o.orderNo
}

/** "Sukabumi, Cibadak" — kota first, then kecamatan, as the order cards read. */
export function routePlace(a: Area): string {
  return `${titleCase(a.administrative_division_level_2_name || '-')}, ${titleCase(a.administrative_division_level_3_name || '-')}`
}

export function toDomainOrder(o: OrderWithItems): DomainOrder {
  const items = o.items.map(toPackageItem)
  return {
    id: o.id,
    orderNo: o.orderNo,
    resi: publicReference(o),
    biteshipOrderId: o.biteshipOrderId,
    paidAt: o.paidAt ? formatWaktu(o.paidAt) : null,
    stage: o.status,
    status: stageToStatus(o.status),
    date: formatTanggal(o.createdAt),
    pickup: routePlace(origin(o)),
    delivery: routePlace(destination(o)),
    origin: origin(o),
    destination: destination(o),
    sender: { nama: o.senderNama, telp: o.senderTelp, alamat: o.senderAlamat },
    receiver: { nama: o.receiverNama, telp: o.receiverTelp, alamat: o.receiverAlamat },
    courier: courierDisplay(o),
    courierCode: o.courierCode,
    service: o.serviceName,
    price: o.total,
    weight: formatBerat(o.weightGram),
    weightGram: o.weightGram,
    content: itemsSummary(items),
    items,
    awb: o.awb
  }
}

type AdminOrderRow = OrderWithItems & {
  profile: { id: string, nama: string, email: string, telp: string | null }
  approvedBy: { email: string, profile: { nama: string } | null } | null
}

export function toAdminOrder(o: AdminOrderRow): AdminOrder {
  return {
    ...toDomainOrder(o),
    customer: o.profile,
    createdAt: o.createdAt.toISOString(),
    approvedAt: o.approvedAt && o.biteshipOrderId ? formatWaktu(o.approvedAt) : null,
    approvedBy: o.biteshipOrderId && o.approvedBy ? o.approvedBy.profile?.nama || o.approvedBy.email : null,
    biteshipStatus: o.biteshipStatus
  }
}

/** Timeline derived from the persisted stage, used until an AWB exists. */
function stageTimeline(o: Order): TimelineStep[] {
  const from = areaPlace(origin(o))
  const to = areaPlace(destination(o))

  if (o.status === 'BATAL') {
    return [
      { title: 'Pesanan Dibuat', status: 'created', location: from, time: formatWaktu(o.createdAt), done: true },
      { title: 'Pesanan Dibatalkan', status: 'cancelled', location: from, time: formatWaktu(o.updatedAt), done: true }
    ]
  }

  const current = FLOW.findIndex(f => f.stage === o.status)

  return FLOW.map((step, index) => ({
    title: step.title,
    status: step.status,
    location: index >= 3 ? to : from,
    time: index === 0
      ? formatWaktu(o.createdAt)
      : index < current ? formatWaktu(o.updatedAt) : index === current ? formatWaktu(o.updatedAt) : 'Menunggu',
    done: index < current || o.status === 'SELESAI',
    current: index === current && o.status !== 'SELESAI'
  }))
}

/** The carrier's note, unless it only repeats the title. */
function extraNote(title: string, note: string | null | undefined): string | undefined {
  const text = note?.trim()
  return text && text.toLowerCase() !== title.toLowerCase() ? text : undefined
}

/**
 * Timeline built from carrier manifest events cached in `tracking_events`.
 *
 * Biteship can report an order as cancelled at the top level without a
 * matching history entry, so a cancelled order whose history does not end in
 * a terminal failure gets one closing step — otherwise the last carrier event
 * would read as still in progress.
 */
function eventTimeline(o: Order, events: TrackingEvent[]): TimelineStep[] {
  const finished = o.status === 'SELESAI' || o.status === 'BATAL'

  const steps: TimelineStep[] = events.map((e, index) => ({
    title: e.title,
    status: e.status,
    note: extraNote(e.title, e.note),
    location: e.location ?? areaPlace(origin(o)),
    time: formatWaktu(e.occurredAt),
    done: finished || index < events.length - 1,
    current: !finished && index === events.length - 1
  }))

  const last = events.at(-1)
  if (o.status === 'BATAL' && !(last?.status && stageForStatus(last.status) === 'BATAL')) {
    steps.push({
      title: 'Pesanan Dibatalkan',
      status: 'cancelled',
      location: areaPlace(origin(o)),
      time: formatWaktu(o.updatedAt),
      done: true
    })
  }

  return steps
}

function etaText(o: Order): string {
  if (o.status === 'SELESAI') return `Diterima ${formatWaktu(o.updatedAt)}`
  if (o.status === 'BATAL') return 'Pesanan dibatalkan'
  if (o.status === 'MENUNGGU_PEMBAYARAN') return 'Menunggu pembayaran'
  return o.etd ? `Estimasi tiba ${formatEtd(o.etd)}` : 'Estimasi belum tersedia'
}

function routePoint(a: Area): RoutePoint {
  return {
    city: titleCase(a.administrative_division_level_2_name || '-'),
    area: titleCase(a.administrative_division_level_3_name || '-')
  }
}

export function toShipment(o: OrderWithItems & { trackingEvents?: TrackingEvent[] }): Shipment {
  const events = o.trackingEvents ?? []

  return {
    resi: publicReference(o),
    orderId: o.id,
    stage: o.status,
    link: o.trackingUrl,
    origin: { nama: o.senderNama, alamat: o.senderAlamat },
    destination: { nama: o.receiverNama, alamat: o.receiverAlamat },
    courier: courierDisplay(o),
    courierCode: o.courierCode,
    price: o.total,
    weight: formatBerat(o.weightGram),
    content: itemsSummary(o.items),
    pickup: routePoint(origin(o)),
    delivery: routePoint(destination(o)),
    status: stageLabel(o.status),
    eta: etaText(o),
    timeline: events.length ? eventTimeline(o, events) : stageTimeline(o),
    tracked: events.length > 0
  }
}

/**
 * Biteship shipment statuses, in Indonesian. The notes Biteship attaches are
 * English and courier-specific, so the status is what the timeline shows.
 */
const STATUS_TITLE: Record<string, string> = {
  confirmed: 'Pesanan dikonfirmasi, kurir dijadwalkan menjemput',
  scheduled: 'Penjemputan dijadwalkan',
  allocated: 'Kurir ditugaskan',
  picking_up: 'Kurir menuju lokasi penjemputan',
  picked: 'Paket dijemput kurir',
  dropping_off: 'Paket sedang diantar ke penerima',
  in_transit: 'Paket dalam perjalanan',
  on_hold: 'Pengiriman ditahan sementara',
  delivered: 'Paket diterima',
  return_in_transit: 'Paket dalam perjalanan kembali ke pengirim',
  returned: 'Paket dikembalikan ke pengirim',
  rejected: 'Paket ditolak',
  courier_not_found: 'Kurir tidak ditemukan',
  cancelled: 'Pengiriman dibatalkan',
  disposed: 'Paket dimusnahkan'
}

export function statusTitle(status: string, note?: string): string {
  return STATUS_TITLE[status.toLowerCase()] ?? note ?? status
}

/**
 * Where a Biteship status leaves our order. Statuses that do not move the
 * lifecycle (confirmed, allocated, picking_up…) map to null.
 */
export function stageForStatus(status: string): OrderStage | null {
  switch (status.toLowerCase()) {
    case 'picked':
      return 'DIJEMPUT'
    case 'dropping_off':
    case 'in_transit':
    case 'on_hold':
    case 'return_in_transit':
      return 'DALAM_PERJALANAN'
    case 'delivered':
      return 'SELESAI'
    case 'cancelled':
    case 'rejected':
    case 'courier_not_found':
    case 'returned':
    case 'disposed':
      return 'BATAL'
    default:
      return null
  }
}

/** Statuses after which the package is with the receiver's side of the route. */
export function isDestinationSide(status: string): boolean {
  return ['dropping_off', 'delivered'].includes(status.toLowerCase())
}

/**
 * A waybill tracked straight from Biteship, for a shipment that was not
 * booked here. Everything shown comes from the carrier; there is no price,
 * weight or contents to show because we never saw the booking.
 */
export function waybillToShipment(t: RawTracking): Shipment {
  const history: RawHistory[] = t.history ?? []
  const delivered = t.status?.toLowerCase() === 'delivered'

  const events = history.map((h, index) => ({
    title: statusTitle(h.status, h.note),
    status: h.status.toLowerCase(),
    note: extraNote(statusTitle(h.status, h.note), h.note),
    location: isDestinationSide(h.status) ? t.destination?.address ?? '' : t.origin?.address ?? '',
    time: formatWaktu(new Date(h.updated_at)),
    done: delivered || index < history.length - 1,
    current: !delivered && index === history.length - 1
  }))

  const last = history.at(-1)

  // Statuses that do not move the lifecycle (confirmed, allocated…) mean the
  // carrier has the booking but not yet the package.
  const stage = delivered ? 'SELESAI' : stageForStatus(t.status ?? '') ?? 'DIPROSES'

  return {
    resi: t.waybill_id,
    orderId: null,
    stage,
    link: t.link ?? null,
    origin: { nama: t.origin?.contact_name || '-', alamat: t.origin?.address || '-' },
    destination: { nama: t.destination?.contact_name || '-', alamat: t.destination?.address || '-' },
    courier: courierLabel(t.courier.company),
    courierCode: t.courier.company.toLowerCase(),
    price: null,
    weight: '-',
    content: '-',
    pickup: { city: t.origin?.address || '-', area: t.origin?.contact_name || '-' },
    delivery: { city: t.destination?.address || '-', area: t.destination?.contact_name || '-' },
    status: statusTitle(t.status),
    eta: delivered && last ? `Diterima ${formatWaktu(new Date(last.updated_at))}` : 'Dilacak langsung dari kurir',
    timeline: events,
    tracked: true
  }
}

/** Sequential-ish, human-readable reference: SL-2026-8843. */
export function generateOrderNo(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(1000 + Math.random() * 9000)
  return `SL-${year}-${random}`
}
