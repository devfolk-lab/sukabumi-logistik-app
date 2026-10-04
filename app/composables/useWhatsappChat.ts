/**
 * Chat links to the team's WhatsApp (`NUXT_PUBLIC_HELP_WHATSAPP`), with the
 * message already typed. `wa.me` hands off to the app on a phone and to
 * WhatsApp Web elsewhere. `url()` is undefined when no number is configured.
 */
export function useWhatsappChat() {
  const number = String(useRuntimeConfig().public.helpWhatsapp ?? '').replace(/\D/g, '')

  return {
    available: Boolean(number),
    url: (text: string): string | undefined =>
      number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : undefined
  }
}
