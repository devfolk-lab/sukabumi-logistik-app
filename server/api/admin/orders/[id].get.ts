import { z } from 'zod'
import type { AdminOrder, Shipment } from '#shared/types'
import { requireRole } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { toAdminOrder, toShipment } from '../../../utils/mappers'
import { syncTracking } from '../../../utils/tracking'
import { ADMIN_ORDER_INCLUDE } from '../../../utils/approval'

/**
 * Any customer's order, for the approval menu: our row plus the courier's
 * history from Biteship's retrieve-order, as the customer's own page shows it.
 */
export default defineEventHandler(async (event): Promise<{ order: AdminOrder, shipment: Shipment }> => {
  await requireRole(event, canApproveOrders)
  const id = z.uuid().parse(getRouterParam(event, 'id'))

  const found = await prisma.order.findUnique({ where: { id } })
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan' })

  const trackingEvents = await syncTracking(found)
  const fresh = await prisma.order.findUniqueOrThrow({ where: { id }, include: ADMIN_ORDER_INCLUDE })

  return {
    order: toAdminOrder(fresh),
    shipment: toShipment({ ...fresh, trackingEvents })
  }
})
