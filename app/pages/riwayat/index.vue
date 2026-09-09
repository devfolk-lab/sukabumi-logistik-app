<script setup lang="ts">
import { useOrdersStore } from '~/stores/orders'
import type { OrderStatus } from '~/types'

const orders = useOrdersStore()

const filter = ref<OrderStatus | 'all'>('all')

const tabs = [
  { label: 'Semua', value: 'all' },
  { label: 'Selesai', value: 'selesai' },
  { label: 'Diproses', value: 'proses' },
  { label: 'Dibatalkan', value: 'batal' }
]

const filtered = computed(() => orders.byStatus(filter.value))
</script>

<template>
  <div>
    <AppPageHero>
      <h1 class="text-xl font-bold text-white">
        Riwayat
      </h1>
      <p class="text-sm text-white/60">
        Sukabumi Logistik
      </p>
    </AppPageHero>

    <AppPageContent class="pt-4 pb-2">
      <UTabs
        v-model="filter"
        :items="tabs"
        variant="pill"
        :content="false"
        class="w-full"
        :ui="{ list: 'overflow-x-auto hide-scrollbar' }"
      />
    </AppPageContent>

    <AppPageContent class="mt-2 mb-6">
      <div class="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:gap-5">
        <RiwayatCard
          v-for="order in filtered"
          :key="order.id"
          :order="order"
        />
      </div>
    </AppPageContent>
  </div>
</template>
