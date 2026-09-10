import { z } from 'zod'
import type { User } from '#shared/types'
import { requireProfile } from '../utils/auth'
import { prisma } from '../utils/prisma'

const body = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(120),
  telp: z.string().trim().max(30).nullish()
})

export default defineEventHandler(async (event): Promise<User> => {
  const profile = await requireProfile(event)
  const input = await readValidatedBody(event, body.parse)

  const updated = await prisma.profile.update({
    where: { id: profile.id },
    data: { nama: input.nama, telp: input.telp ?? null }
  })

  return { nama: updated.nama, email: updated.email, telp: updated.telp }
})
