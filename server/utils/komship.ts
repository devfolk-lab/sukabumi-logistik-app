/**
 * Komship Delivery API — hands a stored order to the actual carrier and
 * returns an AWB. The general API key currently provisioned is sandbox-only
 * (production returns 401), so `komship.baseUrl` points at the sandbox host.
 */

interface Envelope<T> {
  meta: { message: string, code: number, status: string }
  data: T
}

export interface StoreOrderInput {
  orderNo: string
  senderNama: string
  senderTelp: string
  senderEmail: string
  senderAlamat: string
  originId: number
  receiverNama: string
  receiverTelp: string
  receiverAlamat: string
  destinationId: number
  courierCode: string
  serviceCode: string
  shippingCost: number
  insuranceValue: number
  total: number
  weightGram: number
  content: string
}

export interface StoreOrderResult {
  orderId: string
  orderNo: string
}

interface KomshipService {
  shipping_name: string
  service_name: string
  shipping_cost: number
  shipping_cashback: number
  etd: string
}

/**
 * Komship's carrier catalog is separate from the RajaOngkir cost API's and uses
 * different names, so a rate quoted from `/calculate/domestic-cost` cannot be
 * handed over verbatim - it comes back as "expedition not found".
 */
const KOMSHIP_CARRIER: Record<string, string> = {
  jne: 'JNE',
  sicepat: 'SICEPAT',
  jnt: 'JNT',
  ide: 'IDEXPRESS',
  sap: 'SAP',
  lion: 'LION',
  ninja: 'NINJA',
  anteraja: 'ANTERAJA',
  pos: 'POS',
  tiki: 'TIKI',
  rex: 'REX',
  rpx: 'RPX',
  ncs: 'NCS',
  sentral: 'SENTRAL',
  star: 'STAR',
  wahana: 'WAHANA',
  spx: 'SPX'
}

/**
 * Komship rejects a tariff lookup with `item_value` of 0. The value only feeds
 * their insurance quoting, which this app does not buy - it charges its own
 * flat premium - so a nominal declared value is enough to get the rate list.
 */
const NOMINAL_ITEM_VALUE = 100000

/**
 * Finds the Komship service that matches a chosen RajaOngkir carrier for this
 * route. Prefers the same service code, otherwise the carrier's cheapest.
 * Returns null when Komship does not carry that expedition at all.
 */
export async function resolveKomshipService(options: {
  originId: number
  destinationId: number
  weightGram: number
  courierCode: string
  serviceCode: string
}): Promise<KomshipService | null> {
  const carrier = KOMSHIP_CARRIER[options.courierCode.toLowerCase()]
  if (!carrier) return null

  const res = await client()<Envelope<Record<string, KomshipService[] | null> | null>>(
    '/tariff/api/v1/calculate',
    {
      query: {
        shipper_destination_id: options.originId,
        receiver_destination_id: options.destinationId,
        weight: Math.max(0.1, options.weightGram / 1000),
        item_value: NOMINAL_ITEM_VALUE,
        cod: 'no'
      }
    }
  )

  const groups = unwrap(res, 'Gagal mengambil tarif Komship') ?? {}
  const all = Object.values(groups).flatMap(g => g ?? [])
  const matches = all.filter(s => s.shipping_name?.toUpperCase() === carrier)

  if (matches.length === 0) return null

  return matches.find(s => s.service_name?.toUpperCase() === options.serviceCode.toUpperCase())
    ?? matches.reduce((a, b) => (a.shipping_cost <= b.shipping_cost ? a : b))
}

function client() {
  const config = useRuntimeConfig()
  const key = config.rajaongkir.generalApiKey

  if (!key) {
    throw createError({ statusCode: 500, statusMessage: 'Komship API key belum dikonfigurasi' })
  }

  return $fetch.create({
    baseURL: config.komship.baseUrl,
    headers: { 'x-api-key': key },
    ignoreResponseError: true
  })
}

