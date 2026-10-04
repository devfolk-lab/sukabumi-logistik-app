import { z } from 'zod'
import type { Order, Shipment } from '#shared/types'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { ORDER_INCLUDE, toDomainOrder, toShipment } from '../../utils/mappers'
import { syncTracking } from '../../utils/tracking'
import { syncPayment } from '../../utils/payment'

export default defineEventHandler(async (event): Promise<{ order: Order, shipment: Shipment }> => {
  const profile = await requireProfile(event)
  const id = z.uuid().parse(getRouterParam(event, 'id'))

  const found = await prisma.order.findFirst({ where: { id, profileId: profile.id } })

  if (!found) {
    throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan' })
  }

  // A confirmed payment gives the order its tracking id, so it is checked
  // first and tracking then reads the updated row.
  await syncPayment(found)
  const row = await prisma.order.findUniqueOrThrow({ where: { id: found.id } })

  const trackingEvents = await syncTracking(row)
  const fresh = await prisma.order.findUniqueOrThrow({ where: { id: row.id }, include: ORDER_INCLUDE })

  return {
    order: toDomainOrder(fresh),
    shipment: toShipment({ ...fresh, trackingEvents })
  }
})
