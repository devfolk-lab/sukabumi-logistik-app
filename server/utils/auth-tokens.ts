import { createHash, randomBytes } from 'node:crypto'
import type { AuthTokenType } from '../generated/prisma/client'
import { prisma } from './prisma'

/** 256 random bits, URL-safe: session cookies and emailed links both use these. */
export function newToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Tokens are stored only as their SHA-256, so the tables cannot be replayed. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

const LIFETIME_MS: Record<AuthTokenType, number> = {
  VERIFY_EMAIL: 24 * 60 * 60 * 1000,
  RESET_PASSWORD: 60 * 60 * 1000
}

/** Human wording of each lifetime, for the emails. */
export const TOKEN_LIFETIME_TEXT: Record<AuthTokenType, string> = {
  VERIFY_EMAIL: '24 jam',
  RESET_PASSWORD: '1 jam'
}

/** Mints a link token. Any earlier unused token of the same type stops working. */
export async function issueAuthToken(userId: string, type: AuthTokenType): Promise<string> {
  const token = newToken()
  await prisma.$transaction([
    prisma.authToken.deleteMany({ where: { userId, type } }),
    prisma.authToken.create({
      data: { id: hashToken(token), userId, type, expiresAt: new Date(Date.now() + LIFETIME_MS[type]) }
    })
  ])
  return token
}

/** Whether the token would be accepted right now, without spending it. */
export async function isAuthTokenValid(token: string, type: AuthTokenType): Promise<boolean> {
  const row = await prisma.authToken.findUnique({ where: { id: hashToken(token) } })
  return Boolean(row && row.type === type && row.expiresAt > new Date())
}

/**
 * Spends a token and returns its user id, or null when it is unknown, of
 * another type, expired, or already spent. The delete is the claim: of two
 * concurrent redemptions only one deletes the row, so only one succeeds.
 */
export async function consumeAuthToken(token: string, type: AuthTokenType): Promise<string | null> {
  const id = hashToken(token)
  const row = await prisma.authToken.findUnique({ where: { id } })
  if (!row || row.type !== type) return null

  const { count } = await prisma.authToken.deleteMany({ where: { id } })
  if (count === 0 || row.expiresAt <= new Date()) return null

  return row.userId
}
