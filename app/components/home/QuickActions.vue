<script setup lang="ts">
const actions = [
  { label: 'Kirim Paket', to: '/kirim', icon: 'i-lucide-package', iconClass: 'bg-primary-50 text-primary' },
  { label: 'Lacak Pengiriman', to: '/lacak', icon: 'i-lucide-map-pin', iconClass: 'bg-orange-50 text-orange-500' },
  { label: 'Alamat Tersimpan', to: '/alamat', icon: 'i-lucide-house', iconClass: 'bg-purple-50 text-purple-500' }
]
</script>

<template>
  <div class="rounded-3xl bg-white p-5 shadow-card lg:bg-transparent lg:p-0 lg:shadow-none">
    <div class="flex items-center justify-around lg:grid lg:grid-cols-3 lg:gap-4">
      <NuxtLink
        v-for="action in actions"
        :key="action.to"
        :to="action.to"
        class="flex w-20 flex-col items-center gap-2.5 lg:w-auto lg:flex-row lg:justify-start lg:gap-3.5 lg:rounded-2xl lg:bg-white lg:px-5 lg:py-4 lg:shadow-card-flat lg:hover:-translate-y-[3px] lg:hover:shadow-card-hover"
      >
        <div
          v-ripple.dark
          class="flex size-14 items-center justify-center rounded-2xl lg:size-11"
          :class="action.iconClass"
        >
          <UIcon
            :name="action.icon"
            class="pointer-events-none size-6 lg:size-4.5"
          />
        </div>
        <span class="text-center text-sm font-semibold text-gray-700">{{ action.label }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
