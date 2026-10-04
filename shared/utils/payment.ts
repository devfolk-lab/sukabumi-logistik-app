import type { Order } from '#shared/types'
import { formatRupiah } from './format'

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
 * The WhatsApp message a customer sends after transferring. "Order ID" is the
 * Biteship draft the admin confirms; "No. Referensi" is our order number,
 * which Biteship holds as the draft's `reference_id` — there is no waybill to
 * quote yet, since Biteship issues one only on confirmation.
 */
export function paymentRequestMessage(order: Pick<Order, 'draftId' | 'orderNo' | 'price'>): string {
  return [
    'Halo Sukabumi Logistik, saya ingin mengirim paket.',
    '',
    `Order ID: ${order.draftId ?? '-'}`,
    `No. Referensi: ${order.orderNo}`,
    `Total: ${formatRupiah(order.price)}`,
    '',
    'Saya akan mengirimkan bukti transfer setelah pesan ini.'
  ].join('\n')
}
