import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useShipmentsStore } from '~/stores/shipments'

describe('shipments store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seeds four shipments', () => {
    expect(useShipmentsStore().list).toHaveLength(4)
  })

  it('finds a shipment by exact resi', () => {
    const store = useShipmentsStore()
    expect(store.findByResi('SL-2026-8843')?.courier).toBe('J&T Express')
  })

  it('finds a shipment despite a leading hash, lowercase and whitespace', () => {
    const store = useShipmentsStore()
    expect(store.findByResi('  #sl-2026-8801 ')?.courier).toBe('SiCepat Express')
  })

  it('returns undefined for an unknown resi', () => {
    expect(useShipmentsStore().findByResi('SL-0000-0000')).toBeUndefined()
  })

  it('exposes only in-progress shipments as active', () => {
    const store = useShipmentsStore()
    const resis = store.active.map(s => s.resi)
    expect(resis).not.toContain('SL-2026-8843')
    expect(resis).toContain('SL-2026-8801')
  })

  it('gives every shipment a timeline whose last step is delivery', () => {
    for (const s of useShipmentsStore().list) {
      expect(s.timeline.length).toBeGreaterThan(0)
      expect(s.timeline.at(-1)!.title).toMatch(/Diterima/)
    }
  })
})
