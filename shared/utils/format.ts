import type { OrderStage, OrderStatus } from '#shared/types'

export function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`
}

export function normalizeResi(v: string): string {
  return String(v || '').trim().toUpperCase().replace(/^#/, '')
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

/** e.g. "5 Sep 2026" */
export function formatTanggal(value: Date | string): string {
  const d = new Date(value)
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`
}

/** e.g. "5 Sep 2026, 09:15" */
export function formatWaktu(value: Date | string): string {
  const d = new Date(value)
  const jam = String(d.getHours()).padStart(2, '0')
  const menit = String(d.getMinutes()).padStart(2, '0')
  return `${formatTanggal(d)}, ${jam}:${menit}`
}

export function formatBerat(gram: number): string {
  return `${(gram / 1000).toFixed(1)} kg`
}

/** Collapses the six persisted stages into the three riwayat tabs. */
export function stageToStatus(stage: OrderStage): OrderStatus {
  if (stage === 'SELESAI') return 'selesai'
  if (stage === 'BATAL') return 'batal'
  return 'proses'
}

const STAGE_LABELS: Record<OrderStage, string> = {
  MENUNGGU_PEMBAYARAN: 'Menunggu Pembayaran',
  DIPROSES: 'Pesanan Diproses',
  DIJEMPUT: 'Paket Dijemput Kurir',
  DALAM_PERJALANAN: 'Sedang Dalam Perjalanan',
  SELESAI: 'Paket Sudah Diterima',
  BATAL: 'Pesanan Dibatalkan'
}

export function stageLabel(stage: OrderStage): string {
  return STAGE_LABELS[stage]
}
