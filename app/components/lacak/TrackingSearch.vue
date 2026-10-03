<script setup lang="ts">
import type { Shipment } from '~/types'

const input = ref('')
const courier = ref<'auto' | AllowedCourierCode>('auto')
const error = ref('')
const pending = ref(false)

const courierItems = [
  { label: 'Deteksi otomatis', value: 'auto', icon: 'i-lucide-scan-search' },
  ...ALLOWED_COURIERS.map(code => ({ label: courierLabel(code), value: code, icon: 'i-lucide-truck' }))
]

/**
 * Looks the resi up before navigating so a typo shows here, under the field,
 * instead of landing on a dead detail page. Any Lion Parcel waybill works,
 * not only ones booked here — the lookup goes to Biteship.
 */
async function search() {
  const resi = normalizeResi(input.value)

  if (!resi) {
    error.value = 'Masukkan nomor resi terlebih dahulu.'
    return
  }
  if (pending.value) return

  pending.value = true
  error.value = ''

  const query = courier.value === 'auto' ? {} : { courier: courier.value }

  try {
    const shipment = await $fetch<Shipment>(`/api/shipments/${encodeURIComponent(resi)}`, { query })
    await navigateTo({ path: `/lacak/${shipment.resi}`, query: { courier: shipment.courierCode } })
  } catch (err) {
    error.value = apiMessage(err, 'Resi tidak ditemukan. Periksa lagi nomornya.')
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
    <label
      for="lacak-input"
      class="text-sm font-semibold text-gray-700"
    >Lacak dengan nomor resi</label>
    <p class="mt-0.5 text-xs text-gray-500">
      Resi J&T Express atau Lion Parcel dari mana saja bisa dilacak di sini.
    </p>
    <div class="mt-3 flex flex-col gap-2 sm:flex-row">
      <UInput
        id="lacak-input"
        v-model="input"
        placeholder="Nomor resi kurir"
        icon="i-lucide-package-search"
        size="xl"
        class="flex-1"
        :color="error ? 'error' : undefined"
        :highlight="Boolean(error)"
        @keydown.enter="search"
        @input="error = ''"
      />
      <div class="flex flex-col gap-2 sm:flex-row">
        <USelect
          v-model="courier"
          :items="courierItems"
          size="xl"
          class="w-full sm:w-48"
          aria-label="Kurir"
        />
        <button
          type="button"
          class="relative flex w-full shrink-0 items-center justify-center rounded-2xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] px-5 py-3.5 font-bold text-white disabled:opacity-70 sm:w-auto sm:py-0"
          :disabled="pending"
          @click="search"
        >
          <span
            v-ripple
            class="absolute inset-0 rounded-2xl"
          />
          <UIcon
            v-if="pending"
            name="i-lucide-loader-circle"
            class="relative z-10 size-5 animate-spin pointer-events-none"
          />
          <span
            v-else
            class="relative z-10 pointer-events-none"
          >Lacak</span>
        </button>
      </div>
    </div>
    <p
      v-if="error"
      class="mt-2 flex items-center gap-1.5 text-sm font-semibold text-red-500"
    >
      <UIcon
        name="i-lucide-circle-alert"
        class="size-4 shrink-0"
      />
      {{ error }}
    </p>
  </div>
</template>
