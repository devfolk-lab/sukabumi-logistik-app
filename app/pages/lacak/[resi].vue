<script setup lang="ts">
import type { Shipment } from '~/types'

const route = useRoute()
const nav = useAppNav()

const resi = computed(() => normalizeResi(String(route.params.resi)))

const request = useRequestFetch()

const { data: shipment } = await useAsyncData(
  () => `shipment-${resi.value}`,
  () => request<Shipment>(`/api/shipments/${resi.value}`)
)

if (!shipment.value) {
  throw createError({ statusCode: 404, statusMessage: 'Resi tidak ditemukan', fatal: true })
}
</script>

<template>
  <div>
    <AppPageHero sticky>
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10"
          @click="nav.back('/lacak')"
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
            #{{ shipment?.resi }}
          </h1>
          <p class="text-sm text-white/60">
            Detail progress paket
          </p>
        </div>
      </div>
    </AppPageHero>

    <AppPageContent class="mt-5 space-y-5 pb-10">
      <!-- Current status hero -->
      <div class="relative overflow-hidden rounded-3xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] p-5 shadow-lg shadow-primary/20">
        <div class="absolute top-0 right-0 size-32 -translate-y-1/3 translate-x-1/4 rounded-full bg-white/5" />
        <div class="relative z-10">
          <p class="text-sm font-semibold text-white/60 uppercase tracking-wide">
            Status Saat Ini
          </p>
          <p class="mt-1 text-xl font-bold text-white">
            {{ shipment?.status }}
          </p>
          <p class="mt-2 text-sm text-white/70">
            {{ shipment?.eta }}
          </p>
        </div>
      </div>

      <!-- Progress timeline -->
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <p class="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
          Perjalanan Paket
        </p>
        <LacakTrackingTimeline :steps="shipment?.timeline ?? []" />
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
              {{ shipment?.pickup.city }}, {{ shipment?.pickup.area }}
            </p>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-gray-400 uppercase">
              Lokasi Tujuan
            </p>
            <p class="mt-1 text-base font-semibold text-gray-800">
              {{ shipment?.delivery.city }}, {{ shipment?.delivery.area }}
            </p>
          </div>
        </div>
      </div>

      <!-- Package details -->
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
              {{ shipment?.weight }}
            </p>
          </div>
          <div>
            <p class="text-xs font-semibold text-gray-400 uppercase">
              Isi Paket
            </p>
            <p class="mt-0.5 text-base font-bold text-gray-800">
              {{ shipment?.content }}
            </p>
          </div>
        </div>
      </div>

      <!-- Courier + price -->
      <div class="flex items-center justify-between gap-3 rounded-3xl bg-white p-4 shadow-card lg:shadow-card-flat">
        <div class="min-w-0">
          <p class="text-xs font-semibold text-gray-400 uppercase">
            Kurir
          </p>
          <p class="truncate text-base font-bold text-gray-800">
            {{ shipment?.courier }}
          </p>
        </div>
        <p class="shrink-0 text-xl font-extrabold text-primary">
          {{ formatRupiah(shipment?.price ?? 0) }}
        </p>
      </div>

      <button
        v-ripple.dark
        type="button"
        class="w-full rounded-2xl border-2 border-gray-200 bg-white py-3.5 text-base font-bold text-gray-700"
        @click="navigateTo('/lacak')"
      >
        Kembali ke Lacak Pengiriman
      </button>
    </AppPageContent>
  </div>
</template>
