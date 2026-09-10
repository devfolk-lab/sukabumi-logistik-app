import { z } from 'zod'
import type { Order } from '#shared/types'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { calculateCost } from '../../utils/rajaongkir'
import { generateOrderNo, splitDestination, toDomainOrder } from '../../utils/mappers'

const party = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(120),
  telp: z.string().trim().min(1, 'Nomor telepon wajib diisi').max(30),
  alamat: z.string().trim().min(1, 'Alamat wajib diisi').max(500)
})

const body = z.object({
  sender: party,
  receiver: party,
  originId: z.number().int().positive(),
  originLabel: z.string().trim().min(1),
  destinationId: z.number().int().positive(),
  destinationLabel: z.string().trim().min(1),
  /** `${courierCode}:${serviceCode}` as returned by /api/couriers/rates. */
  courierId: z.string().trim().regex(/^[a-z0-9]+:.+$/i, 'Kurir tidak valid'),
  weightGram: z.number().int().min(100).max(150000),
  content: z.string().trim().max(300).default(''),
  insured: z.boolean().default(false)
})

export default defineEventHandler(async (event): Promise<Order> => {
  const profile = await requireProfile(event)
  const input = await readValidatedBody(event, body.parse)

  // Re-price server-side: the client must not be able to name its own ongkir.
  const rates = await calculateCost({
    origin: input.originId,
    destination: input.destinationId,
    weight: input.weightGram,
    couriers: SUPPORTED_COURIERS
  })

  const rate = rates.find(r => `${r.code}:${r.service}` === input.courierId)

  if (!rate) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Layanan kurir sudah tidak tersedia, silakan pilih ulang'
    })
  }

  const type = courierType(rate.service, rate.description)
  const insuranceFee = input.insured ? INSURANCE_FEE : 0
  const origin = splitDestination(input.originLabel)
  const destination = splitDestination(input.destinationLabel)

  const created = await prisma.order.create({
    data: {
      profileId: profile.id,
      orderNo: generateOrderNo(),
      senderNama: input.sender.nama,
      senderTelp: input.sender.telp,
      senderAlamat: input.sender.alamat,
      receiverNama: input.receiver.nama,
      receiverTelp: input.receiver.telp,
      receiverAlamat: input.receiver.alamat,
      originId: input.originId,
      originLabel: input.originLabel,
      originCity: origin.city,
      originArea: origin.area,
      destinationId: input.destinationId,
      destinationLabel: input.destinationLabel,
      destinationCity: destination.city,
      destinationArea: destination.area,
      courierCode: rate.code,
      courierName: courierLabel(rate.code, rate.name),
      serviceCode: rate.service,
      serviceName: rate.description,
      courierType: type.toUpperCase() as 'REGULAR' | 'SAMEDAY' | 'INSTANT',
      etd: courierEta(rate.etd, type),
      weightGram: input.weightGram,
      content: input.content,
      shippingCost: rate.cost,
      insuranceFee,
      total: rate.cost + insuranceFee,
      insured: input.insured
    }
  })

  setResponseStatus(event, 201)
  return toDomainOrder(created)
})
