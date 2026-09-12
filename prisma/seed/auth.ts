import type { PrismaClient } from '../../server/generated/prisma/client.js'

/**
 * Seeds identities straight into Supabase's `auth` schema.
 *
 * The app never writes here — `prisma/schema.prisma` owns `public` and Supabase
 * Auth owns `auth` — but a seeder has to, because every other route into a
 * usable account goes through a check we explicitly want to skip:
 *
 *   - `/auth/v1/signup` obeys the project's "allow new users" switch and its
 *     per-hour email rate limit;
 *   - a freshly signed-up user is stuck behind email confirmation until they
 *     click a link that goes to a mailbox nobody owns;
 *   - the Admin API would sidestep both, but needs a service-role key, and this
 *     project only ships the publishable key (see `.env.example`).
 *
 * Writing the row directly needs none of that. Passwords are hashed with the
 * same bcrypt GoTrue verifies against, so `signInWithPassword` on `/login`
 * works with no further setup.
 */

/** GoTrue stamps every row in a single-tenant project with the nil UUID. */
const INSTANCE_ID = '00000000-0000-0000-0000-000000000000'

export interface AuthUserInput {
  /** Preferred id. An account already holding this email keeps its own id. */
  id: string
  email: string
  password: string
  nama: string
  telp: string
}

/**
 * Locates `crypt()`/`gen_salt()`. Supabase installs pgcrypto into `extensions`,
 * a plain Postgres usually into `public`, and neither is guaranteed to be on the
 * connection's `search_path`, so the schema gets resolved and qualified.
 */
async function cryptSchema(prisma: PrismaClient): Promise<string> {
  const lookup = `select n.nspname
                    from pg_proc p
                    join pg_namespace n on n.oid = p.pronamespace
                   where p.proname = 'crypt'
                   order by (n.nspname = 'extensions') desc
                   limit 1`

  let found = await prisma.$queryRawUnsafe<{ nspname: string }[]>(lookup)

  if (!found[0]) {
    await prisma.$executeRawUnsafe('create schema if not exists extensions')
    await prisma.$executeRawUnsafe('create extension if not exists pgcrypto with schema extensions')
    found = await prisma.$queryRawUnsafe<{ nspname: string }[]>(lookup)
  }

  const schema = found[0]?.nspname

  if (!schema) {
    throw new Error('pgcrypto is unavailable, so passwords cannot be hashed')
  }

  // Interpolated below rather than bound, so refuse anything that is not a bare
  // identifier. pg_namespace only ever yields one, but the check is free.
  if (!/^[a-z_][a-z0-9_$]*$/i.test(schema)) {
    throw new Error(`Refusing to interpolate schema name: ${schema}`)
  }

  return schema
}

/**
 * Creates or resets one login and returns the `auth.users.id` that backs it —
 * the same value `Profile.id` mirrors.
 */
export async function upsertAuthUser(prisma: PrismaClient, input: AuthUserInput): Promise<string> {
  const schema = await cryptSchema(prisma)
  const email = input.email.trim().toLowerCase()

  // `auth.users` carries a unique index on email, so an id-keyed upsert alone
  // would collide with an account that already owns this address under another
  // id. Reuse that row instead; re-running the seeder must not fail.
  const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
    'select id::text as id from auth.users where email = $1 limit 1',
    email
  )

  const id = existing[0]?.id ?? input.id

  const appMeta = JSON.stringify({ provider: 'email', providers: ['email'] })
  const userMeta = JSON.stringify({
    sub: id,
    email,
    email_verified: true,
    phone_verified: false,
    // `requireProfile` reads these two off the JWT to build the Profile row.
    nama: input.nama,
    telp: input.telp
  })

  // These four columns are nullable in Postgres but land in plain Go `string`
  // fields when GoTrue reads the row back, so a NULL turns every sign-in into
  // "Database error querying schema". Real signups write '' — so does this.
  await prisma.$executeRawUnsafe(
    `insert into auth.users as u (
       instance_id, id, aud, role,
       email, encrypted_password, email_confirmed_at,
       raw_app_meta_data, raw_user_meta_data,
       confirmation_token, recovery_token, email_change_token_new, email_change,
       created_at, updated_at, is_sso_user, is_anonymous
     ) values (
       $1::uuid, $2::uuid, 'authenticated', 'authenticated',
       $3, ${schema}.crypt($4, ${schema}.gen_salt('bf', 10)), now(),
       $5::jsonb, $6::jsonb,
       '', '', '', '',
       now(), now(), false, false
     )
     on conflict (id) do update set
       email = excluded.email,
       encrypted_password = excluded.encrypted_password,
       -- Confirming here is the point: the link would go to a dead mailbox.
       email_confirmed_at = coalesce(u.email_confirmed_at, now()),
       raw_app_meta_data = excluded.raw_app_meta_data,
       raw_user_meta_data = excluded.raw_user_meta_data,
       confirmation_token = coalesce(u.confirmation_token, ''),
       recovery_token = coalesce(u.recovery_token, ''),
       email_change_token_new = coalesce(u.email_change_token_new, ''),
       email_change = coalesce(u.email_change, ''),
       banned_until = null,
       deleted_at = null,
       updated_at = now()`,
    INSTANCE_ID, id, email, input.password, appMeta, userMeta
  )

  // GoTrue keys the email provider's identity on the user's own id, not the
  // address, and derives `auth.identities.email` from `identity_data`.
  await prisma.$executeRawUnsafe(
    `insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
     values ($1, $2::uuid, $3::jsonb, 'email', now(), now())
     on conflict (provider_id, provider) do update set
       user_id = excluded.user_id,
       identity_data = excluded.identity_data,
       updated_at = now()`,
    id, id, JSON.stringify({ sub: id, email, email_verified: true, phone_verified: false })
  )

  return id
}

/**
 * Signs in for real against GoTrue. Writing the row is not proof the row works —
 * a password the login page rejects is the one failure this seeder exists to
 * rule out, so it is worth the round trip.
 */
export async function verifyPasswordLogin(email: string, password: string): Promise<void> {
  const base = process.env.NUXT_SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.NUXT_SUPABASE_KEY

  if (!base || !key) {
    throw new Error('NUXT_SUPABASE_URL / NUXT_SUPABASE_KEY are not set, cannot verify the login')
  }

  const response = await fetch(`${base}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`GoTrue rejected ${email} (HTTP ${response.status}): ${body}`)
  }
}
