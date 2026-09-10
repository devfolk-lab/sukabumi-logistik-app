<script setup lang="ts">
import type { OrderStatus } from '~/types'

const { data: orders, status } = await useOrders()

const filter = ref<OrderStatus | 'all'>('all')

const tabs = [
  { label: 'Semua', value: 'all' },
  { label: 'Selesai', value: 'selesai' },
  { label: 'Diproses', value: 'proses' },
  { label: 'Dibatalkan', value: 'batal' }
]

const filtered = computed(() =>
  filter.value === 'all' ? orders.value : orders.value.filter(o => o.status === filter.value)
)
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
      <div
        v-if="status === 'pending'"
        class="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:gap-5"
      >
        <USkeleton
          v-for="n in 3"
          :key="n"
          class="h-28 rounded-3xl"
        />
      </div>
      <div
        v-else-if="filtered.length"
        class="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:gap-5"
      >
        <RiwayatCard
          v-for="order in filtered"
          :key="order.id"
          :order="order"
        />
      </div>
      <div
        v-else
        class="rounded-3xl bg-white p-6 text-center shadow-card lg:shadow-card-flat"
      >
        <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gray-50">
          <UIcon
            name="i-lucide-history"
            class="size-6 text-gray-400"
          />
        </div>
        <p class="mt-3 text-base font-bold text-gray-800">
          Belum ada pesanan
        </p>
        <p class="mt-1 text-sm text-gray-500">
          Pesanan yang kamu buat akan muncul di sini.
        </p>
      </div>
    </AppPageContent>
  </div>
</template>
