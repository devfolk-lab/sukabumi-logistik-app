import type { Order, TrackingEvent } from '../generated/prisma/client'
import type { OrderStage } from '#shared/types'
import { prisma } from './prisma'
import { getOrder, trackOrder } from './biteship'
import { isDestinationSide, stageForStatus, statusTitle, toArea } from './mappers'

/** Lifecycle order, so a late or repeated status never moves an order back. */
const RANK: Record<OrderStage, number> = {
  MENUNGGU_PEMBAYARAN: 0,
  DIPROSES: 1,
  DIJEMPUT: 2,
  DALAM_PERJALANAN: 3,
  SELESAI: 4,
  BATAL: 5
}

function nextStage(current: OrderStage, status: string): OrderStage | null {
  if (current === 'SELESAI' || current === 'BATAL') return null
  const stage = stageForStatus(status)
  if (!stage) return null
  if (stage === 'BATAL') return stage
  return RANK[stage] > RANK[current] ? stage : null
}

/**
 * Pulls the live history for an order and caches it. Tracking is a
 * best-effort enrichment: a carrier outage must not break the detail page, so
 * failures fall back to whatever is already stored.
 *
 * Orders are tracked by Biteship `tracking_id`, which is free. An order
 * without one was never booked on Biteship (seed data, or a pre-Biteship
 * Komship sandbox AWB no carrier knows), so it is not looked up by waybill —
 * that lookup is billed per call and could only fail.
 */
export async function syncTracking(order: Order): Promise<TrackingEvent[]> {
  // A confirmed draft records the booked order before its tracking id is
  // known if that lookup failed at the time; fetch it now.
  if (order.biteshipOrderId && !order.biteshipTrackingId) {
    const booked = await getOrder(order.biteshipOrderId).catch(() => null)
    if (booked?.courier.tracking_id) {
      order = await prisma.order.update({
        where: { id: order.id },
        data: {
          biteshipTrackingId: booked.courier.tracking_id,
          trackingUrl: booked.courier.link,
          awb: order.awb || booked.courier.waybill_id
        }
      })
    }
  }

  const tracking = order.biteshipTrackingId
    ? await trackOrder(order.biteshipTrackingId).catch(() => null)
    : null

  if (tracking) {
    const from = areaPlace(toArea(order.originArea))
    const to = areaPlace(toArea(order.destinationArea))
    const events = (tracking.history ?? []).map(h => ({
      orderId: order.id,
      title: statusTitle(h.status, h.note),
      status: h.status.toLowerCase(),
      note: h.note?.trim() || null,
      location: isDestinationSide(h.status) ? to : from,
      occurredAt: new Date(h.updated_at)
    }))

    if (events.length > 0) {
      await prisma.trackingEvent.createMany({ data: events, skipDuplicates: true })
    }

    const stage = nextStage(order.status, tracking.status)
    const awb = order.awb || tracking.waybill_id || null

    if (stage || awb !== order.awb) {
      await prisma.order.update({
        where: { id: order.id },
        data: { ...(stage ? { status: stage } : {}), awb }
      })
    }
  }

  return prisma.trackingEvent.findMany({
    where: { orderId: order.id },
    orderBy: { occurredAt: 'asc' }
  })
}
