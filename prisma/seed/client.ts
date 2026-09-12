import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../server/generated/prisma/client.js'
import { SUPABASE_ROOT_CA } from '../../server/utils/supabase-ca.js'

/**
 * Prisma client for one-shot scripts.
 *
 * Mirrors `server/utils/prisma.ts`, with one deliberate difference: it connects
 * through `DIRECT_URL` (session pooler, 5432). Seeding is a burst of writes plus
 * raw SQL against the `auth` schema, which is not what the transaction pooler on
 * 6543 is for.
 */
export function seedClient(): PrismaClient {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL

  if (!url) {
    throw new Error('DIRECT_URL is not set — copy .env.example to .env first')
  }

  // node-postgres parses `sslmode` out of the connection string and that parsed
  // value wins over an explicit `ssl` object, which would silently discard the
  // pinned CA and fail with SELF_SIGNED_CERT_IN_CHAIN. Drop it and configure TLS
  // here instead, so Supabase URLs stay copy-pasteable as-is.
  const connectionString = url.replace(/([?&])sslmode=[^&]*&?/g, '$1').replace(/[?&]$/, '')

  const adapter = new PrismaPg({
    connectionString,
    ssl: { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true }
  })

  return new PrismaClient({ adapter })
}
