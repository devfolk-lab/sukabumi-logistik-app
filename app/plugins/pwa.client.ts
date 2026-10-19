/**
 * `registerType: 'prompt'` means a new build waits instead of activating, so
 * the bundle is never swapped out from under an in-progress kirim wizard. The
 * user decides when to take it.
 *
 * `$pwa` comes from @vite-pwa/nuxt's own plugin, which is `enforce: 'post'`:
 * without `dependsOn` this one runs first, finds nothing, and no update or
 * offline-ready notice is ever shown.
 */
export default defineNuxtPlugin({
  name: 'suklog:pwa',
  dependsOn: ['vite-pwa:nuxt:client:plugin'],
  setup(nuxtApp) {
    const pwa = nuxtApp.$pwa
    if (!pwa) return

    const toast = useToast()

    watch(() => pwa.needRefresh, (needed) => {
      if (!needed) return

      toast.add({
        id: 'pwa-update',
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

    // Fires once, when the first service worker has precached the shell — the
    // moment the app genuinely works without a connection.
    watch(() => pwa.offlineReady, (ready) => {
      if (!ready) return
      toast.add({
        id: 'pwa-offline-ready',
        title: 'Siap dipakai offline',
        description: 'Riwayat, alamat, dan profil tetap bisa dibuka tanpa koneksi.',
        icon: 'i-lucide-cloud-check',
        color: 'success'
      })
    })

    // The browser only looks for a new service worker on a navigation, and an
    // installed app can stay open — or sit in the background — for days
    // without one. So check hourly while open, and whenever the app comes back
    // to the foreground (at most every 15 minutes). Offline, or while a new
    // worker is already installing, there is nothing to ask.
    let lastCheck = Date.now()
    const checkForUpdate = async (minAgeMs: number): Promise<void> => {
      const registration = pwa.getSWRegistration()
      if (!registration || registration.installing || !navigator.onLine) return
      if (Date.now() - lastCheck < minAgeMs) return
      lastCheck = Date.now()
      try {
        await registration.update()
      } catch {
        // Connection dropped mid-check: the next one tries again.
      }
    }

    setInterval(() => void checkForUpdate(0), 60 * 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') void checkForUpdate(15 * 60 * 1000)
    })

    // Browsers evict IndexedDB and the service worker caches under storage
    // pressure unless the origin is marked persistent — which would silently
    // wipe the offline copy and any queued writes. Only asked for once
    // installed: Chrome and Safari decide without a prompt, but Firefox shows a
    // permission dialog, which a plain browser tab should not get.
    nuxtApp.hook('app:mounted', () => {
      if (!pwa.isPWAInstalled || !navigator.storage?.persist) return
      void navigator.storage.persisted()
        .then(persisted => persisted || navigator.storage.persist())
        .catch(() => {})
    })
  }
})
