import { z } from 'zod'
import type { SessionUser } from '#shared/types'
import { startSession, toSessionUser } from '../../utils/auth'
import { readAuthBody } from '../../utils/auth-mail'
import { consumeAuthToken } from '../../utils/auth-tokens'
import { prisma } from '../../utils/prisma'
import { linkTokenSchema } from '../../utils/schemas'

const body = z.object({ token: linkTokenSchema })

/** Redeems the confirmation link: confirms the address and signs the user in. */
export default defineEventHandler(async (event): Promise<{ user: SessionUser }> => {
  const input = await readAuthBody(event, body)

  const userId = await consumeAuthToken(input.token, 'VERIFY_EMAIL')
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'Link konfirmasi sudah kedaluwarsa atau sudah pernah dipakai.' })
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
    include: { profile: true }
  })

  await startSession(event, user.id)
  return { user: toSessionUser(user.profile ?? { id: user.id, email: user.email, nama: user.email.split('@')[0] || 'Pengguna' }, user.role) }
})
