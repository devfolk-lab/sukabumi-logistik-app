<script setup lang="ts">
import { useShipmentsStore } from '~/stores/shipments'

const shipments = useShipmentsStore()
const input = ref('')
const notFound = ref(false)

async function search() {
  const found = shipments.findByResi(input.value)
  notFound.value = !found
  if (found) await navigateTo(`/lacak/${found.resi}`)
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
        @keydown.enter="search"
      />
      <button
        type="button"
        class="relative shrink-0 rounded-2xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] px-5 font-bold text-white"
        @click="search"
      >
        <span
          v-ripple
          class="absolute inset-0 rounded-2xl"
        />
        <span class="relative z-10 pointer-events-none">Lacak</span>
      </button>
    </div>
    <p
      v-if="notFound"
      class="mt-2 text-sm font-semibold text-red-500"
    >
      Resi tidak ditemukan. Periksa kembali nomor resi kamu.
    </p>
  </div>
</template>
