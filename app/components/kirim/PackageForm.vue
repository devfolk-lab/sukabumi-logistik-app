<script setup lang="ts">
import { useBookingStore } from '~/stores/booking'

const booking = useBookingStore()
</script>

<template>
  <div class="space-y-5">
    <!-- Route -->
    <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
      <div class="grid grid-cols-[28px_1fr] gap-x-3">
        <!-- Marker spine: spans both rows so the dashed line always stretches
             exactly from the pickup dot to the delivery pin. -->
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

        <!-- Pickup -->
        <div class="min-w-0 pb-4">
          <label class="text-sm font-bold uppercase tracking-wider text-gray-400">Lokasi Penjemputan</label>
          <AppDestinationSelect
            v-model="booking.origin"
            class="mt-1.5"
          />
          <div
            v-if="booking.origin"
            class="mt-2 flex items-start gap-2 rounded-xl bg-primary-50 p-3"
          >
            <UIcon
              name="i-lucide-map-pin"
              class="mt-0.5 size-4 shrink-0 text-primary"
            />
            <p class="text-sm font-semibold text-primary">
              {{ booking.origin.label }}
            </p>
          </div>
        </div>

        <!-- Delivery -->
        <div class="min-w-0">
          <label class="text-sm font-bold uppercase tracking-wider text-gray-400">Lokasi Tujuan</label>
          <AppDestinationSelect
            v-model="booking.destination"
            class="mt-1.5"
          />
          <div
            v-if="booking.destination"
            class="mt-2 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3"
          >
            <UIcon
              name="i-lucide-map-pin"
              class="mt-0.5 size-4 shrink-0 text-amber-600"
            />
            <p class="text-sm font-semibold text-amber-700">
              {{ booking.destination.label }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Package Details -->
    <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
      <div class="mb-4 flex items-center gap-2">
        <div class="flex size-8 items-center justify-center rounded-xl bg-primary-50">
          <UIcon
            name="i-lucide-package"
            class="size-4 text-primary"
          />
        </div>
        <h3 class="text-base font-bold text-gray-800">
          Detail Paket
        </h3>
      </div>
      <div class="space-y-4">
        <div>
          <label class="text-sm font-semibold text-gray-700">Berat <span class="text-red-500">*</span></label>
          <div class="relative mt-1.5">
            <UInput
              v-model.number="booking.weight"
              type="number"
              step="0.1"
              min="0.1"
              placeholder="0.0"
              size="xl"
              class="w-full"
            />
            <span class="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm font-bold text-gray-400">kg</span>
          </div>
        </div>
        <div>
          <label class="text-sm font-semibold text-gray-700">Isi Paket</label>
          <UTextarea
            v-model="booking.content"
            placeholder="Apa isi paketnya?"
            :rows="2"
            size="xl"
            class="mt-1.5 w-full"
          />
        </div>
      </div>
    </div>
  </div>
</template>
