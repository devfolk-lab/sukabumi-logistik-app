<script setup lang="ts">
import { useBookingStore } from '~/stores/booking'

const booking = useBookingStore()
</script>

<template>
  <div class="space-y-5">
    <!-- Route -->
    <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
      <div class="grid grid-cols-[28px_1fr] gap-x-3">
        <!-- Marker spine, one cell per row: the dot sits beside the pickup
             label with the dashed line filling the rest of that row, so the
             pin lands exactly beside the "Lokasi Tujuan" label. -->
        <div class="flex flex-col items-center">
          <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <div class="size-2.5 rounded-full bg-emerald-500" />
          </div>
          <div class="route-dash my-1.5 w-0.5 flex-1" />
        </div>

        <!-- Pickup -->
        <div class="min-w-0 pb-5">
          <label class="flex h-7 items-center text-sm font-bold uppercase tracking-wider text-gray-400">Lokasi Penjemputan</label>
          <KirimAddressChips
            side="sender"
            class="mt-2"
          />
          <AppDestinationSelect
            :model-value="booking.origin"
            class="mt-2.5"
            @update:model-value="booking.setLocation('sender', $event)"
          />
        </div>

        <div class="flex flex-col items-center">
          <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-50">
            <UIcon
              name="i-lucide-map-pin"
              class="size-4 text-primary"
            />
          </div>
        </div>

        <!-- Delivery -->
        <div class="min-w-0">
          <label class="flex h-7 items-center text-sm font-bold uppercase tracking-wider text-gray-400">Lokasi Tujuan</label>
          <KirimAddressChips
            side="receiver"
            class="mt-2"
          />
          <AppDestinationSelect
            :model-value="booking.destination"
            class="mt-2.5"
            @update:model-value="booking.setLocation('receiver', $event)"
          />
        </div>
      </div>
    </div>

    <!-- Package items -->
    <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
      <div class="mb-4 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2">
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
        <p class="text-sm text-gray-500">
          <span class="font-bold text-gray-700">{{ booking.quantity }}</span> barang ·
          <span class="font-bold text-gray-700">{{ formatBerat(booking.weightGram) }}</span>
        </p>
      </div>

      <div class="space-y-4">
        <KirimPackageItemForm
          v-for="(item, index) in booking.items"
          :key="index"
          :model-value="item"
          :index="index"
          :removable="booking.items.length > 1"
          @update:model-value="booking.items[index] = $event"
          @remove="booking.removeItem(index)"
        />

        <button
          v-ripple.dark
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-primary-50/50 py-3 text-base font-bold text-primary hover:border-primary/60"
          @click="booking.addItem()"
        >
          <UIcon
            name="i-lucide-plus"
            class="pointer-events-none size-4"
          />
          <span class="pointer-events-none">Tambah barang</span>
        </button>
      </div>
    </div>
  </div>
</template>
