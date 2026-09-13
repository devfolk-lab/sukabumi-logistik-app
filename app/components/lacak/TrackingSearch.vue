<script setup lang="ts">
import type { Shipment } from '~/types'

const input = ref('')
const error = ref('')
const pending = ref(false)

/**
 * Looks the resi up before navigating so a typo shows here, under the field,
 * instead of landing on a dead detail page.
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

  try {
    const shipment = await $fetch<Shipment>(`/api/shipments/${encodeURIComponent(resi)}`)
    await navigateTo(`/lacak/${shipment.resi}`)
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
    <div class="mt-1.5 flex gap-2">
      <UInput
        id="lacak-input"
        v-model="input"
        placeholder="Contoh: SL-2026-8801"
        size="xl"
        class="flex-1"
        :color="error ? 'error' : undefined"
        :highlight="Boolean(error)"
        @keydown.enter="search"
        @input="error = ''"
      />
      <button
        type="button"
        class="relative flex shrink-0 items-center justify-center rounded-2xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] px-5 font-bold text-white disabled:opacity-70"
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
