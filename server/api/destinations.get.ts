import { z } from 'zod'
import type { Area } from '#shared/types'
import { searchAreas } from '../utils/biteship'

const query = z.object({
  q: z.string().trim().min(3, 'Ketik minimal 3 huruf'),
  limit: z.coerce.number().int().min(1).max(50).default(20)
})

/**
 * Kecamatan search, straight from Biteship's `/v1/maps/areas`. Each row is a
 * kecamatan with one postal code, returned in Biteship's own shape.
 */
export default defineEventHandler(async (event): Promise<Area[]> => {
  const { q, limit } = await getValidatedQuery(event, query.parse)
  return searchAreas(q, limit)
})
