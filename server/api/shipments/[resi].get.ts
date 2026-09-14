import { z } from 'zod'
import type { Shipment } from '#shared/types'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { toShipment, waybillToShipment } from '../../utils/mappers'
import { syncTracking } from '../../utils/tracking'
import { trackWaybill } from '../../utils/rajaongkir'

const query = z.object({
  /** Carrier code for a waybill not booked here; omitted means try each allowed carrier. */
  courier: z.string().trim().toLowerCase().optional()
})

/**
 * Looks a shipment up by carrier AWB, Komship order number or our own order
 * number. Anything not booked here is tracked straight from RajaOngkir, so a
 * resi from any J&T / Lion Parcel shipment works — RajaOngkir needs the
 * courier code alongside the waybill, so without one we try each carrier.
 */
export default defineEventHandler(async (event): Promise<Shipment> => {
  const profile = await requireProfile(event)
  const resi = normalizeResi(getRouterParam(event, 'resi') ?? '')
  const { courier } = await getValidatedQuery(event, query.parse)

  if (!resi) {
    throw createError({ statusCode: 400, statusMessage: 'Nomor resi wajib diisi' })
  }

  const order = await prisma.order.findFirst({
    where: {
      profileId: profile.id,
      OR: [{ awb: resi }, { komshipOrderNo: resi }, { orderNo: resi }]
    }
  })

  if (order) {
    const trackingEvents = await syncTracking(order)
    const fresh = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    return toShipment({ ...fresh, trackingEvents })
  }

  if (courier && !isAllowedCourier(courier)) {
    throw createError({ statusCode: 422, statusMessage: 'Kurir tidak didukung' })
  }

  const candidates = courier ? [courier] : [...ALLOWED_COURIERS]
  let lastError: unknown

  for (const code of candidates) {
    try {
      return waybillToShipment(await trackWaybill(resi, code))
    } catch (error) {
      lastError = error
    }
  }

  const status = (lastError as { statusCode?: number })?.statusCode
  throw createError({
    statusCode: status && status >= 500 ? 502 : 404,
    statusMessage: status && status >= 500
      ? 'Kurir sedang tidak bisa dihubungi, coba lagi sebentar'
      : courier
        ? `Resi tidak ditemukan di ${courierLabel(courier)}`
        : 'Resi tidak ditemukan di J&T Express maupun Lion Parcel'
  })
})
