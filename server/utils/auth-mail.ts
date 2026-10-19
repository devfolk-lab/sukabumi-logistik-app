import type { H3Event } from 'h3'
import type { ZodType } from 'zod'
import { TOKEN_LIFETIME_TEXT } from './auth-tokens'
import { MAIL_BRAND, mailLayout } from './mail'
import { rateLimit, resetRateLimit } from './rate-limit'

/**
 * Account emails (sign-up confirmation, password reset), sent through
 * `useNodeMailer()`. Each carries a one-time token from `auth-tokens.ts`; the
 * link opens our own page, which hands the token back to `/api/auth/*`.
 */

/** Parses a JSON body, answering with the first Indonesian validation message. */
export async function readAuthBody<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  const result = schema.safeParse(await readBody(event).catch(() => null))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: result.error.issues[0]?.message || 'Data tidak valid' })
  }
  return result.data
}

/**
 * Links are built from the configured site URL, never from the request's Host
 * header: a forged Host would otherwise send a victim's reset token to a site
 * the attacker controls.
 */
export function authLink(event: H3Event, path: string, token: string): string {
  const base = useRuntimeConfig(event).public.siteUrl.replace(/\/+$/, '')
  return `${base}${path}?token=${encodeURIComponent(token)}`
}

/**
 * One email per address per minute, per kind, so these routes cannot be used
 * to flood an inbox.
 */
export function throttleAuthEmail(kind: 'confirm' | 'reset', email: string): void {
  rateLimit(`email:${kind}:${email}`, 1, 60 * 1000)
}

/** Lets the address ask again right away, e.g. after the send itself failed. */
export function releaseAuthEmail(kind: 'confirm' | 'reset', email: string): void {
  resetRateLimit(`email:${kind}:${email}`)
}

const BRAND = MAIL_BRAND
const layout = mailLayout

export async function sendConfirmationEmail(to: string, nama: string, link: string): Promise<void> {
  const { sendMail } = useNodeMailer()
  const intro = `Halo ${nama}, terima kasih sudah mendaftar di ${BRAND}. Konfirmasi alamat email kamu untuk mengaktifkan akun dan mulai mengirim paket.`
  const outro = `Tautan ini berlaku ${TOKEN_LIFETIME_TEXT.VERIFY_EMAIL} dan hanya bisa dipakai sekali. Jika kamu tidak merasa mendaftar, abaikan email ini.`
  await sendMail({
    to,
    subject: `Konfirmasi email akun ${BRAND}`,
    text: `${intro}\n\nKonfirmasi email: ${link}\n\n${outro}`,
    html: layout({ heading: 'Konfirmasi email kamu', intro, button: 'Konfirmasi Email', link, outro })
  })
}

export async function sendResetPasswordEmail(to: string, link: string): Promise<void> {
  const { sendMail } = useNodeMailer()
  const intro = `Kami menerima permintaan untuk mengatur ulang password akun ${BRAND} kamu. Klik tombol di bawah untuk membuat password baru.`
  const outro = `Tautan ini berlaku ${TOKEN_LIFETIME_TEXT.RESET_PASSWORD} dan hanya bisa dipakai sekali. Jika kamu tidak meminta reset password, abaikan email ini; password kamu tidak berubah.`
  await sendMail({
    to,
    subject: `Atur ulang password ${BRAND}`,
    text: `${intro}\n\nAtur ulang password: ${link}\n\n${outro}`,
    html: layout({ heading: 'Atur ulang password', intro, button: 'Buat Password Baru', link, outro })
  })
}
