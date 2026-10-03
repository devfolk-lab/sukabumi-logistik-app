<script setup lang="ts">
import type { TourStep } from '~/components/app/AppTour.vue'

definePageMeta({ refreshKeys: ['profile', 'shipments', 'orders', 'stats'] })

const { data: profile } = useProfile()
const { data: shipments, status } = useActiveShipments()
const { data: orders, status: ordersStatus } = useOrders()

// The home screen only teases the history; the riwayat page has the full list.
const recentOrders = computed(() => orders.value.slice(0, 3))

// Shown once to a new account: what each part of the home screen is for.
const tourSteps: TourStep[] = [
  { target: 'kirim', title: 'Kirim Paket', body: 'Mulai pengiriman di sini: pilih lokasi jemput dan tujuan, isi detail barang, lalu bandingkan tarif kurir.' },
  { target: 'lacak', title: 'Lacak Pengiriman', body: 'Masukkan nomor resi untuk melihat posisi paket dan riwayat perjalanannya.' },
  { target: 'alamat', title: 'Alamat Tersimpan', body: 'Simpan alamat yang sering dipakai supaya tidak perlu mengetik ulang setiap kali mengirim.' },
  { target: 'aktif', title: 'Pengiriman Aktif', body: 'Paket yang sedang dalam perjalanan tampil di sini. Ketuk salah satunya untuk melihat statusnya.' },
  { target: 'riwayat', title: 'Riwayat Pengiriman', body: 'Semua pesananmu, termasuk yang sudah selesai atau dibatalkan. Buka pesanan untuk mencetak resi atau mengirim lagi.' }
]

const salam = computed(() => {
  const jam = new Date().getHours()
  if (jam < 11) return 'Selamat Pagi,'
  if (jam < 15) return 'Selamat Siang,'
  if (jam < 19) return 'Selamat Sore,'
  return 'Selamat Malam,'
})
</script>

<template>
  <div>
    <AppPageHero>
      <div>
        <p class="text-sm font-medium text-white/70">
          {{ salam }}
        </p>
        <h1 class="mt-0.5 flex items-center gap-1.5 text-2xl font-bold text-white">
          <USkeleton
            v-if="!profile"
            class="h-7 w-40 rounded-lg bg-white/15"
          />
          <template v-else>
            {{ profile.nama }}
            <span
              class="text-xl"
              aria-hidden="true"
            >👋</span>
          </template>
        </h1>
      </div>
    </AppPageHero>

    <AppPageContent class="relative z-20 -mt-4">
      <HomeQuickActions />
    </AppPageContent>

    <AppPageContent
      class="mt-6 mb-6"
      data-tour="aktif"
    >
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-base font-bold text-gray-800">
          Pengiriman Aktif
        </h2>
        <NuxtLink
          v-ripple.dark
          to="/lacak"
          class="rounded-lg px-2 py-1 text-sm font-semibold text-primary"
        >
          Lihat Semua
        </NuxtLink>
      </div>
      <div
        v-if="status === 'pending'"
        class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5"
      >
        <USkeleton
          v-for="n in 2"
          :key="n"
          class="h-24 rounded-3xl"
        />
      </div>
      <div
        v-else-if="shipments.length"
        class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5"
      >
        <NuxtLink
          v-for="shipment in shipments"
          :key="shipment.resi"
          v-ripple.dark
          :to="{ path: `/lacak/${shipment.resi}`, query: { courier: shipment.courierCode } }"
          class="block rounded-3xl"
        >
          <HomeActiveShipmentCard
            :shipment="shipment"
            class="pointer-events-none"
          />
        </NuxtLink>
      </div>
      <div
        v-else
        class="rounded-3xl bg-white p-6 text-center shadow-card lg:shadow-card-flat"
      >
        <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-50">
          <UIcon
            name="i-lucide-package"
            class="size-6 text-primary"
          />
        </div>
        <p class="mt-3 text-base font-bold text-gray-800">
          Belum ada pengiriman aktif
        </p>
        <p class="mt-1 text-sm text-gray-500">
          Kirim paket pertamamu, statusnya akan tampil di sini.
        </p>
        <UButton
          v-ripple
          to="/kirim"
          size="lg"
          class="mt-4 font-bold"
        >
          Kirim Paket
        </UButton>
      </div>
    </AppPageContent>

    <AppPageContent
      class="mb-6"
      data-tour="riwayat"
    >
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-base font-bold text-gray-800">
          Riwayat Pengiriman
        </h2>
        <NuxtLink
          v-ripple.dark
          to="/riwayat"
          class="rounded-lg px-2 py-1 text-sm font-semibold text-primary"
        >
          Lihat Semua
        </NuxtLink>
      </div>
      <div
        v-if="ordersStatus === 'pending' || ordersStatus === 'idle'"
        class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5"
      >
        <USkeleton
          v-for="n in 3"
          :key="n"
          class="h-28 rounded-3xl"
        />
      </div>
      <div
        v-else-if="recentOrders.length"
        class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5"
      >
        <RiwayatCard
          v-for="order in recentOrders"
          :key="order.id"
          :order="order"
        />
      </div>
      <div
        v-else
        class="rounded-3xl bg-white p-6 text-center shadow-card lg:shadow-card-flat"
      >
        <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gray-50">
          <UIcon
            name="i-lucide-history"
            class="size-6 text-gray-400"
          />
        </div>
        <p class="mt-3 text-base font-bold text-gray-800">
          Belum ada riwayat
        </p>
        <p class="mt-1 text-sm text-gray-500">
          Pesanan yang sudah selesai atau dibatalkan tampil di sini.
        </p>
      </div>
    </AppPageContent>

    <AppTour
      name="home-v1"
      :steps="tourSteps"
    />
  </div>
</template>
