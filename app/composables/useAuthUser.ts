import type { Role, SessionUser } from '~/types'

/**
 * Who is signed in. The session itself is an httpOnly cookie the page cannot
 * read, so the client learns this from `/api/auth/session` and keeps a copy in
 * localStorage: a cold start offline must still know whose cached data it may
 * show. The copy is only a hint for the UI — the server checks the cookie on
 * every request.
 */

const SNAPSHOT_KEY = 'suklog:user'

const ROLES: readonly Role[] = ['USER', 'ADMIN', 'SUPERADMIN']

export function useAuthUser() {
  return useState<SessionUser | null>('auth:user', () => null)
}

export function setAuthUser(user: SessionUser | null): void {
  useAuthUser().value = user
  try {
    if (user) localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(user))
    else localStorage.removeItem(SNAPSHOT_KEY)
  } catch {
    // Storage blocked (private mode): the in-memory state still works.
  }
}

export function readAuthSnapshot(): SessionUser | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    const parsed = raw ? JSON.parse(raw) as Partial<SessionUser> : null
    return parsed && typeof parsed.id === 'string' && typeof parsed.email === 'string'
      ? {
          id: parsed.id,
          email: parsed.email,
          nama: String(parsed.nama ?? ''),
          // A copy from before roles existed reads as a customer until the
          // server's answer arrives.
          role: ROLES.includes(parsed.role as Role) ? parsed.role as Role : 'USER'
        }
      : null
  } catch {
    return null
  }
}

/** Pages anyone may open; everything else needs a signed-in account. */
const PUBLIC_ROUTES = [/^\/login\/?$/, /^\/register(\/|$)/, /^\/konfirmasi-email\/?$/, /^\/lupa-password(\/|$)/, /^\/reset-password(\/|$)/]

export function isPublicRoute(path: string): boolean {
  return PUBLIC_ROUTES.some(pattern => pattern.test(path))
}

/**
 * A 401 from the API means the session ended elsewhere (expired, signed out
 * on another device, password changed). Forget the account and go to login.
 */
export function handleUnauthorized(error: unknown): void {
  const status = (error as { statusCode?: number, status?: number })?.statusCode ?? (error as { status?: number })?.status
  if (status !== 401 || !useAuthUser().value) return
  setAuthUser(null)
  clearApiCache()
  const path = useRouter().currentRoute.value.path
  if (!isPublicRoute(path)) void navigateTo('/login', { replace: true })
}
