import type { Area, PackageItem } from '#shared/types'

/**
 * Biteship API — area search, rates, order handoff and tracking. The key's
 * prefix decides the environment: `biteship_test.` creates orders that no
 * courier ever collects and returns placeholder waybills (`WYB-…`).
 *
 * Rates and public waybill tracking are billed per call and refused outright
 * while the account balance is empty, even with a test key. Order creation,
 * order lookup, tracking by `tracking_id` and cancellation are not.
 */

interface ErrorBody {
  success: false
  error: string
  code?: number
  details?: Record<string, unknown>
}

export interface RawRate {
  courier_name: string
  courier_code: string
  courier_service_name: string
  courier_service_code: string
  description: string
  /** "2 - 3 days"; "" or absent when the courier gives no estimate. */
  duration?: string
  price: number
}

export interface RawHistory {
  note: string
  status: string
  updated_at: string
}

export interface RawOrder {
  id: string
  status: string
  price: number
  courier: {
    tracking_id: string | null
    waybill_id: string | null
    company: string
    type: string
    link: string | null
    history?: RawHistory[]
  }
}

export interface RawTracking {
  id?: string
  waybill_id: string
  status: string
  link?: string | null
  courier: { company: string }
  origin: { contact_name?: string, address?: string }
  destination: { contact_name?: string, address?: string }
  history: RawHistory[]
}

/**
 * Biteship charges per rates/tracking call; with no balance those calls fail
 * with an English message the UI should not show verbatim.
 */
const NO_BALANCE = /sufficient balance/i

/**
 * Biteship reports failure as `{ success: false, error }`, sometimes with a
 * 2xx status. Its messages are English, so the API returns an Indonesian one
 * and the original goes to the log.
 */
export class BiteshipError extends Error {
  constructor(readonly status: number, readonly body: ErrorBody | null) {
    super(body?.error || `Biteship ${status}`)
  }

  get code(): number | undefined {
    return this.body?.code
  }

  get noBalance(): boolean {
    return NO_BALANCE.test(this.message)
  }
}

function client() {
  const config = useRuntimeConfig()
  const key = config.biteship.apiKey

  if (!key) {
    throw createError({ statusCode: 500, statusMessage: 'Biteship API key belum dikonfigurasi' })
  }

  return $fetch.create({
    baseURL: config.biteship.baseUrl || 'https://api.biteship.com',
    headers: { authorization: key },
    ignoreResponseError: true
  })
}

async function call<T>(path: string, options: Parameters<ReturnType<typeof client>>[1] = {}): Promise<T> {
  const res = await client().raw<T | ErrorBody>(path, options)
  const body = res._data as (T & { success?: boolean }) | ErrorBody | undefined

  if (!res.ok || !body || body.success === false) {
    throw new BiteshipError(res.status, (body as ErrorBody | undefined) ?? null)
  }
  return body as T
}

/**
 * Turns a Biteship failure into an H3 error with an Indonesian message. An
 * empty balance is called out, since it is the one failure an operator — not
 * the customer — has to fix.
 */
export function biteshipFailure(error: unknown, fallback: string, statusCode = 502) {
  if (error instanceof BiteshipError) {
    console.error(`[biteship] ${fallback}:`, error.status, error.code ?? '', error.message)
    if (error.noBalance) {
      return createError({
        statusCode: 503,
        statusMessage: `${fallback}: saldo akun Biteship belum diisi`
      })
    }
    return createError({ statusCode, statusMessage: fallback })
  }
  return error
}

/**
 * Kecamatan-level areas matching `input`. Biteship matches whole words only
 * ("cibadak" finds Cibadak, "cibad" finds nothing). The rows are returned as
 * Biteship sent them, minus any key `Area` does not declare.
 */
export async function searchAreas(input: string, limit = 20): Promise<Area[]> {
  const res = await call<{ areas: Area[] }>('/v1/maps/areas', {
    query: { countries: 'ID', input, type: 'single' }
  }).catch((error) => {
    throw biteshipFailure(error, 'Gagal mencari lokasi')
  })
  return (res.areas ?? []).slice(0, limit).map(a => ({
    id: a.id,
    name: a.name,
    country_name: a.country_name,
    country_code: a.country_code,
    administrative_division_level_1_name: a.administrative_division_level_1_name,
    administrative_division_level_1_type: a.administrative_division_level_1_type,
    administrative_division_level_2_name: a.administrative_division_level_2_name,
    administrative_division_level_2_type: a.administrative_division_level_2_type,
    administrative_division_level_3_name: a.administrative_division_level_3_name,
    administrative_division_level_3_type: a.administrative_division_level_3_type,
    postal_code: a.postal_code
  }))
}

