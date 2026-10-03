import { z } from 'zod'
import type { Order } from '#shared/types'
import { requireProfile } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { ORDER_INCLUDE, toArea, toDomainOrder } from '../../../utils/mappers'
import { createOrder } from '../../../utils/biteship'

/**
 * Recorded as the payment method: checkout collects none, because payment is
 * a demo run by us — no gateway is called and no money moves.
 */
const DEMO_PAYMENT = 'DEMO'

/**
 * Confirms a demo payment and hands the shipment to the courier via Biteship.
 * Everything Biteship needs beyond the checkout form (shipper email,
 * delivery type) is filled in here and in `createOrder`; the items go over
 * exactly as the customer entered them.
 *
 * Because the payment is simulated there
 * is nothing to lose by failing the whole request when Biteship refuses the
 * order: the order stays MENUNGGU_PEMBAYARAN and the customer can pay again.
 * Biteship refuses a second booking under the same order number, so a retry
 * after a half-finished attempt fails with 409 instead of sending two couriers.
 */
export default defineEventHandler(async (event): Promise<Order> => {
  const profile = await requireProfile(event)
  const id = z.uuid().parse(getRouterParam(event, 'id'))

  const order = await prisma.order.findFirst({ where: { id, profileId: profile.id }, include: ORDER_INCLUDE })

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan' })
  }

  if (order.status !== 'MENUNGGU_PEMBAYARAN') {
    throw createError({ statusCode: 409, statusMessage: 'Pesanan ini sudah dibayar' })
  }

  const shipment = await createOrder({
    orderNo: order.orderNo,
    senderNama: order.senderNama,
    senderTelp: order.senderTelp,
    senderEmail: profile.email,
    senderAlamat: order.senderAlamat,
    originAreaId: toArea(order.originArea).id,
    receiverNama: order.receiverNama,
    receiverTelp: order.receiverTelp,
    receiverAlamat: order.receiverAlamat,
    destinationAreaId: toArea(order.destinationArea).id,
    courierCode: order.courierCode,
    serviceCode: order.serviceCode,
    items: toDomainOrder(order).items
  })

  const updated = await prisma.order.update({
    where: { id: order.id },
    include: ORDER_INCLUDE,
    data: {
      status: 'DIPROSES',
      paymentMethod: DEMO_PAYMENT,
      paidAt: new Date(),
      biteshipOrderId: shipment.id,
      biteshipTrackingId: shipment.courier.tracking_id,
      trackingUrl: shipment.courier.link,
      awb: shipment.courier.waybill_id
    }
  })

  return toDomainOrder(updated)
})
