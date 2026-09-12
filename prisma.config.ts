import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

// Migrations run against the Supavisor *session* pooler (5432); the transaction
// pooler on 6543 cannot hold the advisory locks Prisma Migrate needs.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // tsx rather than bare `node`: the generated Prisma client imports its own
    // modules with `.js` specifiers that only exist as `.ts`, which Node's
    // built-in type stripping does not resolve.
    seed: 'tsx prisma/seed.ts'
  },
  datasource: {
    url: env('DIRECT_URL')
  }
})
