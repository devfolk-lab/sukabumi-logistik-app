import 'dotenv/config'
import { defineConfig } from 'prisma/config'
import { supabaseDatabaseUrls } from './server/utils/supabase-db'

// Migrations run against the Supavisor *session* pooler (5432); the transaction
// pooler on 6543 cannot hold the advisory locks Prisma Migrate needs.
//
// `prisma generate` (run by postinstall, including in CI where there is no
// `.env`) needs no database, so the URL is only resolved once the Supabase
// settings are present. Migrate and seed refuse to run without a datasource.
const datasource = process.env.NUXT_SUPABASE_PASSWORD
  ? { url: supabaseDatabaseUrls().session }
  : undefined

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // tsx rather than bare `node`: the generated Prisma client imports its own
    // modules with `.js` specifiers that only exist as `.ts`, which Node's
    // built-in type stripping does not resolve.
    seed: 'tsx prisma/seed.ts'
  },
  datasource
})
