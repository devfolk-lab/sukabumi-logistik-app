import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import { SUPABASE_ROOT_CA } from './supabase-ca'

// Nitro can re-evaluate modules in dev; cache on globalThis so HMR does not
// open a new pool on every reload.
declare global {
  var __prisma: PrismaClient | undefined
}

function createClient(): PrismaClient {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }

  // node-postgres parses `sslmode` out of the connection string and that parsed
  // value wins over an explicit `ssl` object, which would silently discard the
  // CA below and fail with SELF_SIGNED_CERT_IN_CHAIN. Drop it and configure TLS
  // here instead, so Supabase URLs stay copy-pasteable as-is.
  const connectionString = url.replace(/([?&])sslmode=[^&]*&?/g, '$1').replace(/[?&]$/, '')

  const adapter = new PrismaPg({
    connectionString,
    ssl: { ca: SUPABASE_ROOT_CA, rejectUnauthorized: true }
  })

  return new PrismaClient({ adapter })
}

export const prisma: PrismaClient = globalThis.__prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}
