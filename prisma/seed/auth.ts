import bcrypt from 'bcryptjs'
import type { PrismaClient } from '../../server/generated/prisma/client.js'

/**
 * Seeds logins into `users`, confirmed, so they work on `/login` straight away
 * with no confirmation email. Hashed exactly as `server/utils/password.ts` does
 * (bcrypt, cost 10), which is what the login route verifies.
 */

const ROUNDS = 10

export interface AuthUserInput {
  /** Preferred id. An account already holding this email keeps its own id. */
  id: string
  email: string
  password: string
  role: 'USER' | 'ADMIN' | 'SUPERADMIN'
}

/** Creates or resets one login and returns the user id `Profile.id` must use. */
export async function upsertAuthUser(prisma: PrismaClient, input: AuthUserInput): Promise<string> {
  const email = input.email.trim().toLowerCase()
  const passwordHash = await bcrypt.hash(input.password, ROUNDS)

  // Email is unique, so an account that already owns this address (an imported
  // one, say) is reused under its own id rather than colliding with it.
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  const id = existing?.id ?? input.id

  await prisma.user.upsert({
    where: { id },
    update: { email, passwordHash, emailVerifiedAt: new Date(), role: input.role },
    create: { id, email, passwordHash, emailVerifiedAt: new Date(), role: input.role }
  })

  // A reseeded password should not leave old devices signed in.
  await prisma.session.deleteMany({ where: { userId: id } })

  return id
}

/**
 * Reads the stored hash back and checks the password against it, the same
 * comparison the login route makes. Writing the row is not proof the row
 * works; a login the page rejects is the one failure this seeder exists to
 * rule out.
 */
export async function verifyPasswordLogin(prisma: PrismaClient, email: string, password: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
  if (!user || !user.emailVerifiedAt || !await bcrypt.compare(password, user.passwordHash)) {
    throw new Error(`Login for ${email} does not verify against the stored hash`)
  }
}
