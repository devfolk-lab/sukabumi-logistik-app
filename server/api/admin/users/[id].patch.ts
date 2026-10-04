import { z } from 'zod'
import type { StaffUser } from '#shared/types'
import { forgetUser, requireRole } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { STAFF_SELECT, toStaffUser } from '../../../utils/staff'

const body = z.object({
  role: z.enum(['USER', 'ADMIN', 'SUPERADMIN'])
})

/**
 * Changes an account's role. A superadmin cannot change their own, so the
 * last one can never lock everybody out. Superadmins only.
 */
export default defineEventHandler(async (event): Promise<StaffUser> => {
  const auth = await requireRole(event, canManageStaff)
  const id = z.uuid().parse(getRouterParam(event, 'id'))
  const input = await readValidatedBody(event, body.parse)

  if (id === auth.profile.id) {
    throw createError({ statusCode: 409, statusMessage: 'Kamu tidak bisa mengubah peranmu sendiri' })
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role: input.role },
    select: STAFF_SELECT
  }).catch((error: unknown) => {
    if ((error as { code?: string }).code === 'P2025') {
      throw createError({ statusCode: 404, statusMessage: 'Akun tidak ditemukan' })
    }
    throw error
  })

  // Cached sessions carry the role; drop them so it applies on the next request.
  forgetUser(id)
  return toStaffUser(user)
})
