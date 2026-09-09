import { describe, expect, it } from 'vitest'
import { formatRupiah, normalizeResi } from '~/utils/format'

describe('formatRupiah', () => {
  it('formats with Indonesian thousand separators', () => {
    expect(formatRupiah(28000)).toBe('Rp 28.000')
  })

  it('formats zero', () => {
    expect(formatRupiah(0)).toBe('Rp 0')
  })

  it('formats values above one million', () => {
    expect(formatRupiah(1250000)).toBe('Rp 1.250.000')
  })
})

describe('normalizeResi', () => {
  it('uppercases and strips a leading hash', () => {
    expect(normalizeResi('#sl-2026-8843')).toBe('SL-2026-8843')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeResi('  SL-2026-8801  ')).toBe('SL-2026-8801')
  })

  it('returns an empty string for nullish input', () => {
    expect(normalizeResi('')).toBe('')
  })
})
