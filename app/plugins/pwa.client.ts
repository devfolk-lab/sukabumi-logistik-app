/**
 * `registerType: 'prompt'` means a new build waits instead of activating, so
 * the bundle is never swapped out from under an in-progress kirim wizard. The
 * user decides when to take it.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const pwa = nuxtApp.$pwa
  if (!pwa) return

  const toast = useToast()

  watch(() => pwa.needRefresh, (needed) => {
    if (!needed) return

    toast.add({
      title: 'Versi baru tersedia',
      description: 'Muat ulang untuk memakai versi terbaru.',
      icon: 'i-lucide-download',
      duration: 0,
      actions: [{
        label: 'Muat ulang',
        color: 'primary',
        variant: 'solid',
        onClick: () => {
          void pwa.updateServiceWorker(true)
        }
      }]
    })
  }, { immediate: true })
})
