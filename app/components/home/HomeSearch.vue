<script setup lang="ts">
import type { Shipment } from '~/types'

const query = ref('')
const error = ref('')
const pending = ref(false)

async function search() {
  const resi = normalizeResi(query.value)
  if (!resi || pending.value) return

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
  <div>
    <form
      class="flex items-center rounded-2xl bg-white p-1 shadow-card lg:shadow-card-flat"
      :class="error ? 'ring-2 ring-red-200' : ''"
      @submit.prevent="search"
    >
      <button
        v-ripple.dark
        type="submit"
        class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-50"
        aria-label="Lacak"
        :disabled="pending"
      >
        <UIcon
          :name="pending ? 'i-lucide-loader-circle' : 'i-lucide-search'"
          class="pointer-events-none size-4 text-primary"
          :class="pending ? 'animate-spin' : ''"
        />
      </button>
      <input
        v-model="query"
        type="text"
        placeholder="Lacak pengiriman dengan nomor resi..."
        class="flex-1 bg-transparent px-3 py-3 text-base text-gray-700 placeholder-gray-400 focus:outline-hidden"
        @input="error = ''"
      >
    </form>
    <p
      v-if="error"
      class="mt-2 flex items-center gap-1.5 px-1 text-sm font-semibold text-red-500"
    >
      <UIcon
        name="i-lucide-circle-alert"
        class="size-4 shrink-0"
      />
      {{ error }}
    </p>
  </div>
</template>
