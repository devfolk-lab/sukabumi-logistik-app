<script setup lang="ts">
import type { Shipment } from '~/types'

const props = defineProps<{ shipment: Shipment }>()

const progress = computed(() => {
  const steps = props.shipment.timeline
  const done = steps.filter(s => s.done).length
  return Math.round((done / steps.length) * 100)
})
</script>

<template>
  <div class="flex items-center gap-4 rounded-3xl bg-white p-4 shadow-card lg:shadow-card-flat">
    <div class="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50">
      <UIcon
        name="i-lucide-package"
        class="size-6 text-primary"
      />
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-2">
        <h4 class="truncate text-base font-bold text-gray-800">
          {{ shipment.pickup.city }} → {{ shipment.delivery.city }}
        </h4>
        <UBadge
          color="primary"
          variant="subtle"
          class="shrink-0 rounded-full"
        >
          {{ shipment.status }}
        </UBadge>
      </div>
      <p class="mt-1 text-sm text-gray-500">
        #{{ shipment.resi }} • {{ shipment.courier }}
      </p>
      <div class="mt-2.5 flex items-center gap-3">
        <div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            class="h-full rounded-full bg-linear-to-r from-primary to-blue-500"
            :style="{ width: progress + '%' }"
          />
        </div>
        <span class="shrink-0 text-sm font-semibold text-gray-400">{{ shipment.status }}</span>
      </div>
    </div>
  </div>
</template>
