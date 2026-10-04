import { z } from 'zod'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'

/** Removes one waybill from this account's Lacak history. */
export default defineEventHandler(async (event) => {
  const profile = await requireProfile(event)
  const id = z.uuid().parse(getRouterParam(event, 'id'))

  const { count } = await prisma.trackingLookup.deleteMany({ where: { id, profileId: profile.id } })
  if (count === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Riwayat lacak tidak ditemukan' })
  }

  setResponseStatus(event, 204)
  return null
})
