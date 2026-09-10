<script setup lang="ts">
import type { Destination } from '~/types'

defineProps<{
  placeholder?: string
  icon?: string
}>()

const model = defineModel<Destination | undefined>({ default: undefined })

const { term, results, loading } = useDestinationSearch()
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
    <template #empty>
      <span class="text-sm text-gray-500">
        {{ term.trim().length < 3 ? 'Ketik minimal 3 huruf' : 'Lokasi tidak ditemukan' }}
      </span>
    </template>
  </UInputMenu>
</template>
