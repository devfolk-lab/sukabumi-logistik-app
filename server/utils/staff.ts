import type { StaffUser } from '#shared/types'
import type { Prisma } from '../generated/prisma/client'

/** What the staff menu reads about an account. */
export const STAFF_SELECT = {
  id: true,
  email: true,
  role: true,
  emailVerifiedAt: true,
  createdAt: true,
  profile: { select: { nama: true, telp: true } }
} as const satisfies Prisma.UserSelect

type StaffRow = Prisma.UserGetPayload<{ select: typeof STAFF_SELECT }>

export function toStaffUser(u: StaffRow): StaffUser {
  return {
    id: u.id,
    nama: u.profile?.nama || u.email.split('@')[0] || 'Pengguna',
    email: u.email,
    telp: u.profile?.telp ?? null,
    role: u.role,
    verified: Boolean(u.emailVerifiedAt),
    createdAt: u.createdAt.toISOString()
  }
}
