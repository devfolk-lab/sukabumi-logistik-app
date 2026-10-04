import { z } from 'zod'
import type { StaffUser } from '#shared/types'
import { requireRole } from '../../../utils/auth'
import { hashPassword } from '../../../utils/password'
import { prisma } from '../../../utils/prisma'
import { emailSchema, newPasswordSchema } from '../../../utils/schemas'
import { STAFF_SELECT, toStaffUser } from '../../../utils/staff'

const body = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(120, 'Nama terlalu panjang'),
  email: emailSchema,
  telp: z.string().trim().max(30, 'Nomor HP terlalu panjang').default(''),
  password: newPasswordSchema,
  role: z.enum(['ADMIN', 'SUPERADMIN'])
})

/**
 * Creates a staff account that can sign in straight away: the superadmin
 * vouches for the address, so no confirmation email is sent. An address that
 * already has an account is refused — promote that account instead.
 * Superadmins only.
 */
export default defineEventHandler(async (event): Promise<StaffUser> => {
  await requireRole(event, canManageStaff)
  const input = await readValidatedBody(event, body.parse)

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash: await hashPassword(input.password),
      emailVerifiedAt: new Date(),
      role: input.role,
      profile: { create: { nama: input.nama, email: input.email, telp: input.telp || null } }
    },
    select: STAFF_SELECT
  }).catch((error: unknown) => {
    if ((error as { code?: string }).code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Email sudah terdaftar. Cari akunnya lalu ubah perannya.' })
    }
    throw error
  })

  setResponseStatus(event, 201)
  return toStaffUser(user)
})
