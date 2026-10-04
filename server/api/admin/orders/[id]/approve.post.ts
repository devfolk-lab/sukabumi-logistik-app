import { z } from 'zod'
import type { AdminOrder } from '#shared/types'
import { requireRole } from '../../../../utils/auth'
import { approveOrder } from '../../../../utils/approval'
import { toAdminOrder } from '../../../../utils/mappers'

const coordinate = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
})

const body = z.object({
  /** Pickup and delivery points, for carriers that place orders by them. */
  originCoordinate: coordinate.optional(),
  destinationCoordinate: coordinate.optional()
}).default({})

/**
 * The admin has checked the customer's transfer: book the order on Biteship
 * and record it as paid. Admins and superadmins only.
 */
export default defineEventHandler(async (event): Promise<AdminOrder> => {
  const auth = await requireRole(event, canApproveOrders)
  const id = z.uuid().parse(getRouterParam(event, 'id'))
  const input = await readValidatedBody(event, raw => body.parse(raw ?? {}))

  const approved = await approveOrder(id, auth.profile.id, {
    origin: input.originCoordinate,
    destination: input.destinationCoordinate
  })
  return toAdminOrder(approved)
})
