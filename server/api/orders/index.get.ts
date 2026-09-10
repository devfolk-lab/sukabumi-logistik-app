import type { Order } from '#shared/types'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { toDomainOrder } from '../../utils/mappers'

export default defineEventHandler(async (event): Promise<Order[]> => {
  const profile = await requireProfile(event)

  const rows = await prisma.order.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: 'desc' }
  })

  return rows.map(toDomainOrder)
})
