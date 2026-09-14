/**
 * Builds the Supavisor pooler connection strings from the Supabase settings
 * instead of keeping them as separate secrets. The project ref is the host
 * prefix of `NUXT_SUPABASE_URL`; the pooler host is not derivable from it
 * (region and `aws-N` prefix vary per project) so it stays an explicit setting,
 * copied from the dashboard's "Connect" dialog.
 *
 * Both URLs carry `sslmode=require` so they are byte-for-byte what Supabase
 * hands out: Prisma Migrate honours it directly, and the node-postgres callers
 * strip it in favour of the pinned CA (see `prisma.ts`).
 */
export interface SupabaseDatabaseUrls {
  /** Transaction pooler (6543) — the app's runtime connection. */
  transaction: string
  /** Session pooler (5432) — Prisma Migrate and one-shot scripts. */
  session: string
}

export function supabaseDatabaseUrls(env: NodeJS.ProcessEnv = process.env): SupabaseDatabaseUrls {
  const url = required(env, 'NUXT_SUPABASE_URL')
  const password = required(env, 'NUXT_SUPABASE_PASSWORD')
  const host = required(env, 'NUXT_SUPABASE_POOLER_HOST')

  const ref = new URL(url).hostname.split('.')[0]
  if (!ref) {
    throw new Error(`NUXT_SUPABASE_URL (${url}) does not look like https://<project-ref>.supabase.co`)
  }

  const credentials = `postgres.${ref}:${encodeURIComponent(password)}@${host}`

  return {
    transaction: `postgresql://${credentials}:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require`,
    session: `postgresql://${credentials}:5432/postgres?sslmode=require`
  }
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is not set — copy .env.example to .env first`)
  }
  return value
}
