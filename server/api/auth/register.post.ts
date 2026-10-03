import { z } from 'zod'
import { authLink, readAuthBody, releaseAuthEmail, sendConfirmationEmail, throttleAuthEmail } from '../../utils/auth-mail'
import { issueAuthToken } from '../../utils/auth-tokens'
import { hashPassword } from '../../utils/password'
import { prisma } from '../../utils/prisma'
import { emailSchema, newPasswordSchema } from '../../utils/schemas'

const body = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(120, 'Nama terlalu panjang'),
  email: emailSchema,
  telp: z.string().trim().max(30, 'Nomor HP terlalu panjang').default(''),
  password: newPasswordSchema
})

/**
 * Creates the account unconfirmed, with its profile, and emails the
 * confirmation link. Nobody can sign in until the link is opened. If the email
 * does not go out, the account is deleted again so the address can simply
 * register once more.
 */
export default defineEventHandler(async (event) => {
  const input = await readAuthBody(event, body)

  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { emailVerifiedAt: true } })
  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: existing.emailVerifiedAt
        ? 'Email sudah terdaftar. Silakan masuk, atau atur ulang password jika lupa.'
        : 'Email sudah terdaftar tetapi belum dikonfirmasi. Cek email kamu atau kirim ulang link konfirmasi.'
    })
  }

  throttleAuthEmail('confirm', input.email)

  const passwordHash = await hashPassword(input.password)
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      profile: { create: { nama: input.nama, email: input.email, telp: input.telp || null } }
    }
  }).catch((error: unknown) => {
    releaseAuthEmail('confirm', input.email)
    // Two sign-ups for one address racing past the check above.
    if ((error as { code?: string }).code === 'P2002') {
      throw createError({ statusCode: 409, statusMessage: 'Email sudah terdaftar. Silakan masuk.' })
    }
    throw error
  })

  try {
    const token = await issueAuthToken(user.id, 'VERIFY_EMAIL')
    await sendConfirmationEmail(input.email, input.nama, authLink(event, '/konfirmasi-email', token))
  } catch (error) {
    console.error('[auth] confirmation email failed:', error)
    releaseAuthEmail('confirm', input.email)
    await prisma.user.delete({ where: { id: user.id } }).catch((deleteError: unknown) => {
      console.error('[auth] could not roll back unconfirmed user', user.id, deleteError)
    })
    throw createError({ statusCode: 502, statusMessage: 'Gagal mengirim email konfirmasi. Coba daftar lagi sebentar.' })
  }

  setResponseStatus(event, 201)
  return { email: input.email }
})
