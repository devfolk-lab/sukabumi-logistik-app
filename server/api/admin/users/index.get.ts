import { z } from 'zod'
import type { StaffUser } from '#shared/types'
import type { Prisma } from '../../../generated/prisma/client'
import { requireRole } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { STAFF_SELECT, toStaffUser } from '../../../utils/staff'

const query = z.object({
  q: z.string().trim().max(100).default('')
})

/**
 * The staff (admins and superadmins), or — with `q` — any account matching
 * it, so a customer can be found and promoted. Superadmins only.
 */
export default defineEventHandler(async (event): Promise<StaffUser[]> => {
  await requireRole(event, canManageStaff)
  const input = await getValidatedQuery(event, query.parse)

  const where: Prisma.UserWhereInput = input.q
    ? {
        OR: [
          { email: { contains: input.q, mode: 'insensitive' } },
          { profile: { nama: { contains: input.q, mode: 'insensitive' } } }
        ]
      }
    : { role: { in: ['ADMIN', 'SUPERADMIN'] } }

  const rows = await prisma.user.findMany({
    where,
    select: STAFF_SELECT,
    orderBy: [{ role: 'desc' }, { email: 'asc' }],
    take: 50
  })

  return rows.map(toStaffUser)
})
