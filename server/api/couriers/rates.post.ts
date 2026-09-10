import { z } from 'zod'
import type { Courier } from '#shared/types'
import { calculateCost } from '../../utils/rajaongkir'

const body = z.object({
  originId: z.number().int().positive(),
  destinationId: z.number().int().positive(),
  weightGram: z.number().int().min(100).max(150000)
})

export default defineEventHandler(async (event): Promise<Courier[]> => {
  const input = await readValidatedBody(event, body.parse)

  const rates = await calculateCost({
    origin: input.originId,
    destination: input.destinationId,
    weight: input.weightGram,
    couriers: SUPPORTED_COURIERS
  })

  return rates.map((rate) => {
    const type = courierType(rate.service, rate.description)

    return {
      id: `${rate.code}:${rate.service}`,
      code: rate.code,
      name: courierLabel(rate.code, rate.name),
      service: rate.service,
      serviceName: rate.description,
      type,
      price: rate.cost,
      eta: courierEta(rate.etd, type),
      pickup: courierPickup(type),
      // RajaOngkir does not expose insurance availability per service.
      insured: false,
      vehicle: courierVehicle(type, rate.service, rate.description),
      brand: courierBrand(rate.code)
    }
  }).sort((a, b) => a.price - b.price)
})
