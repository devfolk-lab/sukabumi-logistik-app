<script setup lang="ts">
import type { Courier, CourierType } from '~/types'
import { useBookingStore } from '~/stores/booking'

const booking = useBookingStore()
const nav = useAppNav()

if (!booking.hasRoute) {
  await navigateTo('/kirim', { replace: true })
}

const filter = ref<CourierType | 'all'>('all')

const request = useRequestFetch()

const { data: rates, status, error } = await useAsyncData(
  'rates',
  () => request<Courier[]>('/api/couriers/rates', {
    method: 'POST',
    body: {
      originId: booking.origin!.id,
      destinationId: booking.destination!.id,
      weightGram: booking.weightGram
    }
  }),
  {
    default: () => [],
    // Re-price whenever the route or weight changes.
    watch: [() => booking.origin?.id, () => booking.destination?.id, () => booking.weightGram]
  }
)

const couriers = computed(() =>
  filter.value === 'all' ? rates.value : rates.value.filter(c => c.type === filter.value)
)

function select(courier: Courier) {
  booking.selectCourier(courier)
}
</script>

<template>
  <div>
    <AppPageHero sticky>
      <div class="space-y-3">
        <div class="mb-1 flex items-center gap-4">
          <button
            type="button"
            class="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10"
            @click="nav.back('/kirim')"
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
          <div>
            <h1 class="text-xl font-bold text-white">
              Pilih Kurir
            </h1>
            <p class="text-sm text-white/60">
              Sukabumi Logistik — {{ rates.length }} layanan tersedia
            </p>
          </div>
        </div>

        <MitraRouteCard />
      </div>
    </AppPageHero>

    <AppPageContent class="mt-4 pb-2">
      <MitraFilterTabs v-model="filter" />
    </AppPageContent>

    <AppPageContent class="pb-3">
      <p class="text-sm text-gray-500">
        <span class="font-bold text-gray-700">{{ couriers.length }}</span> layanan ditemukan
      </p>
    </AppPageContent>

    <AppPageContent class="pb-40">
      <div
        v-if="status === 'pending'"
        class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5"
      >
        <USkeleton
          v-for="n in 4"
          :key="n"
          class="h-40 rounded-3xl"
        />
      </div>
      <div
        v-else-if="error"
        class="rounded-3xl bg-white p-6 text-center shadow-card lg:shadow-card-flat"
      >
        <UIcon
          name="i-lucide-triangle-alert"
          class="mx-auto size-8 text-amber-500"
        />
        <p class="mt-3 text-base font-bold text-gray-800">
          Gagal mengambil ongkir
        </p>
        <p class="mt-1 text-sm text-gray-500">
          {{ apiMessage(error, 'Coba lagi sebentar.') }}
        </p>
      </div>
      <p
        v-else-if="!couriers.length"
        class="rounded-3xl bg-white p-6 text-center text-sm text-gray-500 shadow-card lg:shadow-card-flat"
      >
        Tidak ada layanan kurir untuk rute dan berat ini.
      </p>
      <div
        v-else
        class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5"
      >
        <MitraCard
          v-for="courier in couriers"
          :key="courier.id"
          :courier="courier"
          :selected="booking.selectedCourier?.id === courier.id"
          @select="select"
        />
      </div>
    </AppPageContent>

    <AppStickyBar>
      <div class="w-full">
        <MitraSummaryBar />
        <button
          type="button"
          class="relative flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] py-4 text-lg font-bold text-white shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="!booking.hasCourier"
          @click="navigateTo('/kirim/detail')"
        >
          <span
            v-ripple
            class="absolute inset-0 rounded-2xl"
          />
          <span class="relative z-10 pointer-events-none">Lanjutkan</span>
          <UIcon
            name="i-lucide-arrow-right"
            class="relative z-10 size-4 pointer-events-none"
          />
        </button>
      </div>
    </AppStickyBar>
  </div>
</template>
