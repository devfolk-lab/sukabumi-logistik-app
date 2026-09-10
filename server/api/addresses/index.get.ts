import type { Address } from '#shared/types'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { toDomainAddress } from '../../utils/mappers'

export default defineEventHandler(async (event): Promise<Address[]> => {
  const profile = await requireProfile(event)

  const rows = await prisma.address.findMany({
    where: { profileId: profile.id },
    orderBy: [{ isMain: 'desc' }, { createdAt: 'asc' }]
  })

  return rows.map(toDomainAddress)
})
