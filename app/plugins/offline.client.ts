/**
 * Boots the offline layer: seed the payload from disk before the first page
 * mounts, then keep the outbox moving.
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  await hydrateApiCache()

  const { drain, loadPending } = useOutbox()
  await loadPending()

  // Wait for the app to exist before firing requests that may raise toasts.
  nuxtApp.hook('app:mounted', () => {
    void drain()

    const online = useOnline()
    watch(online, (isOnline) => {
      if (isOnline) void drain()
    })
  })
})
