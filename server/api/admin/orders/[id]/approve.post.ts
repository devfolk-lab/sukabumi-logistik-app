import { z } from 'zod'
import type { AdminOrder } from '#shared/types'
import { requireRole } from '../../../../utils/auth'
import { approveOrder } from '../../../../utils/approval'
import { toAdminOrder } from '../../../../utils/mappers'
import { sendPaymentSuccessEmail } from '../../../../utils/order-mail'

const coordinate = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
})

const body = z.object({
  /** How the customer paid: bank transfer, QRIS, or cash at the outlet. */
  paymentMethod: z.enum(PAYMENT_METHODS).default('TRANSFER'),
  /** Pickup and delivery points, for carriers that place orders by them. */
  originCoordinate: coordinate.optional(),
  destinationCoordinate: coordinate.optional()
})

/**
 * The admin has checked the customer's payment: book the order on Biteship
 * and record it as paid, and how. Admins and superadmins only.
 */
export default defineEventHandler(async (event): Promise<AdminOrder> => {
  const auth = await requireRole(event, canApproveOrders)
  const id = z.uuid().parse(getRouterParam(event, 'id'))
  const input = await readValidatedBody(event, raw => body.parse(raw ?? {}))

  const approved = await approveOrder(id, auth.profile.id, input.paymentMethod, {
    origin: input.originCoordinate,
    destination: input.destinationCoordinate
  })
  const order = toAdminOrder(approved)

  // The payment receipt goes out after the answer: SMTP is slow, and a failed
  // send must not look like a failed approval.
  event.waitUntil(
    sendPaymentSuccessEmail(event, order, approved.paidAt ?? new Date()).catch((error: unknown) => {
      console.error(`[mail] payment receipt for ${order.orderNo} failed:`, error)
    })
  )
  return order
})
