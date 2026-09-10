import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

// Migrations run against the Supavisor *session* pooler (5432); the transaction
// pooler on 6543 cannot hold the advisory locks Prisma Migrate needs.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations'
  },
  datasource: {
    url: env('DIRECT_URL')
  }
})
