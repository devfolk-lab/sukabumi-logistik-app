<script setup lang="ts">
import type { AdminOrder } from '~/types'

/**
 * One order in the approval list. An unpaid one carries its two actions; the
 * card itself opens the order's page.
 */
const props = defineProps<{ order: AdminOrder }>()
defineEmits<{ approve: [order: AdminOrder], reject: [order: AdminOrder] }>()

const waiting = computed(() => props.order.stage === 'MENUNGGU_PEMBAYARAN')
const antarLangsung = computed(() => isAntarLangsung(props.order.courierCode))
/** Antar Langsung without a price cannot be approved yet; its page sets one. */
const needsPrice = computed(() => waiting.value && antarLangsung.value && props.order.price === null)

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
          <span
            v-if="antarLangsung"
            class="mt-1.5 inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-extrabold text-primary"
          >
            <UIcon
              name="i-lucide-sparkles"
              class="size-3"
            />
            Antar Langsung
          </span>
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
            <span
              class="shrink-0 font-extrabold"
              :class="order.price === null ? 'text-sm text-amber-600' : 'text-base text-primary'"
            >{{ formatOngkir(order.price, 'Ongkir belum diatur') }}</span>
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
        v-if="needsPrice"
        v-ripple
        :to="`/admin/pesanan/${order.id}`"
        color="secondary"
        size="lg"
        block
        class="flex-1 font-bold"
        icon="i-lucide-badge-dollar-sign"
      >
        Atur Ongkir
      </UButton>
      <UButton
        v-else
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
