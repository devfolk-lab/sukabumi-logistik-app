import type { Order, Prisma, TrackingEvent } from '../generated/prisma/client'
import type { OrderStage } from '#shared/types'
import { prisma } from './prisma'
import { getOrder, type RawOrder } from './biteship'
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
 * The columns that mirror Biteship's order. Values Biteship leaves empty keep
 * what we already have, so a waybill never disappears once assigned.
 */
export function biteshipOrderFields(raw: RawOrder, current?: Pick<Order, 'awb' | 'biteshipTrackingId' | 'trackingUrl'>) {
  return {
    biteshipOrderId: raw.id,
    biteshipStatus: raw.status?.toLowerCase() || null,
    biteshipPrice: typeof raw.price === 'number' ? Math.round(raw.price) : null,
    biteshipTrackingId: raw.courier.tracking_id || current?.biteshipTrackingId || null,
    trackingUrl: raw.courier.link || current?.trackingUrl || null,
    awb: raw.courier.waybill_id || current?.awb || null
  } satisfies Prisma.OrderUpdateInput
}

/**
 * Pulls the order from Biteship's retrieve-order API, stores what changed on
 * it, and caches the courier's history from it. Tracking is a best-effort
 * enrichment: a carrier outage must not break the detail page, so failures
 * fall back to whatever is already stored.
 *
 * Only orders an admin has booked on Biteship are looked up. Older ones
 * (seed data, pre-Biteship Komship sandbox AWBs) have no Biteship order id
 * and keep the history already stored.
 */
export async function syncTracking(order: Order): Promise<TrackingEvent[]> {
  const raw = order.biteshipOrderId
    ? await getOrder(order.biteshipOrderId).catch((error: unknown) => {
        console.error('[biteship] order lookup failed:', order.biteshipOrderId, error instanceof Error ? error.message : error)
        return null
      })
    : null

  if (raw) {
    const from = areaPlace(toArea(order.originArea))
    const to = areaPlace(toArea(order.destinationArea))
    const events = (raw.courier.history ?? []).map(h => ({
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

    const stage = nextStage(order.status, raw.status)
    const fields = biteshipOrderFields(raw, order)
    const changed = stage
      || fields.biteshipStatus !== order.biteshipStatus
      || fields.biteshipPrice !== order.biteshipPrice
      || fields.biteshipTrackingId !== order.biteshipTrackingId
      || fields.trackingUrl !== order.trackingUrl
      || fields.awb !== order.awb

    if (changed) {
      await prisma.order.update({
        where: { id: order.id },
        data: { ...fields, ...(stage ? { status: stage } : {}) }
      })
    }
  }

  return prisma.trackingEvent.findMany({
    where: { orderId: order.id },
    orderBy: { occurredAt: 'asc' }
  })
}
