<script setup lang="ts">
const items = [
  { label: 'Beranda', to: '/', icon: 'i-lucide-house' },
  { label: 'Riwayat', to: '/riwayat', icon: 'i-lucide-history' },
  { label: 'Profil', to: '/profil', icon: 'i-lucide-user' }
]

// The prototype shows the bottom nav on exactly these three top-level screens
// (home, riwayat, profil). Every other screen — the kirim wizard, riwayat
// detail — replaces it with a fixed action bar at the same edge, so rendering
// both would leave the action bar buried underneath this nav.
const rootPaths = items.map(item => item.to)

const route = useRoute()

const visible = computed(() => rootPaths.includes(route.path))

function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <nav
    v-if="visible"
    class="fixed bottom-0 left-1/2 z-50 w-full max-w-full -translate-x-1/2 border-t border-gray-100 bg-white/90 px-4 py-3 pb-6 backdrop-blur-xl md:max-lg:max-w-105 lg:hidden"
  >
    <div class="flex items-center justify-between">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        v-ripple.dark
        :to="item.to"
        class="flex w-16 flex-col items-center gap-1 rounded-2xl py-0.5"
        :class="isActive(item.to) ? 'text-primary' : 'text-gray-400'"
      >
        <span
          class="pointer-events-none flex size-11 items-center justify-center rounded-2xl transition-all duration-200"
          :class="isActive(item.to) ? 'bg-primary text-white shadow-lg shadow-primary/25' : ''"
        >
          <UIcon
            :name="item.icon"
            class="size-5"
          />
        </span>
        <span class="pointer-events-none text-xs font-semibold">{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
