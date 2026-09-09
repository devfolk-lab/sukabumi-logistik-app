import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Shipment } from '~/types'
import { normalizeResi } from '~/utils/format'

export const useShipmentsStore = defineStore('shipments', () => {
  const list = ref<Shipment[]>([
    {
      resi: 'SL-2026-8843',
      courier: 'J&T Express',
      price: 28000,
      weight: '2.5 kg',
      content: 'Skin Care, Pakaian',
      pickup: { city: 'Jakarta Selatan', area: 'Tebet' },
      delivery: { city: 'Surabaya', area: 'Wonokromo' },
      status: 'Paket Sudah Diterima',
      eta: 'Diterima 7 Sep 2026, 10:20',
      timeline: [
        { title: 'Pesanan Dibuat', location: 'Jakarta Selatan, Tebet', time: '5 Sep 2026, 09:15', done: true },
        { title: 'Paket Dijemput Kurir', location: 'Jakarta Selatan, Tebet', time: '5 Sep 2026, 11:40', done: true },
        { title: 'Tiba di Gudang Sortir', location: 'Jakarta Timur', time: '5 Sep 2026, 16:20', done: true },
        { title: 'Tiba di Kota Tujuan', location: 'Surabaya', time: '6 Sep 2026, 20:10', done: true },
        { title: 'Paket Diterima', location: 'Surabaya, Wonokromo', time: '7 Sep 2026, 10:20', done: true }
      ]
    },
    {
      resi: 'SL-2026-8801',
      courier: 'SiCepat Express',
      price: 26500,
      weight: '1.2 kg',
      content: 'Dokumen Penting',
      pickup: { city: 'Jakarta Selatan', area: 'Tebet' },
      delivery: { city: 'Bandung', area: 'Cibiru' },
      status: 'Sedang Dalam Perjalanan',
      eta: 'Estimasi tiba besok, sebelum 18:00',
      timeline: [
        { title: 'Pesanan Dibuat', location: 'Jakarta Selatan, Tebet', time: '3 Sep 2026, 08:05', done: true },
        { title: 'Paket Dijemput Kurir', location: 'Jakarta Selatan, Tebet', time: '3 Sep 2026, 10:30', done: true },
        { title: 'Tiba di Gudang Sortir', location: 'Jakarta Timur', time: '3 Sep 2026, 15:00', done: true },
        { title: 'Dalam Perjalanan ke Kota Tujuan', location: 'Menuju Bandung', time: '4 Sep 2026, 07:15', done: false, current: true },
        { title: 'Tiba di Kota Tujuan', location: 'Bandung', time: 'Menunggu', done: false },
        { title: 'Paket Diterima', location: 'Bandung, Cibiru', time: 'Menunggu', done: false }
      ]
    },
    {
      resi: 'SL-2026-9002',
      courier: 'DHL Express',
      price: 65000,
      weight: '3.0 kg',
      content: 'Peralatan Kantor',
      pickup: { city: 'Jakarta Selatan', area: 'Tebet' },
      delivery: { city: 'Surabaya', area: 'Gubeng' },
      status: 'Paket Sedang Diantar',
      eta: 'Estimasi tiba hari ini, sebelum 15:00',
      timeline: [
        { title: 'Pesanan Dibuat', location: 'Jakarta Selatan, Tebet', time: '6 Sep 2026, 09:00', done: true },
        { title: 'Paket Dijemput Kurir', location: 'Jakarta Selatan, Tebet', time: '6 Sep 2026, 11:10', done: true },
        { title: 'Tiba di Gudang Sortir', location: 'Jakarta Timur', time: '6 Sep 2026, 17:30', done: true },
        { title: 'Tiba di Kota Tujuan', location: 'Surabaya', time: '8 Sep 2026, 06:00', done: true },
        { title: 'Paket Sedang Diantar ke Alamat Tujuan', location: 'Surabaya, Gubeng', time: '9 Sep 2026, 08:45', done: false, current: true },
        { title: 'Paket Diterima', location: 'Surabaya, Gubeng', time: 'Menunggu', done: false }
      ]
    },
    {
      resi: 'SL-2026-9010',
      courier: 'Lion Parcel',
      price: 120000,
      weight: '0.8 kg',
      content: 'Dokumen Ekspor',
      pickup: { city: 'Denpasar', area: 'Bali' },
      delivery: { city: 'Singapura', area: 'Changi' },
      status: 'Baru Dijemput Kurir',
      eta: 'Estimasi tiba 2-3 hari kerja',
      timeline: [
        { title: 'Pesanan Dibuat', location: 'Denpasar, Bali', time: '9 Sep 2026, 07:30', done: true },
        { title: 'Paket Dijemput Kurir', location: 'Denpasar, Bali', time: '9 Sep 2026, 09:00', done: false, current: true },
        { title: 'Tiba di Gudang Sortir', location: 'Denpasar', time: 'Menunggu', done: false },
        { title: 'Proses Bea Cukai', location: 'Ekspor', time: 'Menunggu', done: false },
        { title: 'Tiba di Negara Tujuan', location: 'Singapura', time: 'Menunggu', done: false },
        { title: 'Paket Diterima', location: 'Singapura, Changi', time: 'Menunggu', done: false }
      ]
    }
  ])

  const active = computed(() => list.value.filter(s => !s.timeline.at(-1)?.done))

  function findByResi(input: string): Shipment | undefined {
    const key = normalizeResi(input)
    return list.value.find(s => s.resi === key)
  }

  return { list, active, findByResi }
})
