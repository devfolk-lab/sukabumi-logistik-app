import type { Shipment } from '#shared/types'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { ORDER_INCLUDE, toShipment } from '../../utils/mappers'
import { syncPendingPayments } from '../../utils/payment'

/** Shipments in flight — what the home screen and lacak list show. */
export default defineEventHandler(async (event): Promise<Shipment[]> => {
  const profile = await requireProfile(event)
  // An order whose transfer was just confirmed belongs in this list now.
  await syncPendingPayments(profile.id)

  const rows = await prisma.order.findMany({
    where: {
      profileId: profile.id,
      status: { in: ['DIPROSES', 'DIJEMPUT', 'DALAM_PERJALANAN'] }
    },
    include: { ...ORDER_INCLUDE, trackingEvents: { orderBy: { occurredAt: 'asc' } } },
    orderBy: { createdAt: 'desc' }
  })

  return rows.map(row => toShipment(row))
})
