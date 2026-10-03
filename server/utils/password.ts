import bcrypt from 'bcryptjs'

/**
 * bcrypt at cost 10 — the scheme and cost Supabase Auth used, so the hashes
 * imported from `auth.users` (`$2a$10$…`) verify unchanged.
 */
const ROUNDS = 10

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS)
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

let dummyHash: string | undefined

/**
 * Burns the same time as a real check when the email is unknown, so response
 * timing does not reveal which addresses have accounts.
 */
export async function verifyAgainstNothing(password: string): Promise<false> {
  dummyHash ??= await bcrypt.hash('no-such-account', ROUNDS)
  await bcrypt.compare(password, dummyHash)
  return false
}
