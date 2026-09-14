<script setup lang="ts">
import type { Shipment } from '~/types'

const route = useRoute()
const nav = useAppNav()

const resi = computed(() => normalizeResi(String(route.params.resi)))
// Carried over from the search so an external waybill is not re-probed
// against every carrier on every visit.
const courier = computed(() => {
  const value = String(route.query.courier ?? '').toLowerCase()
  return isAllowedCourier(value) ? value : undefined
})

const request = useRequestFetch()

const { data: shipment, status, error, refresh } = useAsyncData(
  () => `shipment-${resi.value}-${courier.value ?? 'auto'}`,
  () => request<Shipment>(`/api/shipments/${resi.value}`, {
    query: courier.value ? { courier: courier.value } : {}
  }),
  { lazy: true }
)

const loading = computed(() => status.value === 'pending' || status.value === 'idle')
/** Booked here, so price, weight and contents are known. */
const ownOrder = computed(() => Boolean(shipment.value?.orderId))
</script>

<template>
  <div>
    <AppPageHero sticky>
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
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
            #{{ shipment?.resi ?? resi }}
          </h1>
          <p class="text-sm text-white/60">
            {{ shipment?.courier ?? 'Detail progress paket' }}
          </p>
        </div>
      </div>
    </AppPageHero>

    <AppPageContent
      v-if="loading"
      class="mt-5 space-y-5 pb-10"
    >
      <USkeleton class="h-28 rounded-3xl" />
      <USkeleton class="h-64 rounded-3xl" />
      <USkeleton class="h-36 rounded-3xl" />
    </AppPageContent>

    <AppPageContent
      v-else-if="error || !shipment"
      class="mt-5 pb-10"
    >
      <AppNotFound
        title="Resi tidak ditemukan"
        :description="apiMessage(error, 'Periksa lagi nomor resinya, atau cari dari daftar paket yang sedang berjalan.')"
        back-label="Kembali ke Lacak Pengiriman"
        back-to="/lacak"
        :retry="refresh"
      />
    </AppPageContent>

    <AppPageContent
      v-else
      class="mt-5 space-y-5 pb-10"
    >
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
              {{ shipment?.pickup.city }}
            </p>
            <p class="text-sm text-gray-500">
              {{ shipment?.pickup.area }}
            </p>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-gray-400 uppercase">
              Lokasi Tujuan
            </p>
            <p class="mt-1 text-base font-semibold text-gray-800">
              {{ shipment?.delivery.city }}
            </p>
            <p class="text-sm text-gray-500">
              {{ shipment?.delivery.area }}
            </p>
          </div>
        </div>
      </div>

      <!-- Package details: only known for shipments booked here -->
      <div
        v-if="ownOrder"
        class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat"
      >
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
        <AppCourierLogo
          :code="shipment.courierCode"
          class="size-12 rounded-xl text-sm"
        />
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold text-gray-400 uppercase">
            Kurir
          </p>
          <p class="truncate text-base font-bold text-gray-800">
            {{ shipment?.courier }}
          </p>
        </div>
        <p
          v-if="shipment.price !== null"
          class="shrink-0 text-xl font-extrabold text-primary"
        >
          {{ formatRupiah(shipment.price) }}
        </p>
        <UButton
          v-else-if="shipment.orderId"
          :to="`/riwayat/${shipment.orderId}`"
          color="primary"
          variant="soft"
          size="lg"
          class="shrink-0 font-bold"
        >
          Lihat Pesanan
        </UButton>
      </div>

      <div
        v-if="!ownOrder"
        class="flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3"
      >
        <UIcon
          name="i-lucide-info"
          class="mt-0.5 size-4 shrink-0 text-blue-600"
        />
        <p class="text-sm text-blue-800">
          Paket ini tidak dipesan lewat Sukabumi Logistik. Data di atas diambil langsung dari kurir.
        </p>
      </div>

      <button
        v-ripple.dark
        type="button"
        class="w-full rounded-2xl border-2 border-gray-200 bg-white py-3.5 text-base font-bold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
        @click="navigateTo('/lacak')"
      >
        Kembali ke Lacak Pengiriman
      </button>
    </AppPageContent>
  </div>
</template>
