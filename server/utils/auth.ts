import type { H3Event } from 'h3'
import { serverSupabaseClient } from '#supabase/server'
import type { Profile } from '../generated/prisma/client'
import { prisma } from './prisma'

/**
 * Verified sessions, keyed by access token. `@nuxtjs/supabase` builds a fresh
 * client per request, so without this every API call re-verifies the JWT
 * against Supabase over the network (JWKS fetch, or `getUser` for HS256
 * projects) and then upserts the profile — the home screen fires three such
 * calls at once. A token is trusted for at most `SESSION_TTL` and never past
 * its own `exp`; a profile edit drops the entry via `forgetProfile`.
 */
interface CachedSession {
  profile: Profile
  expiresAt: number
}

const SESSION_TTL = 5 * 60 * 1000
const MAX_SESSIONS = 1000

const sessions = new Map<string, CachedSession>()

function remember(token: string, entry: CachedSession): void {
  if (sessions.size >= MAX_SESSIONS) {
    const oldest = sessions.keys().next().value
    if (oldest !== undefined) sessions.delete(oldest)
  }
  sessions.set(token, entry)
}

/** Drops cached copies of a profile so the next request re-reads it. */
export function forgetProfile(id: string): void {
  for (const [token, entry] of sessions) {
    if (entry.profile.id === id) sessions.delete(token)
  }
}

/**
 * Resolves the Supabase session into a local `Profile`, creating it on first
 * use. Identity is owned by Supabase Auth; everything else hangs off this row.
 *
 * `getClaims` returns decoded JWT *claims*, not a `User` — the id lives in
 * `sub`, and `claims` carries an index signature, so reading `.id` here would
 * typecheck and silently be undefined.
 */
export async function requireProfile(event: H3Event): Promise<Profile> {
  const unauthorized = () => createError({ statusCode: 401, statusMessage: 'Silakan masuk terlebih dahulu' })

  const client = await serverSupabaseClient(event)

  // Reads the cookie-backed session without a network call (a refresh only
  // happens once the access token has actually expired).
  const { data: { session } } = await client.auth.getSession().catch(() => ({ data: { session: null } }))
  const token = session?.access_token
  if (!token) throw unauthorized()

  const cached = sessions.get(token)
  if (cached && cached.expiresAt > Date.now()) return cached.profile

  const { data, error } = await client.auth.getClaims(token).catch(() => ({ data: null, error: true }))
  const claims = error ? null : data?.claims
  const id = claims?.sub
  if (!claims || !id) throw unauthorized()

  const meta = (claims.user_metadata ?? {}) as { nama?: string, telp?: string }
  const email = claims.email ?? ''

  const profile = await prisma.profile.upsert({
    where: { id },
    update: { email },
    create: {
      id,
      email,
      nama: meta.nama?.trim() || email.split('@')[0] || 'Pengguna',
      telp: meta.telp ?? null
    }
  })

  const tokenExpiry = typeof claims.exp === 'number' ? claims.exp * 1000 : Infinity
  remember(token, { profile, expiresAt: Math.min(Date.now() + SESSION_TTL, tokenExpiry) })

  return profile
}
