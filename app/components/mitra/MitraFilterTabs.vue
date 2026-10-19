<script setup lang="ts">
export type CourierFilter = 'all' | AllowedCourierCode | typeof ANTAR_LANGSUNG_CODE

const model = defineModel<CourierFilter>({ required: true })

const items = [
  { label: 'Semua', value: 'all', icon: 'i-lucide-layers' },
  { label: 'Antar Langsung', value: ANTAR_LANGSUNG_CODE, icon: 'i-lucide-sparkles' },
  ...ALLOWED_COURIERS.map(code => ({ label: courierLabel(code), value: code, icon: 'i-lucide-truck' }))
]
</script>

<template>
  <AppSegmentedTabs
    v-model="model"
    :items="items"
  />
</template>
