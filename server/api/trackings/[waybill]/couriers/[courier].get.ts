import type { PublicTracking } from '#shared/types'
import { prisma } from '../../../../utils/prisma'
import { syncTracking } from '../../../../utils/tracking'
import { BiteshipError, trackWaybill } from '../../../../utils/biteship'
import { orderToPublic, waybillToPublic } from '../../../../utils/public-tracking'
import { rateLimit } from '../../../../utils/rate-limit'

/** Carriers the public lookup accepts: any Biteship one we know, plus our own. */
const COURIERS = new Set<string>([...SUPPORTED_COURIERS, ANTAR_LANGSUNG_CODE])

/**
 * Public tracking by waybill and carrier, for the landing page — no account.
 *
 * Our own orders are answered from the database: Antar Langsung by its order
 * number (its only reference), a Biteship-booked order by its AWB through the
 * free retrieve-order. Anything else goes to Biteship's waybill tracking,
 * which is billed per call, so every caller is rate limited by IP.
 */
export default defineEventHandler(async (event): Promise<PublicTracking | undefined> => {
  const origins = useRuntimeConfig(event).trackingCorsOrigins
    .split(',').map(o => o.trim()).filter(Boolean)
  if (handleCors(event, { origin: origins, methods: ['GET'] })) return

  const waybill = normalizeResi(getRouterParam(event, 'waybill', { decode: true }) ?? '')
  const courier = (getRouterParam(event, 'courier') ?? '').trim().toLowerCase()

  if (!waybill || waybill.length > 64) {
    throw createError({ statusCode: 400, statusMessage: 'Nomor resi tidak valid' })
  }
  if (!COURIERS.has(courier)) {
    throw createError({ statusCode: 422, statusMessage: 'Kurir tidak didukung' })
  }

  rateLimit(`tracking:${getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'}`, 30, 10 * 60 * 1000)

  const order = await prisma.order.findFirst({
    where: isAntarLangsung(courier)
      ? { courierCode: ANTAR_LANGSUNG_CODE, OR: [{ orderNo: waybill }, { awb: waybill }] }
      : { courierCode: courier, awb: waybill }
  })

  if (order) {
    const events = await syncTracking(order)
    const fresh = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    return orderToPublic(fresh, events)
  }

  if (isAntarLangsung(courier)) {
    throw createError({ statusCode: 404, statusMessage: 'Nomor pesanan tidak ditemukan di Sukabumi Logistik Antar Langsung' })
  }

  try {
    return waybillToPublic(await trackWaybill(waybill, courier), courier)
  } catch (error) {
    if (!(error instanceof BiteshipError)) throw error
    console.error('[biteship] public tracking:', waybill, courier, error.status, error.code ?? '', error.message)
    if (error.noBalance) {
      throw createError({ statusCode: 503, statusMessage: 'Pelacakan online sedang tidak tersedia, silakan hubungi admin' })
    }
    if (error.status >= 500) {
      throw createError({ statusCode: 502, statusMessage: 'Kurir sedang tidak bisa dihubungi, coba lagi sebentar' })
    }
    throw createError({ statusCode: 404, statusMessage: `Resi tidak ditemukan di ${courierLabel(courier)}` })
  }
})
