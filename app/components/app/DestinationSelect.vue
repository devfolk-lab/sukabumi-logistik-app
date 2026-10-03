<script setup lang="ts">
import type { Area } from '~/types'

defineProps<{
  placeholder?: string
  icon?: string
}>()

const model = defineModel<Area | undefined>({ default: undefined })

const { term, results, loading, error } = useDestinationSearch()

// The input shows the kecamatan; kota, provinsi and kode pos sit under it in
// the list. Each Biteship area is one kecamatan + postal code, so `id` is a
// unique key.
interface Option extends Area {
  title: string
  subtitle: string
}

function toOption(a: Area): Option {
  return { ...a, title: areaTitle(a), subtitle: areaSubtitle(a) }
}

const items = computed<Option[]>(() => results.value.map(toOption))

const selected = computed<Option | undefined>({
  get: () => (model.value ? toOption(model.value) : undefined),
  set: (option) => {
    if (!option) {
      model.value = undefined
      return
    }
    const { title: _title, subtitle: _subtitle, ...area } = option
    model.value = area
  }
})

// A picked area reads as a two-line field — kecamatan, then kota, provinsi and
// kode pos — because one input line truncates before the postal code on a
// phone. Tapping it swaps in the search, already open; closing the search
// (by picking or tapping away) swaps the field back.
const editing = ref(false)
const showSummary = computed(() => Boolean(selected.value) && !editing.value)

function onOpen(open: boolean) {
  if (!open) editing.value = false
}

const emptyText = computed(() => {
  if (error.value) return error.value
  if (term.value.trim().length < AREA_MIN_QUERY) return 'Ketik nama kecamatan, minimal 3 huruf'
  if (loading.value) return 'Mencari lokasi...'
  return 'Kecamatan tidak ditemukan. Ketik nama lengkapnya.'
})
</script>

<template>
  <button
    v-if="showSummary && selected"
    v-ripple.dark
    type="button"
    class="flex w-full items-center gap-3 rounded-md bg-default px-3 py-2.5 text-left ring ring-inset ring-accented hover:ring-primary/50"
    @click="editing = true"
  >
    <span class="pointer-events-none min-w-0 flex-1">
      <span class="block text-base font-semibold text-gray-800">{{ selected.title }}</span>
      <span class="block text-sm text-gray-500">{{ selected.subtitle }}</span>
    </span>
    <UIcon
      name="i-lucide-pencil"
      class="pointer-events-none size-4 shrink-0 text-gray-400"
    />
  </button>
  <UInputMenu
    v-else
    v-model="selected"
    v-model:search-term="term"
    :items="items"
    :loading="loading"
    label-key="title"
    by="id"
    size="xl"
    class="w-full"
    :placeholder="placeholder ?? 'Cari kecamatan...'"
    :trailing-icon="icon ?? 'i-lucide-search'"
    :ignore-filter="true"
    :ui="{ content: 'max-h-72' }"
    :autofocus="editing"
    :default-open="editing"
    @update:open="onOpen"
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
