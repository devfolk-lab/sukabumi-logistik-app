import type { PublicTracking } from '#shared/types'
import type { Order, TrackingEvent } from '../generated/prisma/client'
import type { RawTracking } from './biteship'
import { etaText, extraNote, routePlace, stageForStatus, statusTitle, toArea } from './mappers'

/**
 * What the landing page's "Lacak Pengiriman" may see. It is public, so the
 * receiver's name is masked and addresses stop at the kota/kecamatan for our
 * own orders; a waybill from Biteship keeps only the carrier's history.
 */

/** "Ahmad Rizal" → "Ah*** R." */
export function maskName(name: string | null | undefined): string | null {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return null
  const [first, ...rest] = words
  return [`${first!.slice(0, 2)}***`, ...rest.map(w => `${w[0]!.toUpperCase()}.`)].join(' ')
}

/** One of our own orders, with the events cached (or, for Antar Langsung, written by an admin). */
export function orderToPublic(o: Order, events: TrackingEvent[]): PublicTracking {
  const last = events.at(-1)
  const lastStatus = last?.status ?? null
  return {
    waybill: o.awb || o.orderNo,
    courier: { code: o.courierCode, name: o.courierName, service: o.serviceName || null },
    stage: o.status,
    statusCode: lastStatus,
    status: o.status === 'MENUNGGU_PEMBAYARAN' || o.status === 'BATAL' || !last
      ? stageLabel(o.status)
      : last.title,
    receiver: maskName(o.receiverNama),
    origin: routePlace(toArea(o.originArea)),
    destination: routePlace(toArea(o.destinationArea)),
    weight: formatBerat(o.weightGram),
    eta: etaText(o),
    link: o.trackingUrl,
    history: events.map(e => ({
      status: e.status,
      title: e.title,
      note: extraNote(e.title, e.note) ?? null,
      location: e.location,
      time: e.occurredAt.toISOString()
    }))
  }
}

/** A waybill tracked straight from Biteship (billed), not booked here. */
export function waybillToPublic(t: RawTracking, courierCode: string): PublicTracking {
  const history = t.history ?? []
  const status = t.status?.toLowerCase() ?? null
  const delivered = status === 'delivered'
  const last = history.at(-1)

  return {
    waybill: t.waybill_id,
    courier: { code: courierCode, name: courierLabel(courierCode, t.courier.company), service: null },
    stage: delivered ? 'SELESAI' : stageForStatus(status ?? '') ?? 'DIPROSES',
    statusCode: status,
    status: statusTitle(t.status ?? ''),
    receiver: maskName(t.destination?.contact_name),
    origin: null,
    destination: null,
    weight: null,
    eta: delivered && last ? `Diterima ${formatWaktu(new Date(last.updated_at))}` : null,
    link: t.link ?? null,
    history: history.map((h) => {
      const title = statusTitle(h.status, h.note)
      return {
        status: h.status.toLowerCase(),
        title,
        note: extraNote(title, h.note) ?? null,
        location: null,
        time: new Date(h.updated_at).toISOString()
      }
    })
  }
}
