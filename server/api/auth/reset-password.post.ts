import { z } from 'zod'
import { revokeSessions } from '../../utils/auth'
import { readAuthBody } from '../../utils/auth-mail'
import { consumeAuthToken } from '../../utils/auth-tokens'
import { hashPassword } from '../../utils/password'
import { prisma } from '../../utils/prisma'
import { linkTokenSchema, newPasswordSchema } from '../../utils/schemas'

const body = z.object({
  token: linkTokenSchema,
  password: newPasswordSchema
})

/**
 * Redeems the reset link and sets the new password. Every device is signed
 * out, since whoever knew the old password should not stay in. Opening the
 * link also proves the inbox is theirs, so an unconfirmed account counts as
 * confirmed from here on.
 */
export default defineEventHandler(async (event) => {
  const input = await readAuthBody(event, body)

  const userId = await consumeAuthToken(input.token, 'RESET_PASSWORD')
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'Link ini sudah kedaluwarsa atau sudah pernah dipakai.' })
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { emailVerifiedAt: true } })

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(input.password),
      emailVerifiedAt: user.emailVerifiedAt ?? new Date()
    }
  })
  await revokeSessions(userId)

  return { ok: true }
})
