<script setup lang="ts">
import { useBookingStore } from '~/stores/booking'

const booking = useBookingStore()

const pickupNote = ref('')
const deliveryNote = ref('')
const locationNote = ref('')
</script>

<template>
  <div>
    <div class="flex items-center justify-between rounded-3xl bg-white p-4 shadow-card lg:shadow-card-flat">
      <div class="flex items-center gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
          <UIcon
            name="i-lucide-zap"
            class="text-orange-500"
          />
        </div>
        <div>
          <p class="text-sm font-bold text-gray-800">
            Kurir Instan
          </p>
          <p class="text-sm text-gray-500">
            GrabExpress / LalaMove
          </p>
        </div>
      </div>
      <USwitch v-model="booking.instant" />
    </div>

    <div
      v-show="booking.instant"
      class="mt-5 space-y-3 rounded-3xl border border-orange-100 bg-orange-50 p-4 shadow-card lg:shadow-card-flat"
    >
      <p class="text-sm font-bold uppercase tracking-wider text-orange-700">
        Detail Kurir Instan
      </p>
      <UInput
        v-model="pickupNote"
        placeholder="Alamat jemput detail (warna pagar, lantai...)"
        size="xl"
        class="w-full"
      />
      <UInput
        v-model="deliveryNote"
        placeholder="Alamat tujuan detail (warna pagar, lantai...)"
        size="xl"
        class="w-full"
      />
      <UInput
        v-model="locationNote"
        placeholder="Info lokasi (contoh: gerbang biru, lantai 2)"
        size="xl"
        class="w-full"
      />
    </div>
  </div>
</template>
