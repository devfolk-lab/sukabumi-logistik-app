import { z } from 'zod'
import { searchDestinations } from '../utils/rajaongkir'
import { searchLocalDestinations } from '../utils/destinations'

const query = z.object({
  q: z.string().trim().min(2, 'Ketik minimal 2 huruf'),
  limit: z.coerce.number().int().min(1).max(50).default(10)
})

/**
 * Local snapshot first (prefix matches on every keystroke), the hosted search
 * only when the snapshot is absent — it needs whole words and is rate-limited.
 */
export default defineEventHandler(async (event) => {
  const { q, limit } = await getValidatedQuery(event, query.parse)

  const local = await searchLocalDestinations(q, limit)
  if (local) return local

  if (q.length < 3) return []
  return searchDestinations(q, limit)
})
