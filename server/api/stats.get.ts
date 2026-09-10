import type { OrderStats } from '#shared/types'
import { requireProfile } from '../utils/auth'
import { prisma } from '../utils/prisma'

export default defineEventHandler(async (event): Promise<OrderStats> => {
  const profile = await requireProfile(event)

  const grouped = await prisma.order.groupBy({
    by: ['status'],
    where: { profileId: profile.id },
    _count: { _all: true }
  })

  const stats: OrderStats = { total: 0, proses: 0, selesai: 0, batal: 0 }

  for (const row of grouped) {
    const n = row._count._all
    stats.total += n
    stats[stageToStatus(row.status)] += n
  }

  return stats
})
