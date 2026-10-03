import { z } from 'zod'
import { resolveSession, revokeSessions } from '../../utils/auth'
import { readAuthBody } from '../../utils/auth-mail'
import { hashPassword, verifyPassword } from '../../utils/password'
import { prisma } from '../../utils/prisma'
import { rateLimit } from '../../utils/rate-limit'
import { newPasswordSchema } from '../../utils/schemas'

const body = z.object({
  current: z.string().min(1, 'Masukkan password saat ini').max(200),
  password: newPasswordSchema
})

/**
 * Changes the password of the signed-in account. The current password is
 * checked first, so a borrowed unlocked phone cannot lock the owner out. Other
 * devices are signed out; this one stays in.
 */
export default defineEventHandler(async (event) => {
  const auth = await resolveSession(event)
  if (!auth) throw createError({ statusCode: 401, statusMessage: 'Silakan masuk terlebih dahulu' })
  const input = await readAuthBody(event, body)

  rateLimit(`change-password:${auth.profile.id}`, 10, 15 * 60 * 1000)

  const user = await prisma.user.findUniqueOrThrow({ where: { id: auth.profile.id } })
  if (!await verifyPassword(input.current, user.passwordHash)) {
    throw createError({ statusCode: 400, statusMessage: 'Password saat ini salah.' })
  }
  if (await verifyPassword(input.password, user.passwordHash)) {
    throw createError({ statusCode: 400, statusMessage: 'Password baru harus berbeda dari password lama.' })
  }

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.password) } })

  await revokeSessions(user.id, auth.sessionId)

  return { ok: true }
})
