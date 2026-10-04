import { z } from 'zod'
import type { SessionUser } from '#shared/types'
import { startSession, toSessionUser } from '../../utils/auth'
import { readAuthBody } from '../../utils/auth-mail'
import { verifyAgainstNothing, verifyPassword } from '../../utils/password'
import { prisma } from '../../utils/prisma'
import { rateLimit, resetRateLimit } from '../../utils/rate-limit'
import { emailSchema } from '../../utils/schemas'

const body = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password wajib diisi').max(200)
})

/** Ten tries per address per 15 minutes; a successful login clears the count. */
const MAX_ATTEMPTS = 10
const WINDOW_MS = 15 * 60 * 1000

export default defineEventHandler(async (event): Promise<{ user: SessionUser }> => {
  const input = await readAuthBody(event, body)
  const limitKey = `login:${input.email}`
  rateLimit(limitKey, MAX_ATTEMPTS, WINDOW_MS)

  const user = await prisma.user.findUnique({ where: { email: input.email }, include: { profile: true } })

  // One message for a wrong password and an unknown address, and the same
  // bcrypt cost for both, so neither the answer nor its timing tells them apart.
  const valid = user ? await verifyPassword(input.password, user.passwordHash) : await verifyAgainstNothing(input.password)
  if (!user || !valid) {
    throw createError({ statusCode: 401, statusMessage: 'Email atau password salah.' })
  }

  // Only said once the password has proved who is asking.
  if (!user.emailVerifiedAt) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Email belum dikonfirmasi. Buka link konfirmasi di email kamu terlebih dahulu.'
    })
  }

  resetRateLimit(limitKey)
  await startSession(event, user.id)

  return { user: toSessionUser(user.profile ?? { id: user.id, email: user.email, nama: user.email.split('@')[0] || 'Pengguna' }, user.role) }
})
