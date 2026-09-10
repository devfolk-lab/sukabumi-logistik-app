import type { Order, TrackingEvent } from '../generated/prisma/client'
import { prisma } from './prisma'
import { trackWaybill } from './rajaongkir'
import { orderDetail } from './komship'

/** RajaOngkir manifests carry date and time as separate strings. */
function manifestDate(date: string, time: string): Date {
  const parsed = new Date(`${date} ${time || '00:00'}`)
  return Number.isNaN(parsed.getTime()) ? new Date(date) : parsed
}

/**
 * Pulls the live manifest for an order's AWB and caches it. Tracking is a
 * best-effort enrichment: a carrier outage must not break the detail page, so
 * failures fall back to whatever is already stored.
 */
export async function syncTracking(order: Order): Promise<TrackingEvent[]> {
  let awb = order.awb

  // The carrier assigns the AWB some time after pickup is scheduled, so an
  // order handed to Komship starts without one. Claim it on first sight.
  if (!awb && order.komshipOrderNo) {
    const detail = await orderDetail(order.komshipOrderNo).catch(() => null)

    if (detail?.awb) {
      awb = detail.awb
      await prisma.order.update({ where: { id: order.id }, data: { awb } })
    }
  }

  if (!awb) {
    return prisma.trackingEvent.findMany({
      where: { orderId: order.id },
      orderBy: { occurredAt: 'asc' }
    })
  }

  try {
    const waybill = await trackWaybill(awb, order.courierCode)

    const events = waybill.manifest.map(m => ({
      orderId: order.id,
      title: m.manifest_description,
      location: m.city_name ?? null,
      occurredAt: manifestDate(m.manifest_date, m.manifest_time)
    }))

    if (events.length > 0) {
      await prisma.trackingEvent.createMany({ data: events, skipDuplicates: true })
    }

    if (waybill.delivered && order.status !== 'SELESAI') {
      await prisma.order.update({ where: { id: order.id }, data: { status: 'SELESAI' } })
    } else if (!waybill.delivered && order.status === 'DIPROSES') {
      await prisma.order.update({ where: { id: order.id }, data: { status: 'DALAM_PERJALANAN' } })
    }
  } catch {
    // Carrier unreachable or AWB not yet scanned — serve the cache.
  }

  return prisma.trackingEvent.findMany({
    where: { orderId: order.id },
    orderBy: { occurredAt: 'asc' }
  })
}
