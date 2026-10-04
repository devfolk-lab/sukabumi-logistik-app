import type { TrackedWaybill } from '#shared/types'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { toTrackedWaybill } from '../../utils/lookups'

/** The waybills this account has tracked on Lacak, most recent first. */
export default defineEventHandler(async (event): Promise<TrackedWaybill[]> => {
  const profile = await requireProfile(event)

  const rows = await prisma.trackingLookup.findMany({
    where: { profileId: profile.id },
    orderBy: { updatedAt: 'desc' },
    take: 50
  })

  return rows.map(toTrackedWaybill)
})
