import type { Order } from '../generated/prisma/client'
import { prisma } from './prisma'
import { createDraftOrder, getDraftOrder, getOrder } from './biteship'
import { ORDER_INCLUDE, toArea, toDomainOrder, type OrderWithItems } from './mappers'

/**
 * Payment is a manual bank transfer. An order is created together with a
 * Biteship draft order; the customer transfers, then tells the admin on
 * WhatsApp; the admin checks the transfer and confirms the draft in the
 * Biteship dashboard, which books the courier. Nothing calls back into the
 * app, so the app learns about the confirmation by asking Biteship whenever an
 * unpaid order is read.
 */
export const TRANSFER_PAYMENT = 'TRANSFER'

/** One Biteship lookup per order per this window, however many lists load. */
const CHECK_INTERVAL_MS = 15_000
const lastChecked = new Map<string, number>()

/**
 * Creates the Biteship draft for an order that has none yet, and stores its
 * id. Used right after the order is created, and again by the pay route for
 * orders made before drafts existed.
 */
export async function ensureDraft(order: OrderWithItems, shipperEmail: string): Promise<OrderWithItems> {
  if (order.biteshipDraftId) return order

  const draft = await createDraftOrder({
    orderNo: order.orderNo,
    senderNama: order.senderNama,
    senderTelp: order.senderTelp,
    senderEmail: shipperEmail,
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

  return prisma.order.update({
    where: { id: order.id },
    include: ORDER_INCLUDE,
    data: { biteshipDraftId: draft.id }
  })
}

/**
 * Moves an unpaid order forward once its draft has been confirmed: marks it
 * paid and stores the booked order's ids, so tracking takes over from there.
 * A draft the admin deleted cancels the order. Best effort — a Biteship
 * failure leaves the order as it was, to be checked on the next read.
 */
export async function syncPayment(order: Order): Promise<void> {
  if (order.status !== 'MENUNGGU_PEMBAYARAN' || !order.biteshipDraftId) return

  const now = Date.now()
  if (now - (lastChecked.get(order.id) ?? 0) < CHECK_INTERVAL_MS) return
  lastChecked.set(order.id, now)

  const draft = await getDraftOrder(order.biteshipDraftId).catch(() => null)
  if (!draft) return

  // `updateMany` on the unpaid status, so two reads racing here record the
  // confirmation once and never undo a cancellation made in between.
  const stillUnpaid = { id: order.id, status: 'MENUNGGU_PEMBAYARAN' as const }

  if (draft.deleted_at) {
    await prisma.order.updateMany({ where: stillUnpaid, data: { status: 'BATAL' } })
    return
  }

  if (draft.status !== 'confirmed' || !draft.order_id) return

  // The waybill and tracking id live on the booked order, not the draft. If
  // that lookup fails, `syncTracking` fills them in on a later read.
  const booked = await getOrder(draft.order_id).catch(() => null)

  await prisma.order.updateMany({
    where: stillUnpaid,
    data: {
      status: 'DIPROSES',
      paymentMethod: TRANSFER_PAYMENT,
      paidAt: draft.confirmed_at ? new Date(draft.confirmed_at) : new Date(),
      biteshipOrderId: draft.order_id,
      biteshipTrackingId: booked?.courier.tracking_id ?? null,
      trackingUrl: booked?.courier.link ?? null,
      awb: booked?.courier.waybill_id ?? null
    }
  })
  lastChecked.delete(order.id)
}

/** Checks every unpaid order of one account, before a list is read. */
export async function syncPendingPayments(profileId: string): Promise<void> {
  const pending = await prisma.order.findMany({
    where: { profileId, status: 'MENUNGGU_PEMBAYARAN', biteshipDraftId: { not: null } }
  })
  await Promise.all(pending.map(syncPayment))
}
