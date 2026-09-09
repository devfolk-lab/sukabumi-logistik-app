export function formatRupiah(n: number): string {
  return `Rp ${n.toLocaleString('id-ID')}`
}

export function normalizeResi(v: string): string {
  return String(v || '').trim().toUpperCase().replace(/^#/, '')
}