function unwrap<T>(res: Envelope<T>, fallback: string): T {
  if (!res?.meta || res.meta.status !== 'success') {
    throw createError({
      statusCode: res?.meta?.code && res.meta.code >= 400 ? res.meta.code : 502,
      statusMessage: res?.meta?.message || fallback
    })
  }
  return res.data
}

/** Phone numbers must start with 0 or 62. */
function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('62')) return digits
  if (digits.startsWith('0')) return digits
  return `0${digits}`
}

export async function storeOrder(input: StoreOrderInput): Promise<StoreOrderResult> {
  const service = await resolveKomshipService({
    originId: input.originId,
    destinationId: input.destinationId,
    weightGram: input.weightGram,
    courierCode: input.courierCode,
    serviceCode: input.serviceCode
  })

  if (!service) {
    throw createError({
      statusCode: 422,
      statusMessage: `Kurir ${input.courierCode.toUpperCase()} belum tersedia untuk penjemputan otomatis`
    })
  }

  // Komship bills its own tariff, which differs from the RajaOngkir quote the
  // customer saw. Their record uses their numbers; our order keeps the quote.
  const grandTotal = service.shipping_cost + input.insuranceValue

  const res = await client()<Envelope<{ order_id: number | string, order_no: string }>>(
    '/order/api/v1/orders/store',
    {
      method: 'POST',
      body: {
        order_date: new Date().toISOString(),
        brand_name: 'Sukabumi Logistik',
        shipper_name: input.senderNama,
        shipper_phone: normalizePhone(input.senderTelp),
        shipper_destination_id: input.originId,
        shipper_address: input.senderAlamat,
        shipper_email: input.senderEmail,
        receiver_name: input.receiverNama,
        receiver_phone: normalizePhone(input.receiverTelp),
        receiver_destination_id: input.destinationId,
        receiver_address: input.receiverAlamat,
        shipping: service.shipping_name,
        shipping_type: service.service_name,
        shipping_cost: service.shipping_cost,
        shipping_cashback: service.shipping_cashback,
        payment_method: 'BANK TRANSFER',
        service_fee: 0,
        additional_cost: 0,
        grand_total: grandTotal,
        cod_value: 0,
        insurance_value: input.insuranceValue,
        notes: input.orderNo,
        order_details: [
          {
            product_name: input.content || 'Paket',
            product_variant_name: '-',
            product_price: 0,
            product_weight: input.weightGram,
            product_width: 10,
            product_height: 10,
            product_length: 10,
            qty: 1,
            subtotal: 0
          }
        ]
      }
    }
  )

  const data = unwrap(res, 'Gagal membuat order pengiriman')
  return { orderId: String(data.order_id), orderNo: data.order_no }
}

export interface PickupResult {
  status: string
  order_no: string
  awb: string
}

/**
 * Schedules the courier pickup. The order numbers go in an `orders` array -
 * a top-level `order_no` is rejected with "please fill order no".
 */
export async function requestPickup(
  orderNo: string,
  pickupDate: string,
  pickupTime = '10:00'
): Promise<PickupResult | null> {
  const res = await client()<Envelope<PickupResult[] | null>>('/order/api/v1/pickup/request', {
    method: 'POST',
    body: {
      pickup_date: pickupDate,
      pickup_time: pickupTime,
      pickup_vehicle: 'Motor',
      orders: [{ order_no: orderNo }]
    }
  })

  const results = unwrap(res, 'Gagal meminta penjemputan') ?? []
  return results[0] ?? null
}

export async function cancelOrder(orderNo: string): Promise<void> {
  const res = await client()<Envelope<unknown>>('/order/api/v1/orders/cancel', {
    method: 'PUT',
    body: { order_no: orderNo }
  })
  unwrap(res, 'Gagal membatalkan order pengiriman')
}

export async function orderDetail(orderNo: string): Promise<{ awb?: string, order_status?: string } | null> {
  const res = await client()<Envelope<{ awb?: string, order_status?: string } | null>>(
    '/order/api/v1/orders/detail',
    { query: { order_no: orderNo } }
  )
  return unwrap(res, 'Gagal mengambil detail order')
}
