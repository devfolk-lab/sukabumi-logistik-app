<script setup lang="ts">
import type { Destination } from '~/types'

defineProps<{
  placeholder?: string
  icon?: string
}>()

const model = defineModel<Destination | undefined>({ default: undefined })

const { term, results, loading, error } = useDestinationSearch()

// The input shows "Kelurahan, Kecamatan" for the chosen row; the full label
// is only needed for the subtitle, so it is precomputed per item here.
interface Option extends Destination {
  title: string
  subtitle: string
}

function toOption(d: Destination): Option {
  return { ...d, title: destinationTitle(d), subtitle: destinationSubtitle(d) }
}

const items = computed<Option[]>(() => results.value.map(toOption))

const selected = computed<Option | undefined>({
  get: () => (model.value ? toOption(model.value) : undefined),
  set: (option) => {
    if (!option) {
      model.value = undefined
      return
    }
    const { title: _title, subtitle: _subtitle, ...destination } = option
    model.value = destination
  }
})

const emptyText = computed(() => {
  if (error.value) return error.value
  if (term.value.trim().length < 2) return 'Ketik nama kelurahan atau kecamatan'
  if (loading.value) return 'Mencari lokasi...'
  return 'Lokasi tidak ditemukan'
})
</script>

<template>
  <UInputMenu
    v-model="selected"
    v-model:search-term="term"
    :items="items"
    :loading="loading"
    label-key="title"
    by="id"
    size="xl"
    class="w-full"
    :placeholder="placeholder ?? 'Cari kelurahan atau kecamatan...'"
    :trailing-icon="icon ?? 'i-lucide-search'"
    :ignore-filter="true"
    :ui="{ content: 'max-h-72' }"
  >
    <template #item-label="{ item }">
      <span class="block truncate font-semibold text-gray-800">{{ item.title }}</span>
      <span class="block truncate text-xs text-gray-500">{{ item.subtitle }}</span>
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
