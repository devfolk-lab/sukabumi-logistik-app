import type { SessionUser } from '~/types'

/**
 * Settles who is signed in before the first route resolves. Named `00.` so it
 * runs before `offline.client.ts`, whose cache hydration checks the owner.
 *
 * With a stored copy of the account the app starts on it immediately (and can
 * start offline) while the server confirms in the background. Without one,
 * the first redirect depends on the answer, so it is awaited.
 */
export default defineNuxtPlugin(async (nuxtApp) => {
  const snapshot = readAuthSnapshot()

  async function verify(): Promise<void> {
    let current: SessionUser | null
    try {
      current = (await $fetch<{ user: SessionUser | null }>('/api/auth/session')).user
    } catch {
      // Offline or the server is down: keep whatever we had. API calls are
      // checked by the server anyway.
      return
    }

    await nuxtApp.runWithContext(async () => {
      const previous = useAuthUser().value
      // Another account (or none) owns this browser now: its cache must go.
      if (previous && previous.id !== current?.id) clearApiCache()
      setAuthUser(current)

      if (!current && !isPublicRoute(nuxtApp.$router.currentRoute.value.path)) {
        await navigateTo('/login', { replace: true })
      }
    })
  }

  if (snapshot) {
    useAuthUser().value = snapshot
    void verify()
  } else {
    await verify()
  }
})
