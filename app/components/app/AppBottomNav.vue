<script setup lang="ts">
const items = [
  { label: 'Beranda', to: '/', icon: 'i-lucide-house' },
  { label: 'Riwayat', to: '/riwayat', icon: 'i-lucide-history' },
  { label: 'Profil', to: '/profil', icon: 'i-lucide-user' }
]

const route = useRoute()

function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path.startsWith(to)
}
</script>

<template>
  <nav class="fixed bottom-0 left-1/2 z-50 w-full max-w-full -translate-x-1/2 border-t border-gray-100 bg-white/90 px-4 py-3 pb-6 backdrop-blur-xl md:max-lg:max-w-105 lg:hidden">
    <div class="flex items-center justify-between">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        class="flex w-16 flex-col items-center gap-1"
        :class="isActive(item.to) ? 'text-primary' : 'text-gray-400'"
      >
        <span
          v-ripple.dark
          class="flex size-11 items-center justify-center rounded-2xl transition-all"
          :class="isActive(item.to) ? 'bg-primary text-white shadow-lg shadow-primary/25' : ''"
        >
          <UIcon
            :name="item.icon"
            class="pointer-events-none size-5"
          />
        </span>
        <span class="text-xs font-semibold">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
