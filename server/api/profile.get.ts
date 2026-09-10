import type { User } from '#shared/types'
import { requireProfile } from '../utils/auth'

export default defineEventHandler(async (event): Promise<User> => {
  const profile = await requireProfile(event)
  return { nama: profile.nama, email: profile.email, telp: profile.telp }
})
