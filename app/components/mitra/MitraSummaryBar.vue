<script setup lang="ts">
import { useBookingStore } from '~/stores/booking'

const booking = useBookingStore()

const typeLabels: Record<string, string> = { regular: 'Reguler', instant: 'Instan', sameday: 'Same Day' }

const typeLabel = computed(() => {
  const type = booking.selectedCourier?.type
  return type ? typeLabels[type] : ''
})
</script>

<template>
  <div
    v-if="booking.hasCourier"
    class="mb-3 rounded-2xl border border-primary/10 bg-primary-50 p-3"
  >
    <div class="flex items-center justify-between">
      <div class="flex min-w-0 items-center gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary">
          <UIcon
            name="i-lucide-check"
            class="size-4 text-white"
          />
        </div>
        <div class="min-w-0">
          <p class="truncate text-base font-bold text-primary">
            {{ booking.selectedCourier?.name }}
          </p>
          <p class="text-sm text-primary/70">
            {{ typeLabel }} • {{ booking.selectedCourier?.eta }}
          </p>
        </div>
      </div>
      <p class="ml-2 shrink-0 text-2xl font-extrabold text-primary">
        {{ formatRupiah(booking.ongkir) }}
      </p>
    </div>
  </div>
</template>
