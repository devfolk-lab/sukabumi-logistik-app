import type { Shipment } from '#shared/types'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { toShipment } from '../../utils/mappers'
import { syncTracking } from '../../utils/tracking'

/**
 * Looks a shipment up by carrier AWB or by our own order number. Tracking an
 * arbitrary third-party AWB is not possible here: RajaOngkir requires the
 * courier code alongside the waybill, and there is no way to infer it.
 */
export default defineEventHandler(async (event): Promise<Shipment> => {
  const profile = await requireProfile(event)
  const resi = normalizeResi(getRouterParam(event, 'resi') ?? '')

  if (!resi) {
    throw createError({ statusCode: 400, statusMessage: 'Nomor resi wajib diisi' })
  }

  const order = await prisma.order.findFirst({
    where: {
      profileId: profile.id,
      OR: [{ awb: resi }, { orderNo: resi }]
    }
  })

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'Resi tidak ditemukan' })
  }

  const trackingEvents = await syncTracking(order)
  const fresh = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })

  return toShipment({ ...fresh, trackingEvents })
})
