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
 *
 * J&T Cargo only takes packages of `JNT_CARGO_MIN_GRAM` and up. Under that it
 * is listed once, unpriced and `unavailable`, so the customer learns it exists
 * and why it cannot be picked. Our own Antar Langsung courier is not a rate;
 * the courier page adds it from `ANTAR_LANGSUNG`.
 */
export default defineEventHandler(async (event): Promise<Courier[]> => {
  const input = await readValidatedBody(event, body.parse)

  const rates = await getRates({
    originAreaId: input.originId,
    destinationAreaId: input.destinationId,
    items: input.items,
    couriers: ALLOWED_COURIERS
  })

  const light = itemsWeight(input.items) < JNT_CARGO_MIN_GRAM

  const couriers: Courier[] = rates
    .filter(rate => isAllowedCourier(rate.courier_code))
    .filter(rate => !(light && rate.courier_code === 'jntcargo'))
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
    .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0))

  if (light) {
    couriers.push({
      id: 'jntcargo:unavailable',
      code: 'jntcargo',
      name: courierLabel('jntcargo'),
      service: 'Cargo',
      serviceCode: '',
      description: 'Khusus paket besar dan berat',
      cost: null,
      etd: '',
      brand: courierBrand('jntcargo'),
      unavailable: `Hanya tersedia untuk paket ${JNT_CARGO_MIN_GRAM / 1000} kg ke atas`
    })
  }

  return couriers
})
