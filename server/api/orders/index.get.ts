import type { Order } from '#shared/types'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { ORDER_INCLUDE, toDomainOrder } from '../../utils/mappers'
import { syncPendingPayments } from '../../utils/payment'

export default defineEventHandler(async (event): Promise<Order[]> => {
  const profile = await requireProfile(event)
  await syncPendingPayments(profile.id)

  const rows = await prisma.order.findMany({
    where: { profileId: profile.id },
    include: ORDER_INCLUDE,
    orderBy: { createdAt: 'desc' }
  })

  return rows.map(row => toDomainOrder(row))
})
