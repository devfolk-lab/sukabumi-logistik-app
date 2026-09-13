<script setup lang="ts">
import type { CourierType } from '~/types'

const model = defineModel<CourierType | 'all'>({ required: true })

const items = [
  { label: 'Semua', value: 'all', icon: 'i-lucide-layers' },
  { label: 'Instan', value: 'instant', icon: 'i-lucide-zap' },
  { label: 'Same Day', value: 'sameday', icon: 'i-lucide-clock' },
  { label: 'Reguler', value: 'regular', icon: 'i-lucide-truck' }
]
</script>

<template>
  <AppSegmentedTabs
    v-model="model"
    :items="items"
  />
</template>
