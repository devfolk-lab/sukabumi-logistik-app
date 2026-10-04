<script setup lang="ts">
import type { AdminOrder } from '~/types'

/**
 * One order in the approval list. An unpaid one carries its two actions; the
 * card itself opens the order's page.
 */
const props = defineProps<{ order: AdminOrder }>()
defineEmits<{ approve: [order: AdminOrder], reject: [order: AdminOrder] }>()

const waiting = computed(() => props.order.stage === 'MENUNGGU_PEMBAYARAN')

const stageMeta = computed(() => {
  switch (props.order.stage) {
    case 'MENUNGGU_PEMBAYARAN': return { color: 'warning' as const, label: 'Menunggu' }
    case 'SELESAI': return { color: 'success' as const, label: 'Selesai' }
    case 'BATAL': return { color: 'error' as const, label: 'Dibatalkan' }
    default: return { color: 'info' as const, label: stageLabel(props.order.stage) }
  }
})
</script>

<template>
  <div class="rounded-3xl bg-white shadow-card lg:shadow-card-flat">
    <NuxtLink
      v-ripple.dark
      :to="`/admin/pesanan/${order.id}`"
      class="block rounded-3xl p-4"
    >
      <div class="flex items-start gap-3">
        <AppCourierLogo
          :code="order.courierCode"
          class="pointer-events-none size-12 shrink-0 rounded-2xl text-sm"
        />
        <div class="pointer-events-none min-w-0 flex-1">
          <div class="flex items-center justify-between gap-2">
            <p class="truncate font-mono text-sm font-bold text-gray-800">
              {{ order.orderNo }}
            </p>
            <UBadge
              :color="stageMeta.color"
              variant="subtle"
              class="shrink-0 rounded-full"
            >
              {{ stageMeta.label }}
            </UBadge>
          </div>
          <p class="mt-0.5 truncate text-sm text-gray-500">
            {{ order.customer.nama }} · {{ order.customer.email }}
          </p>
          <p class="mt-1 truncate text-sm font-semibold text-gray-700">
            {{ order.pickup }} → {{ order.delivery }}
          </p>
          <div class="mt-2 flex items-end justify-between gap-2">
            <div class="min-w-0">
              <p class="truncate text-xs text-gray-500">
                {{ order.courier }} · {{ order.weight }}
              </p>
              <p class="text-xs text-gray-400">
                {{ formatWaktu(order.createdAt) }}
              </p>
            </div>
            <span class="shrink-0 text-base font-extrabold text-primary">{{ formatRupiah(order.price) }}</span>
          </div>
          <p
            v-if="order.approvedBy"
            class="mt-1.5 truncate text-xs text-emerald-600"
          >
            Disetujui {{ order.approvedBy }} · {{ order.approvedAt }}
          </p>
        </div>
      </div>
    </NuxtLink>
    <div
      v-if="waiting"
      class="flex gap-2 border-t border-gray-100 p-3"
    >
      <UButton
        v-ripple.dark
        color="error"
        variant="soft"
        size="lg"
        block
        class="flex-1 font-bold"
        icon="i-lucide-x"
        @click="$emit('reject', order)"
      >
        Tolak
      </UButton>
      <UButton
        v-ripple
        color="primary"
        size="lg"
        block
        class="flex-1 font-bold"
        icon="i-lucide-check"
        @click="$emit('approve', order)"
      >
        Setujui
      </UButton>
    </div>
  </div>
</template>
