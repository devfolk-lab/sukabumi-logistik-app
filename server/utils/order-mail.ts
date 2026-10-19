import type { H3Event } from 'h3'
import type { AdminOrder } from '#shared/types'
import { MAIL_BRAND, mailLayout } from './mail'

/**
 * The receipt a customer gets once an admin has verified their payment and
 * approved the order, whichever courier carries it. Sent after the approval
 * has been answered: a failed send is logged and never undoes the approval.
 */

/** "19 Oktober 2026 10.37 WIB", in Sukabumi's time whatever the server's zone. */
function formatPaidAt(date: Date): string {
  return `${date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'long', timeStyle: 'short' })} WIB`
}

export async function sendPaymentSuccessEmail(event: H3Event, order: AdminOrder, paidAt: Date): Promise<void> {
  const { sendMail } = useNodeMailer()
  const base = useRuntimeConfig(event).public.siteUrl.replace(/\/+$/, '')
  const link = `${base}/riwayat/${order.id}`
  const nama = order.customer.nama || order.customer.email.split('@')[0] || 'Pelanggan'
  const total = order.price === null ? '-' : formatRupiah(order.price)

  const intro = `Halo ${nama}, pembayaran untuk pesanan ${order.orderNo} sudah kami terima dan verifikasi. Pesananmu sekarang diproses dan kurir akan dijadwalkan menjemput paket.`
  const outro = `Simpan email ini sebagai bukti pembayaran. Status pengiriman bisa kamu pantau kapan saja di aplikasi ${MAIL_BRAND}.`
  const details: [string, string][] = [
    ['No. Pesanan', order.orderNo],
    ...(order.awb ? [['No. Resi', order.awb] as [string, string]] : []),
    ['Kurir', order.service ? `${order.courier} · ${order.service}` : order.courier],
    ['Rute', `${order.pickup} → ${order.delivery}`],
    ['Berat', order.weight],
    ['Metode Pembayaran', order.paymentMethod ?? '-'],
    ['Waktu Pembayaran', formatPaidAt(paidAt)],
    ['Total Dibayar', total]
  ]

  await sendMail({
    to: order.customer.email,
    subject: `Pembayaran berhasil · ${order.orderNo}`,
    text: [
      intro,
      '',
      ...details.map(([label, value]) => `${label}: ${value}`),
      '',
      `Lihat pesanan: ${link}`,
      '',
      outro
    ].join('\n'),
    html: mailLayout({ heading: 'Pembayaran berhasil', intro, details, button: 'Lihat Pesanan', link, outro })
  })
}
