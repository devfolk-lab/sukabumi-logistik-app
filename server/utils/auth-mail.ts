import type { H3Event } from 'h3'
import type { ZodType } from 'zod'
import { TOKEN_LIFETIME_TEXT } from './auth-tokens'
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

const BRAND = 'Sukabumi Logistik'

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** A single-button email laid out with tables, which every mail client renders. */
function layout(options: { heading: string, intro: string, button: string, link: string, outro: string }): string {
  const link = escapeHtml(options.link)
  return `<!doctype html>
<html lang="id"><body style="margin:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;color:#16202c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#002144;padding:20px 24px;color:#ffffff;font-size:18px;font-weight:bold">${BRAND}</td></tr>
<tr><td style="padding:28px 24px 8px">
<h1 style="margin:0 0 12px;font-size:20px;color:#002144">${escapeHtml(options.heading)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6">${escapeHtml(options.intro)}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:12px;background:#002144">
<a href="${link}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none">${escapeHtml(options.button)}</a>
</td></tr></table>
<p style="margin:24px 0 8px;font-size:13px;line-height:1.6;color:#5b6675">Jika tombol tidak berfungsi, salin tautan ini ke browser:</p>
<p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all"><a href="${link}" style="color:#1d6fb8">${link}</a></p>
<p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#5b6675">${escapeHtml(options.outro)}</p>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e5e9ef;font-size:12px;color:#8a94a3">Email ini dikirim otomatis oleh ${BRAND}. Mohon tidak membalas email ini.</td></tr>
</table>
</td></tr></table>
</body></html>`
}

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
