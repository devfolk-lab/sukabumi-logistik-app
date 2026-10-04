import { z } from 'zod'
import type { Order } from '#shared/types'
import { requireProfile } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { ORDER_INCLUDE, toDomainOrder } from '../../../utils/mappers'
import { ensureDraft } from '../../../utils/payment'

/**
 * Makes sure an unpaid order has its Biteship draft, which the payment steps
 * show as the Order ID. New orders get one when they are created; this covers
 * orders made before that, and is a no-op for everything else.
 */
export default defineEventHandler(async (event): Promise<Order> => {
  const profile = await requireProfile(event)
  const id = z.uuid().parse(getRouterParam(event, 'id'))

  const order = await prisma.order.findFirst({ where: { id, profileId: profile.id }, include: ORDER_INCLUDE })

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan' })
  }

  if (order.status !== 'MENUNGGU_PEMBAYARAN') {
    throw createError({ statusCode: 409, statusMessage: 'Pesanan ini sudah dibayar atau dibatalkan' })
  }

  return toDomainOrder(await ensureDraft(order, profile.email))
})
