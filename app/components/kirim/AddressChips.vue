<script setup lang="ts">
import type { Address } from '~/types'
import { useBookingStore } from '~/stores/booking'

/**
 * One-tap pick of a saved address for one side of the booking. Picking fills
 * both the location and the contact details; "Alamat lain" goes back to typing
 * a custom one. Addresses saved without a kecamatan cannot price a route, so
 * they are shown but disabled.
 */
const props = defineProps<{ side: 'sender' | 'receiver' }>()

const booking = useBookingStore()
const { data: addresses, status } = useAddresses()

const activeId = computed(() => props.side === 'sender' ? booking.senderAddressId : booking.receiverAddressId)

const sorted = computed(() =>
  [...addresses.value].sort((a, b) => Number(b.main) - Number(a.main))
)

function pick(address: Address) {
  if (!address.destinationId) return
  booking.useAddress(props.side, address)
}

const chipClass = 'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-sm font-semibold'
</script>

<template>
  <div
    v-if="status === 'pending' || status === 'idle'"
    class="flex gap-2"
  >
    <USkeleton
      v-for="n in 2"
      :key="n"
      class="h-9 w-28 rounded-full"
    />
  </div>
  <div
    v-else-if="addresses.length"
    class="hide-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0"
  >
    <button
      v-for="address in sorted"
      :key="address.id"
      v-ripple="{ dark: activeId !== address.id }"
      type="button"
      :class="[
        chipClass,
        activeId === address.id
          ? 'border-primary bg-primary text-white shadow-md shadow-primary/25'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
        !address.destinationId ? 'cursor-not-allowed opacity-50' : ''
      ]"
      :disabled="!address.destinationId"
      :title="address.destinationId ? undefined : 'Alamat ini belum punya kecamatan, lengkapi dulu di Alamat Tersimpan'"
      @click="pick(address)"
    >
      <UIcon
        :name="address.main ? 'i-lucide-star' : 'i-lucide-map-pin'"
        class="pointer-events-none size-3.5"
      />
      <span class="pointer-events-none">{{ address.label }}</span>
      <span
        class="pointer-events-none max-w-28 truncate font-normal"
        :class="activeId === address.id ? 'text-white/80' : 'text-gray-400'"
      >{{ address.nama }}</span>
    </button>
    <button
      v-ripple="{ dark: activeId !== null }"
      type="button"
      :class="[
        chipClass,
        activeId === null
          ? 'border-primary bg-primary text-white shadow-md shadow-primary/25'
          : 'border-dashed border-gray-300 bg-white text-gray-600 hover:border-gray-400'
      ]"
      @click="activeId !== null && booking.useCustomAddress(side)"
    >
      <UIcon
        name="i-lucide-pencil-line"
        class="pointer-events-none size-3.5"
      />
      <span class="pointer-events-none">Alamat lain</span>
    </button>
  </div>
</template>
