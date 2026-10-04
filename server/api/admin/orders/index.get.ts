import { z } from 'zod'
import type { AdminOrder } from '#shared/types'
import type { Prisma } from '../../../generated/prisma/client'
import { requireRole } from '../../../utils/auth'
import { prisma } from '../../../utils/prisma'
import { toAdminOrder } from '../../../utils/mappers'
import { ADMIN_ORDER_INCLUDE } from '../../../utils/approval'

const query = z.object({
  /** `pending` waits for approval; `active` is booked and on its way. */
  status: z.enum(['pending', 'active', 'done', 'cancelled', 'all']).default('pending'),
  q: z.string().trim().max(100).default('')
})

const STATUS_FILTER: Record<z.infer<typeof query>['status'], Prisma.OrderWhereInput> = {
  pending: { status: 'MENUNGGU_PEMBAYARAN' },
  active: { status: { in: ['DIPROSES', 'DIJEMPUT', 'DALAM_PERJALANAN'] } },
  done: { status: 'SELESAI' },
  cancelled: { status: 'BATAL' },
  all: {}
}

/** Every customer's orders, for the approval menu. Admins and superadmins only. */
export default defineEventHandler(async (event): Promise<AdminOrder[]> => {
  await requireRole(event, canApproveOrders)
  const input = await getValidatedQuery(event, query.parse)

  const search: Prisma.OrderWhereInput = input.q
    ? {
        OR: [
          { orderNo: { contains: input.q, mode: 'insensitive' } },
          { awb: { contains: input.q, mode: 'insensitive' } },
          { senderNama: { contains: input.q, mode: 'insensitive' } },
          { receiverNama: { contains: input.q, mode: 'insensitive' } },
          { profile: { email: { contains: input.q, mode: 'insensitive' } } },
          { profile: { nama: { contains: input.q, mode: 'insensitive' } } }
        ]
      }
    : {}

  const rows = await prisma.order.findMany({
    where: { ...STATUS_FILTER[input.status], ...search },
    include: ADMIN_ORDER_INCLUDE,
    // The oldest transfer waiting is the one to check first.
    orderBy: { createdAt: input.status === 'pending' ? 'asc' : 'desc' },
    take: 100
  })

  return rows.map(toAdminOrder)
})
