import { z } from 'zod'
import { searchDestinations } from '../utils/rajaongkir'

const query = z.object({
  q: z.string().trim().min(3, 'Ketik minimal 3 huruf'),
  limit: z.coerce.number().int().min(1).max(50).default(10)
})

export default defineEventHandler(async (event) => {
  const { q, limit } = await getValidatedQuery(event, query.parse)
  return searchDestinations(q, limit)
})
