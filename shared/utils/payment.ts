import type { Order } from '#shared/types'
import { formatOngkir } from './format'

/**
 * How a customer can pay. All three are checked by hand: the admin sees the
 * money arrive (bank, QRIS) or takes it at the counter (cash), then approves
 * the order and records which one it was.
 */
export type PaymentMethod = 'TRANSFER' | 'QRIS' | 'TUNAI'

export const PAYMENT_METHODS = ['TRANSFER', 'QRIS', 'TUNAI'] as const satisfies readonly PaymentMethod[]

export const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string, short: string, icon: string }> = {
  TRANSFER: { label: 'Transfer Bank', short: 'Transfer', icon: 'i-lucide-landmark' },
  QRIS: { label: 'QRIS', short: 'QRIS', icon: 'i-lucide-qr-code' },
  TUNAI: { label: 'Tunai di Gerai', short: 'Tunai', icon: 'i-lucide-store' }
}

/** "Transfer Bank", "QRIS"… for a stored `paymentMethod`; legacy values pass through. */
export function paymentMethodLabel(method: string | null | undefined): string | null {
  if (!method) return null
  if (method === 'DEMO') return 'Demo'
  return PAYMENT_METHOD_META[method as PaymentMethod]?.label ?? method
}

/**
 * The account customers transfer to. Placeholder details until the real
 * account is set up — nothing reads this but the payment steps.
 */
export const PAYMENT_ACCOUNT = {
  bank: 'Bank BCA',
  number: '1234567890',
  holder: 'PT Sukabumi Logistik'
} as const

/**
 * The static QRIS code customers scan. `image` is a path under `public/`,
 * the code alone cropped from the printed QRIS sign; while it is empty the
 * payment steps ask for the code on WhatsApp instead.
 */
export const PAYMENT_QRIS: { merchant: string, nmid: string, image: string } = {
  merchant: 'MULTI LOGISTIC SUKABUMI',
  nmid: 'ID1023288037097',
  image: '/img/payment/qris.png'
}

/** Google Maps search for a pin (`"lat,lng"`) or, without one, the street address. */
function mapsSearch(point: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(point)}`
}

export interface PaymentOutlet {
  name: string
  type: 'Kantor Utama' | 'Cabang'
  address: string
  hours: string
  /** The branch's own WhatsApp, digits only, as the site's "Chat Admin" links it. */
  whatsapp: string
  mapsUrl: string
}

/**
 * The counters customers can pay at in cash: every branch in
 * https://sukabumilogistik.com/#cabang, which the landing page renders from
 * `branches` in `sukabumi-logistik-landing-page/src/data/site.ts`. Keep the
 * two in step.
 */
export const PAYMENT_OUTLETS: readonly PaymentOutlet[] = [
  {
    name: 'Kantor Layanan Utama Lembursitu',
    type: 'Kantor Utama',
    address: 'Jl. Pelabuhan II Km. 6, Lembursitu, Sukabumi',
    hours: 'Senin–Sabtu, 08.00–20.00 WIB',
    whatsapp: '628111171711',
    mapsUrl: mapsSearch('-6.9587905,106.8983862')
  },
  {
    name: 'Lembursitu',
    type: 'Cabang',
    address: 'Jl. Pelabuhan II Km. 7, Lembursitu, Sukabumi (Seberang Terminal / Samping Indomaret)',
    hours: 'Senin–Sabtu, 08.00–20.00 WIB',
    whatsapp: '6281316165177',
    mapsUrl: mapsSearch('Jl. Pelabuhan II Km 7 Lembursitu Sukabumi')
  },
  {
    name: 'Sukaraja Pasirhalang',
    type: 'Cabang',
    address: 'Jl. Sukaraja No. 282, Kp. Neglasari, Sukabumi (Depan Vila Taman Anggrek)',
    hours: 'Senin–Sabtu, 08.00–20.00 WIB',
    whatsapp: '6285282000021',
    mapsUrl: mapsSearch('Jl. Sukaraja No. 282 Pasirhalang Sukabumi')
  },
  {
    name: 'Bhayangkara',
    type: 'Cabang',
    address: 'Jl. Bhayangkara No. 140, Sukabumi (Depan Fresh Hotel)',
    hours: 'Senin–Sabtu, 08.00–20.00 WIB',
    whatsapp: '628111190901',
    mapsUrl: mapsSearch('-6.9106282,106.9214894')
  }
]

/**
 * The WhatsApp message a customer sends to confirm a payment. "No. Pesanan"
 * is our order number, which the admin looks up in the admin menu — there is
 * no waybill to quote yet, since the order reaches Biteship only once approved.
 * The courier is named so an admin can tell an Antar Langsung order at once.
 */
export function paymentRequestMessage(order: Pick<Order, 'orderNo' | 'price' | 'courier'>, method: PaymentMethod = 'TRANSFER'): string {
  const closing: Record<PaymentMethod, string> = {
    TRANSFER: 'Saya akan mengirimkan bukti transfer setelah pesan ini.',
    QRIS: 'Saya sudah membayar lewat QRIS dan akan mengirimkan bukti pembayarannya setelah pesan ini.',
    TUNAI: 'Saya akan membayar tunai di gerai Sukabumi Logistik.'
  }
  return [
    'Halo Sukabumi Logistik, saya ingin mengirim paket.',
    '',
    `No. Pesanan: ${order.orderNo}`,
    `Kurir: ${order.courier}`,
    `Total: ${formatOngkir(order.price, 'menunggu konfirmasi admin')}`,
    `Pembayaran: ${PAYMENT_METHOD_META[method].label}`,
    '',
    closing[method]
  ].join('\n')
}

/**
 * The first message for an Antar Langsung order, which has no price yet: it
 * names our special courier and asks the admin for the ongkir.
 */
export function antarLangsungPriceMessage(order: Pick<Order, 'orderNo' | 'courier' | 'pickup' | 'delivery' | 'weight'>): string {
  return [
    'Halo Sukabumi Logistik, saya memilih kurir spesial *Sukabumi Logistik Antar Langsung*.',
    '',
    `No. Pesanan: ${order.orderNo}`,
    `Kurir: ${order.courier}`,
    `Rute: ${order.pickup} → ${order.delivery}`,
    `Berat: ${order.weight}`,
    '',
    'Mohon info ongkirnya. Terima kasih.'
  ].join('\n')
}
