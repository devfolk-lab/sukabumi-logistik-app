import { z } from 'zod'
import { authLink, readAuthBody, releaseAuthEmail, sendConfirmationEmail, throttleAuthEmail } from '../../utils/auth-mail'
import { issueAuthToken } from '../../utils/auth-tokens'
import { prisma } from '../../utils/prisma'
import { emailSchema } from '../../utils/schemas'

const body = z.object({ email: emailSchema })

/**
 * Sends a fresh confirmation link to an account that is not confirmed yet; the
 * previous link stops working. The answer is the same whether or not the
 * address has an account, so the route cannot be used to find out who is
 * registered.
 */
export default defineEventHandler(async (event) => {
  const input = await readAuthBody(event, body)

  throttleAuthEmail('confirm', input.email)

  const user = await prisma.user.findUnique({ where: { email: input.email }, include: { profile: true } })
  if (!user || user.emailVerifiedAt) return { email: input.email }

  try {
    const token = await issueAuthToken(user.id, 'VERIFY_EMAIL')
    const nama = user.profile?.nama || input.email.split('@')[0] || 'Pengguna'
    await sendConfirmationEmail(input.email, nama, authLink(event, '/konfirmasi-email', token))
  } catch (error) {
    console.error('[auth] confirmation email failed:', error)
    releaseAuthEmail('confirm', input.email)
    throw createError({ statusCode: 502, statusMessage: 'Gagal mengirim ulang email, coba lagi sebentar' })
  }

  return { email: input.email }
})
