/**
 * The one email template every message we send uses: brand header, heading,
 * intro, an optional table of details, a single button with its link spelled
 * out underneath, and an outro. Laid out with tables, which every mail client
 * renders.
 */

export const MAIL_BRAND = 'Sukabumi Logistik'

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function mailLayout(options: {
  heading: string
  intro: string
  /** Label/value rows shown between the intro and the button. */
  details?: [string, string][]
  button: string
  link: string
  outro: string
}): string {
  const link = escapeHtml(options.link)
  const details = options.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid #e5e9ef;border-radius:12px;border-collapse:separate;font-size:14px">
${options.details.map(([label, value], index) => `<tr><td style="padding:10px 14px;color:#5b6675;white-space:nowrap;vertical-align:top${index ? ';border-top:1px solid #e5e9ef' : ''}">${escapeHtml(label)}</td><td style="padding:10px 14px;font-weight:bold;text-align:right${index ? ';border-top:1px solid #e5e9ef' : ''}">${escapeHtml(value)}</td></tr>`).join('\n')}
</table>`
    : ''
  return `<!doctype html>
<html lang="id"><body style="margin:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;color:#16202c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#002144;padding:20px 24px;color:#ffffff;font-size:18px;font-weight:bold">${MAIL_BRAND}</td></tr>
<tr><td style="padding:28px 24px 8px">
<h1 style="margin:0 0 12px;font-size:20px;color:#002144">${escapeHtml(options.heading)}</h1>
<p style="margin:0 0 24px;font-size:15px;line-height:1.6">${escapeHtml(options.intro)}</p>
${details}
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:12px;background:#002144">
<a href="${link}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none">${escapeHtml(options.button)}</a>
</td></tr></table>
<p style="margin:24px 0 8px;font-size:13px;line-height:1.6;color:#5b6675">Jika tombol tidak berfungsi, salin tautan ini ke browser:</p>
<p style="margin:0 0 24px;font-size:12px;line-height:1.5;word-break:break-all"><a href="${link}" style="color:#1d6fb8">${link}</a></p>
<p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#5b6675">${escapeHtml(options.outro)}</p>
</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #e5e9ef;font-size:12px;color:#8a94a3">Email ini dikirim otomatis oleh ${MAIL_BRAND}. Mohon tidak membalas email ini.</td></tr>
</table>
</td></tr></table>
</body></html>`
}
