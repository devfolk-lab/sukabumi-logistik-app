<script setup lang="ts">
import type { CourierType } from '~/types'
import { useBookingStore } from '~/stores/booking'
import { useCouriersStore } from '~/stores/couriers'

const booking = useBookingStore()
const couriersStore = useCouriersStore()
const nav = useAppNav()

const filter = ref<CourierType | 'all'>('all')
const couriers = computed(() => couriersStore.byType(filter.value))
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
              Sukabumi Logistik — {{ couriersStore.list.length }} mitra tersedia
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
        <span class="font-bold text-gray-700">{{ couriers.length }}</span> kurir ditemukan
      </p>
    </AppPageContent>

    <AppPageContent class="pb-40">
      <div class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
        <MitraCard
          v-for="courier in couriers"
          :key="courier.id"
          :courier="courier"
          :selected="booking.selectedCourierId === courier.id"
          @select="booking.selectCourier"
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
