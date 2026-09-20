import { z } from 'zod'
import type { Courier } from '#shared/types'
import { calculateCost } from '../../utils/rajaongkir'

const body = z.object({
  originId: z.number().int().positive(),
  destinationId: z.number().int().positive(),
  weightGram: z.number().int().min(100).max(150000)
})

/**
 * Live rates for the allowed carriers. RajaOngkir's fields are passed through
 * untouched — the customer must see exactly what the carrier quoted — and the
 * only additions are a row id and brand colours for the UI.
 */
export default defineEventHandler(async (event): Promise<Courier[]> => {
  const input = await readValidatedBody(event, body.parse)

  const rates = await calculateCost({
    origin: input.originId,
    destination: input.destinationId,
    weight: input.weightGram,
    couriers: ALLOWED_COURIERS
  })

  return rates
    .filter(rate => isAllowedService(rate.code, rate.service))
    .map(rate => ({
      id: `${rate.code}:${rate.service}`,
      code: rate.code,
      name: rate.name,
      service: rate.service,
      description: rate.description,
      cost: rate.cost,
      etd: rate.etd ?? '',
      brand: courierBrand(rate.code)
    }))
    .sort((a, b) => a.cost - b.cost)
})
