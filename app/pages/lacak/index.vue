<script setup lang="ts">
import type { Shipment } from '~/types'

const nav = useAppNav()
const { data: shipments, status } = await useActiveShipments()

function progress(shipment: Shipment): number {
  const done = shipment.timeline.filter(s => s.done).length
  return Math.round((done / shipment.timeline.length) * 100)
}
</script>

<template>
  <div>
    <AppPageHero>
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10"
          @click="nav.back('/')"
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
            Lacak Pengiriman
          </h1>
          <p class="text-sm text-white/60">
            Sukabumi Logistik
          </p>
        </div>
      </div>
    </AppPageHero>

    <AppPageContent class="mt-5 space-y-5 pb-10">
      <LacakTrackingSearch />

      <div>
        <h2 class="mb-3 text-base font-bold text-gray-800">
          Paket Sedang Berjalan
        </h2>
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
        <p
          v-else-if="!shipments.length"
          class="rounded-3xl bg-white p-6 text-center text-sm text-gray-500 shadow-card lg:shadow-card-flat"
        >
          Tidak ada paket yang sedang berjalan.
        </p>
        <div
          v-else
          class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5"
        >
          <NuxtLink
            v-for="shipment in shipments"
            :key="shipment.resi"
            v-ripple.dark
            :to="`/lacak/${shipment.resi}`"
            class="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-card lg:shadow-card-flat"
          >
            <div class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50">
              <UIcon
                name="i-lucide-package"
                class="size-6 text-primary"
              />
            </div>
            <div class="min-w-0 flex-1">
              <div class="flex items-start justify-between gap-2">
                <h4 class="truncate text-base font-bold text-gray-800">
                  {{ shipment.pickup.city }} → {{ shipment.delivery.city }}
                </h4>
                <UBadge
                  color="primary"
                  variant="subtle"
                  class="shrink-0 rounded-full"
                >
                  {{ shipment.status }}
                </UBadge>
              </div>
              <p class="mt-1 text-sm text-gray-500">
                #{{ shipment.resi }} • {{ shipment.courier }}
              </p>
              <div class="mt-2.5 flex items-center gap-3">
                <div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    class="h-full rounded-full bg-linear-to-r from-primary to-blue-500"
                    :style="{ width: progress(shipment) + '%' }"
                  />
                </div>
                <span class="shrink-0 text-sm font-semibold text-gray-400">{{ shipment.eta }}</span>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </AppPageContent>
  </div>
</template>