/** Biteship's `items` shape; optional fields are left out rather than sent empty. */
function toBiteshipItems(items: readonly PackageItem[]) {
  return items.map(item => ({
    name: item.name,
    ...(item.description ? { description: item.description } : {}),
    ...(item.category ? { category: item.category } : {}),
    ...(item.sku ? { sku: item.sku } : {}),
    value: item.value,
    quantity: item.quantity,
    weight: item.weight,
    ...(item.length ? { length: item.length } : {}),
    ...(item.width ? { width: item.width } : {}),
    ...(item.height ? { height: item.height } : {})
  }))
}

export async function getRates(options: {
  originAreaId: string
  destinationAreaId: string
  items: readonly PackageItem[]
  couriers: readonly string[]
}): Promise<RawRate[]> {
  const res = await call<{ pricing: RawRate[] }>('/v1/rates/couriers', {
    method: 'POST',
    body: {
      origin_area_id: options.originAreaId,
      destination_area_id: options.destinationAreaId,
      couriers: options.couriers.join(','),
      items: toBiteshipItems(options.items)
    }
  }).catch((error) => {
    throw biteshipFailure(error, 'Gagal menghitung ongkir')
  })
  return res.pricing ?? []
}

export interface CreateOrderInput {
  /** Our order number, sent as Biteship's unique `reference_id`. */
  orderNo: string
  senderNama: string
  senderTelp: string
  senderEmail: string
  senderAlamat: string
  originAreaId: string
  receiverNama: string
  receiverTelp: string
  receiverAlamat: string
  destinationAreaId: string
  courierCode: string
  serviceCode: string
  items: readonly PackageItem[]
}

/**
 * Biteship rejects a `reference_id` it has already seen with this code, and
 * says nothing about which order holds it.
 */
const DUPLICATE_REFERENCE = 40002060

/**
 * Hands the shipment to the courier. The waybill comes back immediately, and
 * `delivery_type: 'now'` asks for pickup as soon as the courier can.
 *
 * `reference_id` guards against booking twice: if a previous attempt reached
 * Biteship but our database write failed, the retry is refused rather than
 * sending a second courier. That order then needs a manual check, since the
 * refusal does not name the existing Biteship order.
 */
export async function createOrder(input: CreateOrderInput): Promise<RawOrder> {
  try {
    return await call<RawOrder>('/v1/orders', {
      method: 'POST',
      body: {
        shipper_contact_name: input.senderNama,
        shipper_contact_phone: input.senderTelp,
        shipper_contact_email: input.senderEmail,
        shipper_organization: 'Sukabumi Logistik',
        origin_contact_name: input.senderNama,
        origin_contact_phone: input.senderTelp,
        origin_contact_email: input.senderEmail,
        origin_address: input.senderAlamat,
        origin_area_id: input.originAreaId,
        destination_contact_name: input.receiverNama,
        destination_contact_phone: input.receiverTelp,
        destination_address: input.receiverAlamat,
        destination_area_id: input.destinationAreaId,
        courier_company: input.courierCode,
        courier_type: input.serviceCode,
        delivery_type: 'now',
        reference_id: input.orderNo,
        order_note: input.orderNo,
        items: toBiteshipItems(input.items)
      }
    })
  } catch (error) {
    if (error instanceof BiteshipError && error.code === DUPLICATE_REFERENCE) {
      console.error(`[biteship] ${input.orderNo} was already booked; needs a manual check`)
      throw createError({
        statusCode: 409,
        statusMessage: 'Pesanan ini sudah pernah diserahkan ke kurir. Hubungi admin untuk pengecekan.'
      })
    }
    throw biteshipFailure(error, 'Gagal menyerahkan paket ke kurir')
  }
}

export async function getOrder(id: string): Promise<RawOrder> {
  return call<RawOrder>(`/v1/orders/${encodeURIComponent(id)}`)
}

export async function cancelOrder(id: string, reason = 'Dibatalkan oleh pengirim'): Promise<void> {
  await call(`/v1/orders/${encodeURIComponent(id)}/cancel`, {
    method: 'POST',
    body: { cancellation_reason_code: 'others', cancellation_reason: reason }
  })
}

/** Tracking for an order booked here. Not billed, so it works without balance. */
export async function trackOrder(trackingId: string): Promise<RawTracking> {
  return call<RawTracking>(`/v1/trackings/${encodeURIComponent(trackingId)}`)
}

/** Tracking for any waybill, including ones not booked here. Billed per call. */
export async function trackWaybill(waybill: string, courierCode: string): Promise<RawTracking> {
  return call<RawTracking>(
    `/v1/trackings/${encodeURIComponent(waybill)}/couriers/${encodeURIComponent(courierCode)}`
  )
}
