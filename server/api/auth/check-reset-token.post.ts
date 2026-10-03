import { z } from 'zod'
import { readAuthBody } from '../../utils/auth-mail'
import { isAuthTokenValid } from '../../utils/auth-tokens'
import { linkTokenSchema } from '../../utils/schemas'

const body = z.object({ token: linkTokenSchema })

/**
 * Lets `/reset-password` say up front whether its link still works, instead of
 * only after the new password is typed. Does not spend the token. POST rather
 * than GET so the token stays out of access logs.
 */
export default defineEventHandler(async (event): Promise<{ valid: boolean }> => {
  const input = await readAuthBody(event, body)
  return { valid: await isAuthTokenValid(input.token, 'RESET_PASSWORD') }
})
