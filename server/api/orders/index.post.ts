import { z } from 'zod'
import type { Order } from '#shared/types'
import { requireProfile } from '../../utils/auth'
import { prisma } from '../../utils/prisma'
import { getRates } from '../../utils/biteship'
import { ORDER_INCLUDE, generateOrderNo, toDomainOrder } from '../../utils/mappers'
import { areaSchema, itemsSchema } from '../../utils/schemas'

const party = z.object({
  nama: z.string().trim().min(1, 'Nama wajib diisi').max(120),
  telp: z.string().trim().min(1, 'Nomor telepon wajib diisi').max(30),
  alamat: z.string().trim().min(1, 'Alamat wajib diisi').max(500)
})

const body = z.object({
  sender: party,
  receiver: party,
  origin: areaSchema,
  destination: areaSchema,
  /** `${courierCode}:${serviceCode}` as returned by /api/couriers/rates. */
  courierId: z.string().trim().regex(/^[a-z0-9]+:.+$/i, 'Kurir tidak valid'),
  items: itemsSchema
})

export default defineEventHandler(async (event): Promise<Order> => {
  const profile = await requireProfile(event)
  const input = await readValidatedBody(event, body.parse)

  // Re-price server-side: the client must not be able to name its own ongkir.
  const rates = await getRates({
    originAreaId: input.origin.id,
    destinationAreaId: input.destination.id,
    items: input.items,
    couriers: ALLOWED_COURIERS
  })

  const rate = rates.find(r =>
    isAllowedCourier(r.courier_code) && `${r.courier_code}:${r.courier_service_code}` === input.courierId
  )

  if (!rate) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Layanan kurir sudah tidak tersedia, silakan pilih ulang'
    })
  }

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
      originArea: input.origin,
      destinationArea: input.destination,
      // Biteship's own values, stored verbatim so the record matches the quote
      // and the handoff can book exactly this service.
      courierCode: rate.courier_code,
      courierName: courierLabel(rate.courier_code, rate.courier_name),
      serviceCode: rate.courier_service_code,
      serviceName: rate.courier_service_name,
      etd: rate.duration || null,
      weightGram: itemsWeight(input.items),
      shippingCost: rate.price,
      total: rate.price,
      items: {
        create: input.items.map((item, position) => ({
          position,
          name: item.name,
          description: item.description || null,
          category: item.category || null,
          sku: item.sku || null,
          value: item.value,
          quantity: item.quantity,
          weight: item.weight,
          length: item.length,
          width: item.width,
          height: item.height
        }))
      }
    },
    include: ORDER_INCLUDE
  })

  // Nothing goes to Biteship yet: the order waits here, unpaid, until an admin
  // has checked the transfer and approves it, which books it on Biteship.
  setResponseStatus(event, 201)
  return toDomainOrder(created)
})
