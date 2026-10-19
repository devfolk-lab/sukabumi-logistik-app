import { z } from 'zod'
import type { AdminOrder } from '#shared/types'
import { requireRole } from '../../../../utils/auth'
import { advanceAntarLangsung } from '../../../../utils/approval'
import { toAdminOrder } from '../../../../utils/mappers'

const body = z.object({
  stage: z.enum(['DIJEMPUT', 'DALAM_PERJALANAN', 'SELESAI']),
  /** Shown to the customer under the step, e.g. who took the package. */
  note: z.string().trim().max(300).optional()
})

/**
 * Moves an Antar Langsung order one step along, since no carrier reports on
 * it. Admins and superadmins only.
 */
export default defineEventHandler(async (event): Promise<AdminOrder> => {
  await requireRole(event, canApproveOrders)
  const id = z.uuid().parse(getRouterParam(event, 'id'))
  const input = await readValidatedBody(event, body.parse)

  return toAdminOrder(await advanceAntarLangsung(id, input.stage, input.note))
})
