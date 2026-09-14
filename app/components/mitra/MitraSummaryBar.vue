<script setup lang="ts">
import { useBookingStore } from '~/stores/booking'

const booking = useBookingStore()
</script>

<template>
  <div
    v-if="booking.hasCourier"
    class="mb-3 rounded-2xl border border-primary/10 bg-primary-50 p-3"
  >
    <div class="flex items-center justify-between">
      <div class="flex min-w-0 items-center gap-3">
        <AppCourierLogo
          v-if="booking.selectedCourier"
          :code="booking.selectedCourier.code"
          :brand="booking.selectedCourier.brand"
          class="size-10 rounded-xl text-xs"
        />
        <div class="min-w-0">
          <p class="truncate text-base font-bold text-primary">
            {{ booking.selectedCourier?.name }}
          </p>
          <p class="text-sm text-primary/70">
            {{ booking.selectedCourier?.service }} • {{ formatEtd(booking.selectedCourier?.etd) }}
          </p>
        </div>
      </div>
      <p class="ml-2 shrink-0 text-2xl font-extrabold text-primary">
        {{ formatRupiah(booking.ongkir) }}
      </p>
    </div>
  </div>
</template>
