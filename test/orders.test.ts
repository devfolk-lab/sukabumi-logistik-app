import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useOrdersStore } from '~/stores/orders'

describe('orders store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seeds four orders', () => {
    expect(useOrdersStore().list).toHaveLength(4)
  })

  it('returns everything for the "all" filter', () => {
    expect(useOrdersStore().byStatus('all')).toHaveLength(4)
  })

  it('filters by status', () => {
    const store = useOrdersStore()
    expect(store.byStatus('selesai')).toHaveLength(2)
    expect(store.byStatus('proses')).toHaveLength(1)
    expect(store.byStatus('batal')).toHaveLength(1)
  })

  it('looks an order up by id', () => {
    const store = useOrdersStore()
    expect(store.byId(1)?.resi).toBe('#SL-2026-8843')
    expect(store.byId(99)).toBeUndefined()
  })

  it('reports four completed steps for a finished order and two for one in progress', () => {
    const store = useOrdersStore()
    expect(store.stepsCompleted('selesai')).toBe(4)
    expect(store.stepsCompleted('proses')).toBe(2)
  })

  it('stores prices as integers', () => {
    for (const o of useOrdersStore().list) {
      expect(typeof o.price).toBe('number')
    }
  })
})
