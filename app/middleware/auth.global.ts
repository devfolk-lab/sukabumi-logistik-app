/** Sends signed-out visitors to /login from every page that is not public. */
export default defineNuxtRouteMiddleware((to) => {
  if (isPublicRoute(to.path)) return
  if (!useAuthUser().value) return navigateTo('/login', { replace: true })
})
