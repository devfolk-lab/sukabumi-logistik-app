<script setup lang="ts">
import type { Order } from '~/types'

const props = defineProps<{ order: Order }>()

const statusMeta: Record<Order['status'], { icon: string, bg: string, text: string }> = {
  selesai: { icon: 'i-lucide-circle-check-big', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  proses: { icon: 'i-lucide-truck', bg: 'bg-blue-50', text: 'text-blue-600' },
  batal: { icon: 'i-lucide-x', bg: 'bg-red-50', text: 'text-red-500' }
}

const meta = computed(() => statusMeta[props.order.status])
const pickupCity = computed(() => props.order.pickup.split(',')[0])
const deliveryCity = computed(() => props.order.delivery.split(',')[0])
</script>

<template>
  <NuxtLink
    v-ripple.dark
    :to="`/riwayat/${order.id}`"
    class="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-card lg:shadow-card-flat"
  >
    <div
      class="flex size-12 shrink-0 items-center justify-center rounded-2xl"
      :class="meta.bg"
    >
      <UIcon
        :name="meta.icon"
        class="size-5"
        :class="meta.text"
      />
    </div>
    <div class="min-w-0 flex-1">
      <div class="flex items-center justify-between gap-2">
        <h4 class="truncate text-base font-bold text-gray-800">
          {{ pickupCity }} → {{ deliveryCity }}
        </h4>
        <RiwayatStatusBadge
          :status="order.status"
          class="shrink-0"
        />
      </div>
      <p class="mt-1 text-sm text-gray-500">
        {{ order.resi }} • {{ order.date }}
      </p>
      <div class="mt-2 flex items-center justify-between">
        <span class="text-sm text-gray-500">{{ order.courier }}</span>
        <span class="text-base font-extrabold text-primary">{{ formatRupiah(order.price) }}</span>
      </div>
    </div>
  </NuxtLink>
</template>
