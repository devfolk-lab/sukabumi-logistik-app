import { z } from 'zod'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event)
  const id = z.uuid().parse(getRouterParam(event, 'id'))

  const deleted = await prisma.address.deleteMany({ where: { id, profileId: profile.id } })

  if (deleted.count === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Alamat tidak ditemukan' })
  }

  // Keep exactly one default address alive.
  const remaining = await prisma.address.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: 'asc' }
  })

  if (remaining.length > 0 && !remaining.some(a => a.isMain)) {
    await prisma.address.update({ where: { id: remaining[0]!.id }, data: { isMain: true } })
  }

  return { ok: true }
})
