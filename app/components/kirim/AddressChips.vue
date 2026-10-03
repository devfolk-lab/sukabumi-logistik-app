<script setup lang="ts">
import type { Address } from '~/types'
import type { AddressFormPayload } from '~/components/alamat/AddressForm.vue'
import { useBookingStore } from '~/stores/booking'

/**
 * One-tap pick of a saved address for one side of the booking, in a single
 * horizontally scrolling row that opens with "Tambah alamat". Picking fills
 * both the location and the contact details; a new address is saved to
 * Alamat Tersimpan and picked straight away. Addresses saved without a
 * kecamatan cannot price a route, so they are shown but disabled.
 */
const props = defineProps<{ side: 'sender' | 'receiver' }>()

const booking = useBookingStore()
const toast = useToast()
const online = useOnline()
const { data: addresses, status, refresh } = useAddresses()

const activeId = computed(() => props.side === 'sender' ? booking.senderAddressId : booking.receiverAddressId)

const sorted = computed(() =>
  [...addresses.value].sort((a, b) => Number(b.main) - Number(a.main))
)

function pick(address: Address) {
  if (!address.area) return
  booking.useAddress(props.side, address)
}

const showForm = ref(false)
const saving = ref(false)

function openForm() {
  if (!online.value) {
    toast.add({
      title: 'Butuh koneksi internet',
      description: 'Menambah alamat dari sini memerlukan koneksi aktif.',
      color: 'warning'
    })
    return
  }
  showForm.value = true
}

async function save(payload: AddressFormPayload) {
  saving.value = true
  try {
    const created = await $fetch<Address>('/api/addresses', { method: 'POST', body: payload })
    // Shown and picked right away; the refetch then brings the server's copy.
    addresses.value = [...addresses.value, created]
    showForm.value = false
    if (created.area) booking.useAddress(props.side, created)
    await refresh()
    toast.add({ title: 'Alamat tersimpan' })
  } catch (error) {
    toast.add({
      title: 'Gagal menyimpan alamat',
      description: apiMessage(error, 'Coba lagi sebentar.'),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

const chipClass = 'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-sm font-semibold'
</script>

<template>
  <div class="hide-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:mx-0 lg:px-0">
    <button
      v-ripple.dark
      type="button"
      :class="[chipClass, 'border-dashed border-primary/40 bg-primary-50 text-primary hover:border-primary']"
      @click="openForm"
    >
      <UIcon
        name="i-lucide-plus"
        class="pointer-events-none size-3.5"
      />
      <span class="pointer-events-none">Tambah alamat</span>
    </button>

    <template v-if="(status === 'pending' || status === 'idle') && !addresses.length">
      <USkeleton
        v-for="n in 2"
        :key="n"
        class="h-9 w-28 shrink-0 rounded-full"
      />
    </template>
    <button
      v-for="address in sorted"
      v-else
      :key="address.id"
      v-ripple="{ dark: activeId !== address.id }"
      type="button"
      :class="[
        chipClass,
        activeId === address.id
          ? 'border-primary bg-primary text-white shadow-md shadow-primary/25'
          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300',
        !address.area ? 'cursor-not-allowed opacity-50' : ''
      ]"
      :disabled="!address.area"
      :title="address.area ? undefined : 'Alamat ini belum punya kecamatan, lengkapi dulu di Alamat Tersimpan'"
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

    <AppDialog
      v-model:open="showForm"
      title="Alamat baru"
      description="Tersimpan di Alamat Tersimpan dan langsung dipakai untuk pengiriman ini."
      :ui="{ content: 'sm:max-w-lg', body: 'p-0 sm:p-0 max-lg:-mx-4 max-lg:-mb-4' }"
    >
      <template #body>
        <AlamatAddressForm
          :pending="saving"
          @submit="save"
          @cancel="showForm = false"
        />
      </template>
    </AppDialog>
  </div>
</template>
