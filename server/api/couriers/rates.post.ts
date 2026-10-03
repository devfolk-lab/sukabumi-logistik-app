import { z } from 'zod'
import type { Courier } from '#shared/types'
import { getRates } from '../../utils/biteship'
import { itemsSchema } from '../../utils/schemas'

const body = z.object({
  originId: z.string().trim().min(1),
  destinationId: z.string().trim().min(1),
  items: itemsSchema
})

/**
 * Live rates for the allowed carriers. Price, service and duration are
 * Biteship's own — the customer must see exactly what was quoted. Ours are the
 * row id, brand colours, and the carrier's full name (Biteship says "Lion").
 */
export default defineEventHandler(async (event): Promise<Courier[]> => {
  const input = await readValidatedBody(event, body.parse)

  const rates = await getRates({
    originAreaId: input.originId,
    destinationAreaId: input.destinationId,
    items: input.items,
    couriers: ALLOWED_COURIERS
  })

  return rates
    .filter(rate => isAllowedCourier(rate.courier_code))
    .map(rate => ({
      id: `${rate.courier_code}:${rate.courier_service_code}`,
      code: rate.courier_code,
      name: courierLabel(rate.courier_code, rate.courier_name),
      service: rate.courier_service_name,
      serviceCode: rate.courier_service_code,
      description: rate.description,
      cost: rate.price,
      etd: rate.duration ?? '',
      brand: courierBrand(rate.courier_code)
    }))
    .sort((a, b) => a.cost - b.cost)
})
