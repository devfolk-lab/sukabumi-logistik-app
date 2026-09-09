import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Order, OrderStatus } from '~/types'

export const useOrdersStore = defineStore('orders', () => {
  const list = ref<Order[]>([
    { id: 1, resi: '#SL-2026-8843', status: 'selesai', date: '5 Sep 2026', pickup: 'Jakarta Selatan, Tebet', delivery: 'Surabaya, Wonokromo', courier: 'J&T Express', price: 28000, weight: '2.5 kg', content: 'Skin Care, Pakaian' },
    { id: 2, resi: '#SL-2026-8801', status: 'proses', date: '3 Sep 2026', pickup: 'Jakarta Selatan, Tebet', delivery: 'Bandung, Cibiru', courier: 'SiCepat Express', price: 26500, weight: '1.2 kg', content: 'Dokumen Penting' },
    { id: 3, resi: '#SL-2026-8790', status: 'selesai', date: '28 Agu 2026', pickup: 'Jakarta Selatan, Tebet', delivery: 'Semarang, Pedurungan', courier: 'GrabExpress', price: 45000, weight: '0.8 kg', content: 'Aksesoris Fashion' },
    { id: 4, resi: '#SL-2026-8765', status: 'batal', date: '20 Agu 2026', pickup: 'Jakarta Selatan, Tebet', delivery: 'Denpasar, Bali', courier: 'JNE Reguler', price: 30000, weight: '3.0 kg', content: 'Peralatan Elektronik' }
  ])

  function byId(id: number): Order | undefined {
    return list.value.find(o => o.id === id)
  }

  function byStatus(status: OrderStatus | 'all'): Order[] {
    return status === 'all' ? list.value : list.value.filter(o => o.status === status)
  }

  function stepsCompleted(status: OrderStatus): number {
    return status === 'selesai' ? 4 : 2
  }

  return { list, byId, byStatus, stepsCompleted }
})
