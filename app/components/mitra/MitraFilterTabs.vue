<script setup lang="ts">
const model = defineModel<'all' | AllowedCourierCode>({ required: true })

const items = [
  { label: 'Semua', value: 'all', icon: 'i-lucide-layers' },
  ...ALLOWED_COURIERS.map(code => ({ label: courierLabel(code), value: code, icon: 'i-lucide-truck' }))
]
</script>

<template>
  <AppSegmentedTabs
    v-model="model"
    :items="items"
  />
</template>
