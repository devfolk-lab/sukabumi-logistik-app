<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useShipmentsStore } from '~/stores/shipments'

const auth = useAuthStore()
const shipments = useShipmentsStore()
</script>

<template>
  <div>
    <AppPageHero>
      <div class="flex items-start justify-between">
        <div>
          <p class="text-sm font-medium text-white/70">
            Selamat Pagi,
          </p>
          <h1 class="mt-0.5 flex items-center gap-1.5 text-2xl font-bold text-white">
            {{ auth.user?.nama ?? 'Fulan' }}
            <UIcon
              name="i-lucide-hand"
              class="size-5"
            />
          </h1>
        </div>
        <button
          type="button"
          class="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10"
          aria-label="Notifikasi"
        >
          <span
            v-ripple
            class="absolute inset-0 rounded-2xl"
          />
          <UIcon
            name="i-lucide-bell"
            class="relative z-10 size-5 text-white pointer-events-none"
          />
          <span class="pointer-events-none absolute -top-1.5 -right-1.5 z-20 flex size-6 items-center justify-center rounded-full border-2 border-[#002144] bg-red-500 text-sm font-bold text-white">3</span>
        </button>
      </div>
    </AppPageHero>

    <AppPageContent class="-mt-4 relative z-20">
      <HomeSearch />
    </AppPageContent>

    <AppPageContent class="mt-6">
      <HomeQuickActions />
    </AppPageContent>

    <AppPageContent class="mt-6">
      <HomePartnerCarriers />
    </AppPageContent>

    <AppPageContent class="mt-6 mb-6">
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
      <div class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5">
        <HomeActiveShipmentCard
          v-for="shipment in shipments.active"
          :key="shipment.resi"
          :shipment="shipment"
        />
      </div>
    </AppPageContent>
  </div>
</template>
