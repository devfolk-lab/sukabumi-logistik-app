import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useCouriersStore } from '~/stores/couriers'

describe('couriers store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seeds nine couriers', () => {
    expect(useCouriersStore().list).toHaveLength(9)
  })

  it('seeds ten home partner badges', () => {
    expect(useCouriersStore().partners).toHaveLength(10)
  })

  it('returns every courier for the "all" filter', () => {
    const store = useCouriersStore()
    expect(store.byType('all')).toHaveLength(9)
  })

  it('filters by type', () => {
    const store = useCouriersStore()
    expect(store.byType('instant').map(c => c.name)).toEqual(['GrabExpress', 'LalaMove'])
    expect(store.byType('sameday').map(c => c.name)).toEqual(['AnterAja'])
    expect(store.byType('regular')).toHaveLength(6)
  })

  it('looks a courier up by id', () => {
    const store = useCouriersStore()
    expect(store.byId('jnt')?.price).toBe(28000)
    expect(store.byId('nope')).toBeUndefined()
  })

  it('stores prices as integers', () => {
    for (const c of useCouriersStore().list) {
      expect(typeof c.price).toBe('number')
    }
  })
})
