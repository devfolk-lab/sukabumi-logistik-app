import { z } from 'zod'
import type { Order } from '#shared/types'
import { requireProfile } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { toDomainOrder } from '../../../utils/mappers'
import { orderDetail, requestPickup, storeOrder } from '../../../utils/komship'

/**
 * Confirms payment and hands the shipment to the carrier.
 *
 * The Komship handoff is best-effort: the sandbox rejects orders when the
 * account balance is short, and a payment must not be lost because of that.
 * The order still advances to DIPROSES and can be retried.
 */
export default defineEventHandler(async (event): Promise<Order> => {
  const profile = await requireProfile(event)
  const id = z.uuid().parse(getRouterParam(event, 'id'))

  const order = await prisma.order.findFirst({ where: { id, profileId: profile.id } })

  if (!order) {
    throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan' })
  }

  if (order.status !== 'MENUNGGU_PEMBAYARAN') {
    throw createError({ statusCode: 409, statusMessage: 'Pesanan ini sudah dibayar' })
  }

  let komship: { orderId: string, orderNo: string } | null = null
  let awb: string | null = null

  if (useRuntimeConfig().komship.enabled) {
    komship = await storeOrder({
      orderNo: order.orderNo,
      senderNama: order.senderNama,
      senderTelp: order.senderTelp,
      senderEmail: profile.email,
      senderAlamat: order.senderAlamat,
      originId: order.originId,
      receiverNama: order.receiverNama,
      receiverTelp: order.receiverTelp,
      receiverAlamat: order.receiverAlamat,
      destinationId: order.destinationId,
      courierCode: order.courierCode,
      serviceCode: order.serviceCode,
      shippingCost: order.shippingCost,
      insuranceValue: order.insuranceFee,
      total: order.total,
      weightGram: order.weightGram,
      content: order.content
    }).catch((error) => {
      // Never lose a payment over a carrier outage, but do not lose the reason
      // either - these orders need a manual retry.
      console.error(`[komship] handoff failed for ${order.orderNo}:`, error?.statusMessage || error?.message || error)
      return null
    })

    if (komship) {
      // Ask for a pickup tomorrow; regular services are not collected same-day.
      const besok = new Date()
      besok.setDate(besok.getDate() + 1)
      const pickup = await requestPickup(komship.orderNo, besok.toISOString().slice(0, 10)).catch((error) => {
        console.error(`[komship] pickup request failed for ${order.orderNo}:`, error?.statusMessage || error?.message || error)
        return null
      })

      // The carrier assigns the AWB asynchronously, so it is often still empty
      // here; `syncTracking` picks it up on the next detail view.
      awb = pickup?.awb || null

      if (!awb) {
        const detail = await orderDetail(komship.orderNo).catch(() => null)
        awb = detail?.awb || null
      }
    }
  }

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'DIPROSES',
      komshipOrderId: komship?.orderId ?? null,
      komshipOrderNo: komship?.orderNo ?? null,
      awb
    }
  })

  return toDomainOrder(updated)
})
