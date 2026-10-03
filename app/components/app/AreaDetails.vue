<script setup lang="ts">
import type { Area } from '~/types'

/** The four parts of a Biteship area, labelled, under a location picker. */
const props = withDefaults(defineProps<{
  area: Area
  tone?: 'primary' | 'amber' | 'gray'
}>(), { tone: 'gray' })

const rows = computed(() => [
  { label: 'Kecamatan', value: titleCase(props.area.administrative_division_level_3_name) },
  { label: 'Kota/Kab.', value: titleCase(props.area.administrative_division_level_2_name) },
  { label: 'Provinsi', value: titleCase(props.area.administrative_division_level_1_name) },
  { label: 'Kode Pos', value: props.area.postal_code ? String(props.area.postal_code) : '-' }
])

const toneClass = {
  primary: { box: 'bg-primary-50', label: 'text-primary/60', value: 'text-primary' },
  amber: { box: 'border border-amber-100 bg-amber-50', label: 'text-amber-700/60', value: 'text-amber-700' },
  gray: { box: 'bg-gray-50', label: 'text-gray-400', value: 'text-gray-700' }
}
</script>

<template>
  <dl
    class="grid grid-cols-2 gap-x-3 gap-y-2 rounded-xl p-3"
    :class="toneClass[tone].box"
  >
    <div
      v-for="row in rows"
      :key="row.label"
      class="min-w-0"
    >
      <dt
        class="text-xs font-semibold"
        :class="toneClass[tone].label"
      >
        {{ row.label }}
      </dt>
      <dd
        class="truncate text-sm font-bold"
        :class="toneClass[tone].value"
      >
        {{ row.value }}
      </dd>
    </div>
  </dl>
</template>
