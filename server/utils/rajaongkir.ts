import type { Destination } from '#shared/types'

interface Envelope<T> {
  meta: { message: string, code: number, status: string }
  data: T
}

interface RawDestination {
  id: number
  label: string
  province_name: string
  city_name: string
  district_name: string
  subdistrict_name: string
  zip_code: string
}

export interface RawRate {
  name: string
  code: string
  service: string
  description: string
  cost: number
  etd: string
}

export interface RawManifest {
  manifest_code?: string
  manifest_description: string
  manifest_date: string
  manifest_time: string
  city_name?: string
}

export interface RawWaybill {
  delivered: boolean
  summary: {
    courier_code: string
    courier_name: string
    waybill_number: string
    service_code: string
    waybill_date: string
    shipper_name: string
    receiver_name: string
    origin: string
    destination: string
    status: string
  }
  delivery_status: {
    status: string
    pod_receiver?: string
    pod_date?: string
    pod_time?: string
  }
  manifest: RawManifest[]
}

function client() {
  const config = useRuntimeConfig()
  const key = config.rajaongkir.shippingCostApiKey

  if (!key) {
    throw createError({ statusCode: 500, statusMessage: 'RajaOngkir API key belum dikonfigurasi' })
  }

  return $fetch.create({
    baseURL: config.rajaongkir.baseUrl,
    headers: { key },
    // RajaOngkir signals failure in the envelope as well as the status code;
    // let non-2xx bodies through so we can surface `meta.message`.
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

export async function searchDestinations(search: string, limit = 20, offset = 0): Promise<Destination[]> {
  const res = await client()<Envelope<RawDestination[]>>('/destination/domestic-destination', {
    query: { search, limit, offset }
  })

  return (unwrap(res, 'Gagal mencari lokasi') ?? []).map(d => ({
    id: d.id,
    label: d.label,
    province: d.province_name,
    city: d.city_name,
    district: d.district_name,
    subdistrict: d.subdistrict_name,
    zipCode: d.zip_code
  }))
}

export async function calculateCost(options: {
  origin: number
  destination: number
  weight: number
  couriers: readonly string[]
}): Promise<RawRate[]> {
  const res = await client()<Envelope<RawRate[]>>('/calculate/domestic-cost', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      origin: String(options.origin),
      destination: String(options.destination),
      weight: String(options.weight),
      courier: options.couriers.join(':'),
      price: 'lowest'
    }).toString()
  })

  return unwrap(res, 'Gagal menghitung ongkir') ?? []
}

export async function trackWaybill(awb: string, courier: string, lastPhoneNumber?: string): Promise<RawWaybill> {
  const res = await client()<Envelope<RawWaybill | null>>('/track/waybill', {
    method: 'POST',
    query: {
      awb,
      courier,
      ...(lastPhoneNumber ? { last_phone_number: lastPhoneNumber } : {})
    }
  })

  const data = unwrap(res, 'Resi tidak ditemukan')
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Resi tidak ditemukan' })
  }
  return data
}
