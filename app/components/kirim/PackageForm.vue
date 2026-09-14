<script setup lang="ts">
import { useBookingStore } from '~/stores/booking'

const booking = useBookingStore()

const WEIGHT_STEP = 0.5
const WEIGHT_MIN = 0.1

function bump(delta: number) {
  const next = Math.round(((booking.weight || 0) + delta) * 10) / 10
  booking.weight = Math.max(WEIGHT_MIN, next)
}
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
            v-model="booking.origin"
            class="mt-2.5"
          />
          <div
            v-if="booking.origin"
            class="mt-2 flex items-start gap-2 rounded-xl bg-primary-50 p-3 lg:hidden"
          >
            <UIcon
              name="i-lucide-map-pin"
              class="mt-0.5 size-4 shrink-0 text-primary"
            />
            <div class="min-w-0">
              <p class="text-sm font-semibold text-primary">
                {{ destinationTitle(booking.origin) }}
              </p>
              <p class="text-xs text-primary/70">
                {{ destinationSubtitle(booking.origin) }}
              </p>
            </div>
          </div>
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
            v-model="booking.destination"
            class="mt-2.5"
          />
          <div
            v-if="booking.destination"
            class="mt-2 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 lg:hidden"
          >
            <UIcon
              name="i-lucide-map-pin"
              class="mt-0.5 size-4 shrink-0 text-amber-600"
            />
            <div class="min-w-0">
              <p class="text-sm font-semibold text-amber-700">
                {{ destinationTitle(booking.destination) }}
              </p>
              <p class="text-xs text-amber-700/70">
                {{ destinationSubtitle(booking.destination) }}
              </p>
            </div>
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
          <label
            for="berat"
            class="text-sm font-semibold text-gray-700"
          >Berat <span class="text-red-500">*</span></label>
          <!-- The native number spinner used to sit on top of the unit, so the
               spinner is hidden and the stepper is drawn as real buttons. -->
          <div class="mt-1.5 flex items-stretch gap-2">
            <button
              v-ripple.dark
              type="button"
              class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200"
              aria-label="Kurangi berat"
              @click="bump(-WEIGHT_STEP)"
            >
              <UIcon
                name="i-lucide-minus"
                class="pointer-events-none size-4"
              />
            </button>
            <UInput
              id="berat"
              v-model.number="booking.weight"
              type="number"
              step="0.1"
              :min="WEIGHT_MIN"
              placeholder="0.0"
              size="xl"
              inputmode="decimal"
              class="min-w-0 flex-1"
              :ui="{ base: 'text-center font-bold tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none' }"
            >
              <template #trailing>
                <span class="text-sm font-bold text-gray-400">kg</span>
              </template>
            </UInput>
            <button
              v-ripple.dark
              type="button"
              class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200"
              aria-label="Tambah berat"
              @click="bump(WEIGHT_STEP)"
            >
              <UIcon
                name="i-lucide-plus"
                class="pointer-events-none size-4"
              />
            </button>
          </div>
        </div>
        <div>
          <label
            for="isi-paket"
            class="text-sm font-semibold text-gray-700"
          >Isi Paket</label>
          <UTextarea
            id="isi-paket"
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
