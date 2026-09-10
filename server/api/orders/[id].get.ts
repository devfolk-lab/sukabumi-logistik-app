import { z } from 'zod'
import type { Order, Shipment } from '#shared/types'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { toDomainOrder, toShipment } from '../../utils/mappers'
import { syncTracking } from '../../utils/tracking'

export default defineEventHandler(async (event): Promise<{ order: Order, shipment: Shipment }> => {
  const profile = await requireProfile(event)
  const id = z.uuid().parse(getRouterParam(event, 'id'))

  const row = await prisma.order.findFirst({ where: { id, profileId: profile.id } })

  if (!row) {
    throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan' })
  }

  const trackingEvents = await syncTracking(row)
  const fresh = await prisma.order.findUniqueOrThrow({ where: { id: row.id } })

  return {
    order: toDomainOrder(fresh),
    shipment: toShipment({ ...fresh, trackingEvents })
  }
})
