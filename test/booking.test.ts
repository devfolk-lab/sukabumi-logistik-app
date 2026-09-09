import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { INSURANCE_FEE, useBookingStore } from '~/stores/booking'

describe('booking store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('starts with no courier selected', () => {
    const store = useBookingStore()
    expect(store.selectedCourier).toBeUndefined()
    expect(store.hasCourier).toBe(false)
    expect(store.total).toBe(0)
  })

  it('resolves the selected courier and its price as ongkir', () => {
    const store = useBookingStore()
    store.selectCourier('jnt')
    expect(store.hasCourier).toBe(true)
    expect(store.selectedCourier?.name).toBe('J&T Express')
    expect(store.ongkir).toBe(28000)
  })

  it('adds the insurance fee to the total only when insurance is on', () => {
    const store = useBookingStore()
    store.selectCourier('jnt')
    expect(store.asuransi).toBe(0)
    expect(store.total).toBe(28000)

    store.insurance = true
    expect(store.asuransi).toBe(INSURANCE_FEE)
    expect(store.total).toBe(28000 + INSURANCE_FEE)
  })

  it('swaps the pickup and delivery route points', () => {
    const store = useBookingStore()
    store.pickup = { city: 'Jakarta Selatan', area: 'Tebet' }
    store.delivery = { city: 'Surabaya', area: 'Wonokromo' }

    store.swapRoute()

    expect(store.pickup).toEqual({ city: 'Surabaya', area: 'Wonokromo' })
    expect(store.delivery).toEqual({ city: 'Jakarta Selatan', area: 'Tebet' })
  })

  it('clears every field on reset', () => {
    const store = useBookingStore()
    store.selectCourier('grab')
    store.insurance = true
    store.content = 'Dokumen'
    store.sender.nama = 'Fulan'

    store.reset()

    expect(store.hasCourier).toBe(false)
    expect(store.insurance).toBe(false)
    expect(store.content).toBe('')
    expect(store.sender.nama).toBe('')
  })

  it('ignores an unknown courier id', () => {
    const store = useBookingStore()
    store.selectCourier('does-not-exist')
    expect(store.hasCourier).toBe(false)
    expect(store.ongkir).toBe(0)
  })
})
