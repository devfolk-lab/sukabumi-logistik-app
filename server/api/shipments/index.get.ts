import type { Shipment } from '#shared/types'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { toShipment } from '../../utils/mappers'

/** Shipments in flight — what the home screen and lacak list show. */
export default defineEventHandler(async (event): Promise<Shipment[]> => {
  const profile = await requireProfile(event)

  const rows = await prisma.order.findMany({
    where: {
      profileId: profile.id,
      status: { in: ['DIPROSES', 'DIJEMPUT', 'DALAM_PERJALANAN'] }
    },
    include: { trackingEvents: { orderBy: { occurredAt: 'asc' } } },
    orderBy: { createdAt: 'desc' }
  })

  return rows.map(toShipment)
})
