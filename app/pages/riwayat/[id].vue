<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'

const route = useRoute()
const nav = useAppNav()
const orders = useOrdersStore()

const order = orders.byId(Number(route.params.id))

if (!order) {
  throw createError({ statusCode: 404, statusMessage: 'Pesanan tidak ditemukan', fatal: true })
}
</script>

<template>
  <div>
    <AppPageHero sticky>
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10"
          @click="nav.back('/riwayat')"
        >
          <span
            v-ripple
            class="absolute inset-0 rounded-xl"
          />
          <UIcon
            name="i-lucide-arrow-left"
            class="relative z-10 size-5 text-white pointer-events-none"
          />
        </button>
        <div class="min-w-0">
          <h1 class="truncate text-lg font-bold text-white">
            {{ order.resi }}
          </h1>
          <p class="text-sm text-white/60">
            {{ order.date }}
          </p>
        </div>
      </div>
    </AppPageHero>

    <AppPageContent class="mt-5 space-y-5 pb-32">
      <div
        v-if="order.status !== 'batal'"
        class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat"
      >
        <p class="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
          Status Pesanan
        </p>
        <RiwayatOrderStepper :completed="orders.stepsCompleted(order.status)" />
      </div>
      <div
        v-else
        class="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4"
      >
        <UIcon
          name="i-lucide-x"
          class="size-5 shrink-0 text-red-500"
        />
        <div>
          <p class="text-base font-bold text-red-700">
            Pesanan Dibatalkan
          </p>
          <p class="text-sm text-red-600">
            Dibatalkan sebelum dijemput kurir.
          </p>
        </div>
      </div>

      <!-- Route -->
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <p class="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
          Rute Pengiriman
        </p>
        <div class="grid grid-cols-[28px_1fr] gap-x-3">
          <div class="row-span-2 flex flex-col items-center">
            <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <div class="size-2.5 rounded-full bg-emerald-500" />
            </div>
            <div class="route-dash my-1.5 w-0.5 flex-1" />
            <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-50">
              <UIcon
                name="i-lucide-map-pin"
                class="size-4 text-primary"
              />
            </div>
          </div>
          <div class="min-w-0 pb-4">
            <p class="text-xs font-bold text-gray-400 uppercase">
              Lokasi Penjemputan
            </p>
            <p class="mt-1 text-base font-semibold text-gray-800">
              {{ order.pickup }}
            </p>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-gray-400 uppercase">
              Lokasi Tujuan
            </p>
            <p class="mt-1 text-base font-semibold text-gray-800">
              {{ order.delivery }}
            </p>
          </div>
        </div>
      </div>

      <!-- Package Details -->
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <p class="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
          Detail Paket
        </p>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase">
              Berat
            </p>
            <p class="mt-0.5 text-base font-bold text-gray-800">
              {{ order.weight }}
            </p>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase">
              Isi Paket
            </p>
            <p class="mt-0.5 text-base font-bold text-gray-800">
              {{ order.content }}
            </p>
          </div>
        </div>
      </div>

      <!-- Courier + Price -->
      <div class="relative overflow-hidden rounded-3xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] p-5 shadow-lg shadow-primary/20">
        <div class="absolute top-0 right-0 size-32 -translate-y-1/3 translate-x-1/4 rounded-full bg-white/5" />
        <div class="relative z-10 flex items-center justify-between">
          <div class="min-w-0">
            <p class="text-sm text-white/60">
              Kurir
            </p>
            <p class="truncate text-base font-bold text-white">
              {{ order.courier }}
            </p>
          </div>
          <p class="ml-2 shrink-0 text-xl font-extrabold text-white">
            {{ formatRupiah(order.price) }}
          </p>
        </div>
      </div>
    </AppPageContent>

    <AppStickyBar>
      <button
        type="button"
        class="relative flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] py-4 text-lg font-bold text-white shadow-lg shadow-primary/20"
        @click="navigateTo('/kirim')"
      >
        <span
          v-ripple
          class="absolute inset-0 rounded-2xl"
        />
        <span class="relative z-10 pointer-events-none">Pesan Lagi</span>
      </button>
    </AppStickyBar>
  </div>
</template>
