import { endSession } from '../../utils/auth'

/** Signs this device out. Other devices stay signed in. */
export default defineEventHandler(async (event) => {
  await endSession(event)
  return { ok: true }
})
