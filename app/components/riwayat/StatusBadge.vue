<script setup lang="ts">
import type { OrderStatus } from '~/types'

const props = defineProps<{ status: OrderStatus }>()

const meta: Record<OrderStatus, { color: 'success' | 'info' | 'error', label: string }> = {
  selesai: { color: 'success', label: 'Selesai' },
  proses: { color: 'info', label: 'Diproses' },
  batal: { color: 'error', label: 'Dibatalkan' }
}

const current = computed(() => meta[props.status])
</script>

<template>
  <UBadge
    :color="current.color"
    variant="subtle"
    class="rounded-full"
  >
    {{ current.label }}
  </UBadge>
</template>
