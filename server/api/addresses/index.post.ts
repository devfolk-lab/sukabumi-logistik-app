import { z } from 'zod'
import type { Address } from '#shared/types'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { toDomainAddress } from '../../utils/mappers'

const body = z.object({
  label: z.string().trim().min(1).max(40),
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(120),
  telp: z.string().trim().min(1, 'Nomor telepon wajib diisi').max(30),
  alamat: z.string().trim().min(1, 'Alamat wajib diisi').max(500),
  destinationId: z.number().int().positive().nullish(),
  destinationLabel: z.string().trim().max(200).nullish(),
  zipCode: z.string().trim().max(10).nullish()
})

export default defineEventHandler(async (event): Promise<Address> => {
  const profile = await requireProfile(event)
  const input = await readValidatedBody(event, body.parse)

  const existing = await prisma.address.count({ where: { profileId: profile.id } })

  const created = await prisma.address.create({
    data: {
      profileId: profile.id,
      label: input.label,
      nama: input.nama,
      telp: input.telp,
      alamat: input.alamat,
      destinationId: input.destinationId ?? null,
      destinationLabel: input.destinationLabel ?? null,
      zipCode: input.zipCode ?? null,
      // The first address a user saves becomes their default.
      isMain: existing === 0
    }
  })

  setResponseStatus(event, 201)
  return toDomainAddress(created)
})
