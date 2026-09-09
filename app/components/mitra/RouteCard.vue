<script setup lang="ts">
import { useBookingStore } from '~/stores/booking'

const booking = useBookingStore()

const spinning = ref(false)

function swap(): void {
  booking.swapRoute()
  spinning.value = true
  setTimeout(() => (spinning.value = false), 300)
}
</script>

<template>
  <div class="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
    <div class="grid grid-cols-[24px_1fr_44px] gap-x-2">
      <!-- Marker spine -->
      <div class="row-span-2 flex flex-col items-center">
        <div class="flex size-6 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/20">
          <span
            class="text-xs text-emerald-400"
            aria-hidden="true"
          >●</span>
        </div>
        <div class="route-dash-light my-1 w-0.5 flex-1" />
        <div class="flex size-6 shrink-0 items-center justify-center rounded-lg border border-secondary/30 bg-secondary/20">
          <UIcon
            name="i-lucide-map-pin"
            class="size-3.5 text-secondary"
          />
        </div>
      </div>

      <!-- Pickup -->
      <div class="min-w-0 pb-2.5">
        <p class="truncate text-base font-bold text-white">
          {{ booking.pickup.city }}
        </p>
        <p class="truncate text-sm text-white/50">
          {{ booking.pickup.area }}
        </p>
      </div>

      <!-- Swap -->
      <button
        type="button"
        class="relative row-span-2 flex size-11 shrink-0 items-center justify-center self-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
        aria-label="Tukar rute"
        @click="swap"
      >
        <span
          v-ripple
          class="absolute inset-0 rounded-full"
        />
        <UIcon
          name="i-lucide-arrow-left-right"
          class="relative z-10 size-4.5 text-white/70 transition-transform duration-300 pointer-events-none"
          :class="spinning ? 'rotate-180' : ''"
        />
      </button>

      <!-- Delivery -->
      <div class="min-w-0">
        <p class="truncate text-base font-bold text-white">
          {{ booking.delivery.city }}
        </p>
        <p class="truncate text-sm text-white/50">
          {{ booking.delivery.area }}
        </p>
      </div>
    </div>
  </div>
</template>
