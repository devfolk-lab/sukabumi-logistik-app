import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Courier, CourierType, PartnerBadge } from '~/types'

const TRUK = { label: 'Truk', icon: 'i-lucide-truck' }
const MOTOR = { label: 'Motor', icon: 'i-lucide-bike' }
const MOBIL = { label: 'Mobil', icon: 'i-lucide-car' }
const PESAWAT = { label: 'Pesawat', icon: 'i-lucide-plane' }

const BESOK = 'Jemput besok'
const HARI_INI = 'Jemput hari ini'

export const useCouriersStore = defineStore('couriers', () => {
  const list = ref<Courier[]>([
    { id: 'jnt', name: 'J&T Express', type: 'regular', price: 28000, eta: '2-3 hari', pickup: BESOK, insured: true, vehicle: TRUK, brand: { from: '#E31E24', to: '#b91c1c', initials: 'J&T' } },
    { id: 'sicepat', name: 'SiCepat Express', type: 'regular', price: 26500, eta: '2-3 hari', pickup: BESOK, insured: false, vehicle: TRUK, brand: { from: '#4B0082', to: '#36005c', initials: 'SICE' } },
    { id: 'grab', name: 'GrabExpress', type: 'instant', price: 45000, eta: '< 2 jam', pickup: HARI_INI, insured: false, vehicle: MOTOR, brand: { from: '#00B14F', to: '#008f3f', icon: 'i-lucide-bike' } },
    { id: 'jne', name: 'JNE Reguler', type: 'regular', price: 30000, eta: '3-4 hari', pickup: BESOK, insured: false, vehicle: TRUK, brand: { from: '#D40511', to: '#a5040d', initials: 'JNE' } },
    { id: 'anteraja', name: 'AnterAja', type: 'sameday', price: 38000, eta: '1 hari', pickup: HARI_INI, insured: false, vehicle: MOTOR, brand: { from: '#00A8E8', to: '#0086ba', initials: 'ANT' } },
    { id: 'ninja', name: 'Ninja Xpress', type: 'regular', price: 27000, eta: '2-3 hari', pickup: BESOK, insured: false, vehicle: TRUK, brand: { from: '#6B21A8', to: '#4c1579', initials: 'NIN' } },
    { id: 'lion', name: 'Lion Parcel', type: 'regular', price: 29000, eta: '2-4 hari', pickup: BESOK, insured: false, vehicle: PESAWAT, brand: { from: '#00A651', to: '#008542', icon: 'i-lucide-plane' } },
    { id: 'lalamove', name: 'LalaMove', type: 'instant', price: 52000, eta: '< 3 jam', pickup: HARI_INI, insured: false, vehicle: MOBIL, brand: { from: '#FF6B00', to: '#cc5500', icon: 'i-lucide-truck' } },
    { id: 'rpx', name: 'RPX Logistics', type: 'regular', price: 31000, eta: '2-3 hari', pickup: BESOK, insured: false, vehicle: TRUK, brand: { from: '#002144', to: '#001a35', initials: 'RPX' } }
  ])

  const partners = ref<PartnerBadge[]>([
    { label: 'DHL', initials: 'DHL', color: '#D40511', textClass: 'text-white' },
    { label: 'JNE', initials: 'JNE', color: '#D40511', textClass: 'text-white', courierId: 'jne' },
    { label: 'Tiki', initials: 'TIKI', color: '#0066CC', textClass: 'text-white' },
    { label: 'J&T', initials: 'J&T', color: '#E31E24', textClass: 'text-white', courierId: 'jnt' },
    { label: 'Pos', initials: 'POS', color: '#FDB913', textClass: 'text-primary' },
    { label: 'SiCepat', initials: 'SICE', color: '#4B0082', textClass: 'text-white', courierId: 'sicepat' },
    { label: 'Lion', icon: 'i-lucide-plane', color: '#00A651', textClass: 'text-white', courierId: 'lion' },
    { label: 'Grab', initials: 'GRAB', color: '#00B14F', textClass: 'text-white', courierId: 'grab' },
    { label: 'Gojek', icon: 'i-lucide-bike', color: '#00AA13', textClass: 'text-white' },
    { label: 'Anteraja', initials: 'ANT', color: '#00A8E8', textClass: 'text-white', courierId: 'anteraja' }
  ])

  function byType(type: CourierType | 'all'): Courier[] {
    return type === 'all' ? list.value : list.value.filter(c => c.type === type)
  }

  function byId(id: string): Courier | undefined {
    return list.value.find(c => c.id === id)
  }

  return { list, partners, byType, byId }
})
