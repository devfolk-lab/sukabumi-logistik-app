import { z } from 'zod'
import type { Shipment } from '#shared/types'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { ORDER_INCLUDE, toShipment, waybillToShipment } from '../../utils/mappers'
import { syncTracking } from '../../utils/tracking'
import { BiteshipError, biteshipFailure, trackWaybill } from '../../utils/biteship'
import { recordLookup } from '../../utils/lookups'

const query = z.object({
  /** Carrier code for a waybill not booked here; omitted means try each allowed carrier. */
  courier: z.string().trim().toLowerCase().optional()
})

/**
 * Looks a shipment up by carrier AWB or our own order number. Anything not
 * booked here is tracked straight from Biteship, so a resi from any Lion
 * Parcel or J&T Cargo shipment works — Biteship needs the courier code alongside the
 * waybill, so without one we try each allowed carrier.
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
      OR: [{ awb: resi }, { orderNo: resi }]
    }
  })

  if (order) {
    const trackingEvents = await syncTracking(order)
    const fresh = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: ORDER_INCLUDE })
    return toShipment({ ...fresh, trackingEvents })
  }

  if (courier && !isAllowedCourier(courier)) {
    throw createError({ statusCode: 422, statusMessage: 'Kurir tidak didukung' })
  }

  const candidates = courier ? [courier] : [...ALLOWED_COURIERS]
  let lastError: unknown

  for (const code of candidates) {
    try {
      const shipment = waybillToShipment(await trackWaybill(resi, code))
      // Lacak lists what was tracked before; orders placed here never get this far.
      await recordLookup(profile.id, shipment)
      return shipment
    } catch (error) {
      // An empty balance fails every carrier the same way; say so at once.
      if (error instanceof BiteshipError && error.noBalance) {
        throw biteshipFailure(error, 'Gagal melacak resi')
      }
      lastError = error
    }
  }

  const status = lastError instanceof BiteshipError ? lastError.status : undefined
  throw createError({
    statusCode: status && status >= 500 ? 502 : 404,
    statusMessage: status && status >= 500
      ? 'Kurir sedang tidak bisa dihubungi, coba lagi sebentar'
      : courier
        ? `Resi tidak ditemukan di ${courierLabel(courier)}`
        : `Resi tidak ditemukan di ${ALLOWED_COURIERS.map(c => courierLabel(c)).join(' maupun ')}`
  })
})
