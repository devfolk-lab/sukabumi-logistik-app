import type { H3Event } from 'h3'
import { serverSupabaseUser } from '#supabase/server'
import { prisma } from './prisma'

/**
 * Resolves the Supabase session into a local `Profile`, creating it on first
 * use. Identity is owned by Supabase Auth; everything else hangs off this row.
 *
 * `serverSupabaseUser` returns decoded JWT *claims*, not a `User` — the id
 * lives in `sub`, and `claims` carries an index signature, so reading `.id`
 * here would typecheck and silently be undefined.
 */
export async function requireProfile(event: H3Event) {
  const claims = await serverSupabaseUser(event).catch(() => null)
  const id = claims?.sub

  if (!id) {
    throw createError({ statusCode: 401, statusMessage: 'Silakan masuk terlebih dahulu' })
  }

  const meta = (claims.user_metadata ?? {}) as { nama?: string, telp?: string }
  const email = claims.email ?? ''

  return prisma.profile.upsert({
    where: { id },
    update: { email },
    create: {
      id,
      email,
      nama: meta.nama?.trim() || email.split('@')[0] || 'Pengguna',
      telp: meta.telp ?? null
    }
  })
}
