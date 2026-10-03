import type { H3Event } from 'h3'
import type { SessionUser } from '#shared/types'
import type { Profile, User } from '../generated/prisma/client'
import { hashToken, newToken } from './auth-tokens'
import { prisma } from './prisma'

/**
 * Sessions are rows in `sessions`, keyed by the SHA-256 of a random token that
 * lives only in an httpOnly cookie. Logging out, resetting a password or
 * changing it deletes rows, which signs those devices out on their next
 * request.
 */

const COOKIE = 'suklog_session'
const SESSION_MS = 30 * 24 * 60 * 60 * 1000
/** A session used with less than this left is extended back to a full term. */
const RENEW_MS = 15 * 24 * 60 * 60 * 1000

/**
 * Resolved sessions, keyed by session id, so the three requests the home screen
 * fires at once do not each hit the database. An entry lives `CACHE_TTL` at
 * most; revoking a session drops it here immediately, but another server
 * instance may honour it until its own copy expires.
 */
interface CachedSession {
  profile: Profile
  userId: string
  cachedUntil: number
}

const CACHE_TTL = 60 * 1000
const MAX_CACHED = 1000
const cache = new Map<string, CachedSession>()

function remember(id: string, entry: CachedSession): void {
  if (cache.size >= MAX_CACHED) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(id, entry)
}

/** Drops cached copies of a profile so the next request re-reads it. */
export function forgetProfile(id: string): void {
  for (const [key, entry] of cache) {
    if (entry.profile.id === id) cache.delete(key)
  }
}

function setSessionCookie(event: H3Event, token: string, expires: Date): void {
  setCookie(event, COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/',
    expires
  })
}

/** Signs the user in on this device: a new session row plus its cookie. */
export async function startSession(event: H3Event, userId: string): Promise<void> {
  const token = newToken()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + SESSION_MS)

  await prisma.session.create({
    data: {
      id: hashToken(token),
      userId,
      expiresAt,
      userAgent: getRequestHeader(event, 'user-agent')?.slice(0, 300) ?? null
    }
  })
  // Housekeeping: this user's expired sessions are dead weight.
  await prisma.session.deleteMany({ where: { userId, expiresAt: { lt: now } } })

  setSessionCookie(event, token, expiresAt)
}

/** Signs this device out. Safe to call without a session. */
export async function endSession(event: H3Event): Promise<void> {
  const token = getCookie(event, COOKIE)
  deleteCookie(event, COOKIE, { path: '/' })
  if (!token) return

  const id = hashToken(token)
  cache.delete(id)
  await prisma.session.deleteMany({ where: { id } })
}

/** Signs out every device of `userId`, except the session `keepId` if given. */
export async function revokeSessions(userId: string, keepId?: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId, ...(keepId ? { id: { not: keepId } } : {}) } })
  for (const [key, entry] of cache) {
    if (entry.userId === userId && key !== keepId) cache.delete(key)
  }
}

export interface AuthContext {
  sessionId: string
  profile: Profile
}

/** The signed-in account behind this request's cookie, or null. */
export async function resolveSession(event: H3Event): Promise<AuthContext | null> {
  const token = getCookie(event, COOKIE)
  if (!token) return null

  const id = hashToken(token)
  const cached = cache.get(id)
  if (cached && cached.cachedUntil > Date.now()) return { sessionId: id, profile: cached.profile }

  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: { include: { profile: true } } }
  })

  const now = Date.now()
  if (!session || session.expiresAt.getTime() <= now) {
    cache.delete(id)
    deleteCookie(event, COOKIE, { path: '/' })
    if (session) await prisma.session.deleteMany({ where: { id } })
    return null
  }

  // Active use keeps a session alive; an idle one runs out after 30 days.
  if (session.expiresAt.getTime() - now < RENEW_MS) {
    const expiresAt = new Date(now + SESSION_MS)
    await prisma.session.update({ where: { id }, data: { expiresAt } })
    setSessionCookie(event, token, expiresAt)
  }

  const profile = session.user.profile ?? await createProfile(session.user)
  remember(id, { profile, userId: session.userId, cachedUntil: now + CACHE_TTL })

  return { sessionId: id, profile }
}

/** Accounts always get a profile at sign-up; this only covers one that lost it. */
function createProfile(user: User): Promise<Profile> {
  return prisma.profile.upsert({
    where: { id: user.id },
    update: {},
    create: { id: user.id, email: user.email, nama: user.email.split('@')[0] || 'Pengguna' }
  })
}

/** Guards every user-scoped route: the caller's profile, or 401. */
export async function requireProfile(event: H3Event): Promise<Profile> {
  const auth = await resolveSession(event)
  if (!auth) throw createError({ statusCode: 401, statusMessage: 'Silakan masuk terlebih dahulu' })
  return auth.profile
}

export function toSessionUser(profile: Pick<Profile, 'id' | 'email' | 'nama'>): SessionUser {
  return { id: profile.id, email: profile.email, nama: profile.nama }
}
