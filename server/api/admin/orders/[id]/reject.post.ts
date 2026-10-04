import { z } from 'zod'
import type { AdminOrder } from '#shared/types'
import { requireRole } from '../../../../utils/auth'
import { prisma } from '../../../../utils/prisma'
import { ADMIN_ORDER_INCLUDE, cancelUnpaidOrder } from '../../../../utils/approval'
import { toAdminOrder } from '../../../../utils/mappers'

/**
 * The transfer never arrived or does not match: cancel the unpaid order.
 * Nothing was booked on Biteship, so nothing is called off there. Admins and
 * superadmins only.
 */
export default defineEventHandler(async (event): Promise<AdminOrder> => {
  await requireRole(event, canApproveOrders)
  const id = z.uuid().parse(getRouterParam(event, 'id'))

  await cancelUnpaidOrder(id)
  return toAdminOrder(await prisma.order.findUniqueOrThrow({ where: { id }, include: ADMIN_ORDER_INCLUDE }))
})
