import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAddressesStore } from '~/stores/addresses'

describe('addresses store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seeds two addresses with Rumah as the main one', () => {
    const store = useAddressesStore()
    expect(store.list).toHaveLength(2)
    expect(store.list.filter(a => a.main)).toHaveLength(1)
    expect(store.list.find(a => a.main)?.label).toBe('Rumah')
  })

  it('appends a new address with a fresh id and main false', () => {
    const store = useAddressesStore()
    const created = store.add({ label: 'Gudang', nama: 'Budi', telp: '0811', alamat: 'Jl. Test 1' })
    expect(store.list).toHaveLength(3)
    expect(created.id).toBe(3)
    expect(created.main).toBe(false)
  })

  it('keeps ids unique after a removal', () => {
    const store = useAddressesStore()
    store.remove(2)
    const created = store.add({ label: 'Gudang', nama: 'Budi', telp: '0811', alamat: 'Jl. Test 1' })
    expect(store.list.map(a => a.id)).toEqual([1, created.id])
    expect(created.id).not.toBe(1)
  })

  it('removes an address by id', () => {
    const store = useAddressesStore()
    store.remove(1)
    expect(store.list.map(a => a.id)).toEqual([2])
  })

  it('promotes exactly one address to main', () => {
    const store = useAddressesStore()
    store.setMain(2)
    expect(store.list.find(a => a.id === 2)?.main).toBe(true)
    expect(store.list.filter(a => a.main)).toHaveLength(1)
  })
})
