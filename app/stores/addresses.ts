import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Address } from '~/types'

export const useAddressesStore = defineStore('addresses', () => {
  const list = ref<Address[]>([
    { id: 1, label: 'Rumah', main: true, nama: 'Fulan', telp: '0812-3456-7890', alamat: 'Jl. Tebet Barat Dalam No. 12, RT 04/RW 02, Tebet, Jakarta Selatan, 12810' },
    { id: 2, label: 'Kantor', main: false, nama: 'Fulan', telp: '0812-3456-7890', alamat: 'Jl. Sudirman Kav. 25, Lantai 8, Jakarta Pusat, 10220' }
  ])

  const nextId = ref(3)

  function add(input: Omit<Address, 'id' | 'main'>): Address {
    const created: Address = { ...input, id: nextId.value++, main: false }
    list.value.push(created)
    return created
  }

  function remove(id: number): void {
    list.value = list.value.filter(a => a.id !== id)
  }

  function setMain(id: number): void {
    for (const a of list.value) {
      a.main = a.id === id
    }
  }

  return { list, add, remove, setMain }
})
