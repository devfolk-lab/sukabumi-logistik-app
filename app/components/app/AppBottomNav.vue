<script setup lang="ts">
const items = [
  { label: 'Beranda', to: '/', icon: 'i-lucide-house' },
  { label: 'Lacak', to: '/lacak', icon: 'i-lucide-map-pin' },
  { label: 'Riwayat', to: '/riwayat', icon: 'i-lucide-history' },
  { label: 'Profil', to: '/profil', icon: 'i-lucide-user' }
]

// The bottom nav shows on exactly these top-level screens (home, lacak,
// riwayat, profil). Every other screen — the kirim wizard, riwayat detail,
// lacak detail — replaces it with a fixed action bar at the same edge, so
// rendering both would leave the action bar buried underneath this nav.
const rootPaths = items.map(item => item.to)

const route = useRoute()

const visible = computed(() => rootPaths.includes(route.path))

function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<!-- Proportioned after Android's Material 3 navigation bar: an 80dp bar,
     each destination a full-height column, a 64×32 pill behind the active
     icon (which is also where the ripple shows), 24dp icons and 12sp labels.
     The bar grows by the gesture-nav inset on devices that report one. -->
<template>
  <nav
    v-if="visible"
    class="fixed bottom-0 left-1/2 z-50 w-full max-w-full -translate-x-1/2 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_3px_rgb(0_33_68/0.06),0_-4px_12px_rgb(0_33_68/0.04)] md:max-lg:max-w-105 lg:hidden"
  >
    <div class="flex h-20 items-stretch">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        :to="item.to"
        :aria-current="isActive(item.to) ? 'page' : undefined"
        class="flex flex-1 flex-col items-center justify-center gap-1 pt-3 pb-4"
      >
        <span
          v-ripple.dark
          class="flex h-8 w-16 items-center justify-center rounded-full"
        >
          <span
            class="pointer-events-none absolute inset-0 rounded-full bg-primary-100 transition-transform duration-300 ease-out"
            :class="isActive(item.to) ? 'scale-x-100' : 'scale-x-0'"
          />
          <UIcon
            :name="item.icon"
            class="pointer-events-none relative size-6"
            :class="isActive(item.to) ? 'text-primary' : 'text-gray-500'"
          />
        </span>
        <span
          class="pointer-events-none text-xs tracking-wide"
          :class="isActive(item.to) ? 'font-bold text-gray-900' : 'font-medium text-gray-500'"
        >{{ item.label }}</span>
      </NuxtLink>
    </div>
  </nav>
</template>
