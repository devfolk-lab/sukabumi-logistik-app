import { z } from 'zod'
import type { AdminOrder } from '#shared/types'
import { requireRole } from '../../../../utils/auth'
import { setAntarLangsungPrice } from '../../../../utils/approval'
import { toAdminOrder } from '../../../../utils/mappers'

const body = z.object({
  /** The ongkir agreed with the customer on WhatsApp, in rupiah. */
  price: z.number().int('Ongkir harus bilangan bulat').min(1000, 'Ongkir minimal Rp 1.000').max(100_000_000, 'Ongkir terlalu besar')
})

/**
 * Sets the price of an unpaid Antar Langsung order, which has no quote of its
 * own. Admins and superadmins only.
 */
export default defineEventHandler(async (event): Promise<AdminOrder> => {
  await requireRole(event, canApproveOrders)
  const id = z.uuid().parse(getRouterParam(event, 'id'))
  const input = await readValidatedBody(event, body.parse)

  return toAdminOrder(await setAntarLangsungPrice(id, input.price))
})
