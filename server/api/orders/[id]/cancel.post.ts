import { z } from 'zod'
import type { Order } from '#shared/types'
import { requireProfile } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { toDomainOrder } from '../../../utils/mappers'
import { cancelOrder } from '../../../utils/komship'

export default defineEventHandler(async (event): Promise<Order> => {
  const profile = await requireProfile(event)
  const id = z.uuid().parse(getRouterParam(event, 'id'))

  const order = await prisma.order.findFirst({ where: { id, profileId: profile.id } })

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

  if (order.komshipOrderNo) {
    await cancelOrder(order.komshipOrderNo).catch(() => null)
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: 'BATAL' }
  })

  return toDomainOrder(updated)
})
