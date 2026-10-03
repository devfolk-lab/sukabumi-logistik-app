import { z } from 'zod'
import type { Order } from '#shared/types'
import { requireProfile } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { ORDER_INCLUDE, toDomainOrder } from '../../../utils/mappers'
import { biteshipFailure, cancelOrder } from '../../../utils/biteship'

export default defineEventHandler(async (event): Promise<Order> => {
  const profile = await requireProfile(event)
  const id = z.uuid().parse(getRouterParam(event, 'id'))

  const order = await prisma.order.findFirst({ where: { id, profileId: profile.id }, include: ORDER_INCLUDE })

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan' })
  }

  if (order.status === 'BATAL') {
    return toDomainOrder(order)
  }

  // Once the courier has the package it is out of our hands.
  if (order.status === 'DALAM_PERJALANAN' || order.status === 'SELESAI') {
    throw createError({ statusCode: 409, statusMessage: 'Pesanan sudah tidak bisa dibatalkan' })
  }

  // A courier that is still coming must be called off before the order is
  // marked cancelled here, or it would turn up for a package nobody hands over.
  if (order.biteshipOrderId) {
    await cancelOrder(order.biteshipOrderId).catch((error) => {
      throw biteshipFailure(error, 'Kurir menolak pembatalan, pesanan mungkin sudah dijemput', 409)
    })
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    include: ORDER_INCLUDE,
    data: { status: 'BATAL' }
  })

  return toDomainOrder(updated)
})
