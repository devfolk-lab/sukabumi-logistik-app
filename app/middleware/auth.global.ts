/**
 * Sends signed-out visitors to /login from every page that is not public, and
 * customers away from the admin menus. The role here only hides pages; every
 * admin route checks it again on the server.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (isPublicRoute(to.path)) return
  const user = useAuthUser().value
  if (!user) return navigateTo('/login', { replace: true })

  if (/^\/admin\/pengguna(\/|$)/.test(to.path) && !canManageStaff(user.role)) return navigateTo('/', { replace: true })
  if (/^\/admin(\/|$)/.test(to.path) && !canApproveOrders(user.role)) return navigateTo('/', { replace: true })
})
