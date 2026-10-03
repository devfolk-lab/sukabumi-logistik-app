import { z } from 'zod'
import type { Address } from '#shared/types'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { toDomainAddress } from '../../utils/mappers'
import { areaSchema } from '../../utils/schemas'
import { Prisma } from '../../generated/prisma/client'

const body = z.object({
  label: z.string().trim().min(1).max(40).optional(),
  nama: z.string().trim().min(1).max(120).optional(),
  telp: z.string().trim().min(1).max(30).optional(),
  alamat: z.string().trim().min(1).max(500).optional(),
  /** Omitted keeps the current area; null clears it. */
  area: areaSchema.nullish(),
  main: z.boolean().optional()
})

export default defineEventHandler(async (event): Promise<Address> => {
  const profile = await requireProfile(event)
  const id = z.uuid().parse(getRouterParam(event, 'id'))
  const input = await readValidatedBody(event, body.parse)

  const owned = await prisma.address.findFirst({ where: { id, profileId: profile.id } })
  if (!owned) {
    throw createError({ statusCode: 404, statusMessage: 'Alamat tidak ditemukan' })
  }

  const { main, area, ...rest } = input

  const updated = await prisma.$transaction(async (tx) => {
    if (main === true) {
      await tx.address.updateMany({ where: { profileId: profile.id }, data: { isMain: false } })
    }
    return tx.address.update({
      where: { id },
      data: {
        ...rest,
        ...(area === undefined ? {} : { area: area ?? Prisma.DbNull }),
        ...(main === undefined ? {} : { isMain: main })
      }
    })
  })

  return toDomainAddress(updated)
})
