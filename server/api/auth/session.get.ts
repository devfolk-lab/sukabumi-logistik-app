import type { SessionUser } from '#shared/types'
import { resolveSession, toSessionUser } from '../../utils/auth'

/**
 * Who this cookie belongs to, or `null`. Always 200, because "signed out" is
 * an answer here rather than an error; the client checks it on every launch.
 */
export default defineEventHandler(async (event): Promise<{ user: SessionUser | null }> => {
  const auth = await resolveSession(event)
  return { user: auth ? toSessionUser(auth.profile) : null }
})
