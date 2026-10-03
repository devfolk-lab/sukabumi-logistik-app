/**
 * The two Supavisor pooler connection strings, copied as-is from the Supabase
 * dashboard's "Connect" dialog into `NUXT_SUPABASE_DATABASE_URL` /
 * `NUXT_SUPABASE_DIRECT_URL`.
 *
 * The node-postgres callers strip any `sslmode` in favour of the pinned CA
 * (see `prisma.ts`), so the URLs never need editing after pasting.
 */
export interface SupabaseDatabaseUrls {
  /** Transaction pooler (6543), `NUXT_SUPABASE_DATABASE_URL` — the app's runtime connection. */
  transaction: string
  /** Session pooler (5432), `NUXT_SUPABASE_DIRECT_URL` — Prisma Migrate and one-shot scripts. */
  session: string
}

export function supabaseDatabaseUrls(env: NodeJS.ProcessEnv = process.env): SupabaseDatabaseUrls {
  return {
    transaction: required(env, 'NUXT_SUPABASE_DATABASE_URL'),
    session: required(env, 'NUXT_SUPABASE_DIRECT_URL')
  }
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim()
  if (!value) {
    throw new Error(`${name} is not set — copy .env.example to .env first`)
  }
  return value
}
