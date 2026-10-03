import { z } from 'zod'
import { authLink, readAuthBody, releaseAuthEmail, sendResetPasswordEmail, throttleAuthEmail } from '../../utils/auth-mail'
import { issueAuthToken } from '../../utils/auth-tokens'
import { prisma } from '../../utils/prisma'
import { emailSchema } from '../../utils/schemas'

const body = z.object({ email: emailSchema })

/**
 * Emails a password-reset link; any earlier one stops working. An unknown
 * address gets the same answer as a known one, so the form cannot be used to
 * find out who has an account.
 */
export default defineEventHandler(async (event) => {
  const input = await readAuthBody(event, body)

  throttleAuthEmail('reset', input.email)

  const user = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } })
  if (!user) return { email: input.email }

  try {
    const token = await issueAuthToken(user.id, 'RESET_PASSWORD')
    await sendResetPasswordEmail(input.email, authLink(event, '/reset-password', token))
  } catch (error) {
    console.error('[auth] reset email failed:', error)
    releaseAuthEmail('reset', input.email)
    throw createError({ statusCode: 502, statusMessage: 'Gagal mengirim email, coba lagi sebentar' })
  }

  return { email: input.email }
})
