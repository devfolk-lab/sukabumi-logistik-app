/**
 * "Pasang aplikasi", shared by the home card and the settings page.
 *
 * Chromium browsers fire `beforeinstallprompt`, which @vite-pwa/nuxt captures
 * into `$pwa.showInstallPrompt` (`client.installPrompt` in nuxt.config.ts) so
 * the app can offer it at a moment of its own choosing. iOS has no such event
 * — installing is always the user's own trip through the Share sheet — so
 * there the button opens instructions instead (`AppIosInstallDialog`).
 */

const DISMISS_KEY = 'suklog:install-card-dismissed'

// Module scope: dismissing on one screen hides the card everywhere at once.
const dismissed = ref(readDismissed())
const showIosInstall = ref(false)

function readDismissed(): boolean {
  if (!import.meta.client) return false
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function useInstallApp() {
  const { $pwa } = useNuxtApp()

  // iPadOS 13+ reports itself as a Mac; a touchscreen gives it away.
  const isIos = import.meta.client && (
    /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (/macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  )

  /** Whether there is anything to offer: not installed yet, and a way to do it. */
  const canInstall = computed(() => {
    if (!$pwa || $pwa.isPWAInstalled) return false
    return Boolean($pwa.showInstallPrompt) || isIos
  })

  async function install(): Promise<void> {
    if (isIos) {
      showIosInstall.value = true
      return
    }
    await $pwa?.install()
  }

  /**
   * Hides the home card for good. Deliberately not `$pwa.cancelInstall()`:
   * that drops the captured prompt, and the settings page should still be
   * able to install later.
   */
  function dismiss(): void {
    dismissed.value = true
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Storage blocked: hidden for this session only.
    }
  }

  return { canInstall, isIos, install, dismissed, dismiss, showIosInstall }
}
