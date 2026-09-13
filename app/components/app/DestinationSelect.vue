<script setup lang="ts">
import type { Destination } from '~/types'

defineProps<{
  placeholder?: string
  icon?: string
}>()

const model = defineModel<Destination | undefined>({ default: undefined })

const { term, results, loading, error } = useDestinationSearch()

const emptyText = computed(() => {
  if (error.value) return error.value
  if (term.value.trim().length < 2) return 'Ketik minimal 2 huruf'
  if (loading.value) return 'Mencari lokasi...'
  return 'Lokasi tidak ditemukan'
})
</script>

<template>
  <UInputMenu
    v-model="model"
    v-model:search-term="term"
    :items="results"
    :loading="loading"
    label-key="label"
    by="id"
    size="xl"
    class="w-full"
    :placeholder="placeholder ?? 'Cari kecamatan atau kelurahan...'"
    :trailing-icon="icon ?? 'i-lucide-search'"
    :ignore-filter="true"
    :ui="{ content: 'max-h-72' }"
  >
    <template #item-label="{ item }">
      <span class="block truncate font-semibold text-gray-800">{{ item.subdistrict }}</span>
      <span class="block truncate text-xs text-gray-500">{{ item.district }}, {{ item.city }}, {{ item.province }} {{ item.zipCode }}</span>
    </template>
    <template #empty>
      <span
        class="text-sm"
        :class="error ? 'font-semibold text-red-500' : 'text-gray-500'"
      >
        {{ emptyText }}
      </span>
    </template>
  </UInputMenu>
</template>
