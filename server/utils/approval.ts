import type { Prisma } from '../generated/prisma/client'
import { prisma } from './prisma'
import { createOrder, deleteDraftOrder, type Coordinate } from './biteship'
import { ORDER_INCLUDE, toArea, toDomainOrder } from './mappers'
import { biteshipOrderFields } from './tracking'

/**
 * Payment is a manual bank transfer. A new order is only stored here, as
 * `MENUNGGU_PEMBAYARAN`; nothing goes to Biteship. The customer transfers and
 * sends the proof on WhatsApp; an admin checks it and approves the order in
 * the admin menu, which books it on Biteship (`POST /v1/orders`) and copies
 * Biteship's order onto ours.
 */
export const TRANSFER_PAYMENT = 'TRANSFER'

/**
 * How long an approval may hold its claim. Approving stamps `approvedAt`
 * before Biteship is called and clears it again if the call fails, so this
 * only matters if the server died in between.
 */
const CLAIM_MS = 2 * 60 * 1000

/** Unpaid and not being approved right now (or the approval was abandoned). */
function unclaimed(now: Date): Prisma.OrderWhereInput {
  return {
    status: 'MENUNGGU_PEMBAYARAN',
    biteshipOrderId: null,
    OR: [{ approvedAt: null }, { approvedAt: { lt: new Date(now.getTime() - CLAIM_MS) } }]
  }
}

/** What the admin menu includes with an order: the items, the customer, the approver. */
export const ADMIN_ORDER_INCLUDE = {
  ...ORDER_INCLUDE,
  profile: { select: { id: true, nama: true, email: true, telp: true } },
  approvedBy: { select: { email: true, profile: { select: { nama: true } } } }
} as const satisfies Prisma.OrderInclude

/** Why an order cannot be claimed, as the 409 the admin sees. */
async function refuseClaim(id: string): Promise<never> {
  const order = await prisma.order.findUnique({ where: { id }, select: { status: true, biteshipOrderId: true } })
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan' })
  if (order.status === 'BATAL') throw createError({ statusCode: 409, statusMessage: 'Pesanan ini sudah dibatalkan' })
  if (order.biteshipOrderId || order.status !== 'MENUNGGU_PEMBAYARAN') {
    throw createError({ statusCode: 409, statusMessage: 'Pesanan ini sudah disetujui' })
  }
  throw createError({ statusCode: 409, statusMessage: 'Pesanan ini sedang diproses admin, coba lagi sebentar' })
}

/**
 * Books a paid order on Biteship and records it as paid.
 *
 * The order is claimed first (`approvedAt`, on the unpaid status), so two
 * admins — or an admin and the customer cancelling — cannot both act on it.
 * If Biteship refuses, the claim is released and nothing else changes.
 */
export async function approveOrder(id: string, adminId: string, coordinates: { origin?: Coordinate, destination?: Coordinate } = {}) {
  const now = new Date()
  const claimed = await prisma.order.updateMany({
    where: { id, ...unclaimed(now) },
    data: { approvedAt: now, approvedById: adminId }
  })
  if (claimed.count === 0) await refuseClaim(id)

  const release = () => prisma.order.updateMany({
    where: { id, approvedAt: now, biteshipOrderId: null },
    data: { approvedAt: null, approvedById: null }
  })

  const order = await prisma.order.findUniqueOrThrow({ where: { id }, include: ADMIN_ORDER_INCLUDE })

  // Orders from the draft-order days have a draft holding our `orderNo` as its
  // reference. It goes first: if Biteship will not delete it, the admin has
  // already confirmed it in the dashboard and the shipment is booked there.
  let referenceId = order.orderNo
  if (order.biteshipDraftId) {
    try {
      await deleteDraftOrder(order.biteshipDraftId)
    } catch (error) {
      console.error('[biteship] legacy draft delete refused:', order.biteshipDraftId, error)
      await release()
      throw createError({
        statusCode: 409,
        statusMessage: `Draft lama pesanan ini (${order.biteshipDraftId}) tidak bisa dihapus, mungkin sudah dikonfirmasi di dashboard Biteship. Periksa di sana dulu.`
      })
    }
    referenceId = `${order.orderNo}-A`
  }

  let raw
  try {
    raw = await createOrder({
      referenceId,
      senderNama: order.senderNama,
      senderTelp: order.senderTelp,
      senderEmail: order.profile.email,
      senderAlamat: order.senderAlamat,
      originAreaId: toArea(order.originArea).id,
      originCoordinate: coordinates.origin,
      receiverNama: order.receiverNama,
      receiverTelp: order.receiverTelp,
      receiverAlamat: order.receiverAlamat,
      destinationAreaId: toArea(order.destinationArea).id,
      destinationCoordinate: coordinates.destination,
      courierCode: order.courierCode,
      serviceCode: order.serviceCode,
      items: toDomainOrder(order).items,
      note: order.orderNo
    })
  } catch (error) {
    await release()
    throw error
  }

  try {
    return await prisma.order.update({
      where: { id },
      include: ADMIN_ORDER_INCLUDE,
      data: {
        status: 'DIPROSES',
        paymentMethod: TRANSFER_PAYMENT,
        paidAt: now,
        biteshipDraftId: null,
        ...biteshipOrderFields(raw, order)
      }
    })
  } catch (error) {
    // Booked on Biteship but not recorded here: the claim stays, so nobody
    // books it a second time, and the log carries what is needed to fix it.
    console.error(`[approval] order ${order.orderNo} booked as Biteship ${raw.id} but not saved:`, error)
    throw createError({
      statusCode: 500,
      statusMessage: `Pesanan sudah dibuat di Biteship (${raw.id}) tetapi gagal disimpan. Catat ID ini dan hubungi pengembang.`
    })
  }
}

/**
 * Cancels an unpaid order: the admin's "Tolak", or the customer's own cancel.
 * Refused while an approval holds the order. A legacy draft is deleted too,
 * best effort, so it cannot be confirmed in the dashboard afterwards.
 */
export async function cancelUnpaidOrder(id: string, where: Prisma.OrderWhereInput = {}): Promise<void> {
  const now = new Date()
  const order = await prisma.order.findFirst({ where: { id, ...where }, select: { biteshipDraftId: true } })
  if (!order) throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan' })

  const cancelled = await prisma.order.updateMany({
    where: { id, ...where, ...unclaimed(now) },
    data: { status: 'BATAL' }
  })
  if (cancelled.count === 0) await refuseClaim(id)

  if (order.biteshipDraftId) {
    await deleteDraftOrder(order.biteshipDraftId).catch((error: unknown) => {
      console.error('[biteship] legacy draft delete refused:', order.biteshipDraftId, error)
    })
  }
}
