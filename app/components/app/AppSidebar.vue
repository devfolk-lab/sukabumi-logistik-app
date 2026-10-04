<script setup lang="ts">
const items = [
  { label: 'Beranda', to: '/', icon: 'i-lucide-house' },
  { label: 'Kirim Paket', to: '/kirim', icon: 'i-lucide-package' },
  { label: 'Lacak Pengiriman', to: '/lacak', icon: 'i-lucide-map-pin' },
  { label: 'Riwayat', to: '/riwayat', icon: 'i-lucide-history' },
  { label: 'Alamat Tersimpan', to: '/alamat', icon: 'i-lucide-mailbox' },
  { label: 'Profil', to: '/profil', icon: 'i-lucide-user' }
]

const route = useRoute()
const { data: profile } = useProfile()
const authUser = useAuthUser()

// Staff menus, shown by role. The server checks the role again on every call.
const adminItems = computed(() => [
  ...(canApproveOrders(authUser.value?.role) ? [{ label: 'Persetujuan Pesanan', to: '/admin/pesanan', icon: 'i-lucide-clipboard-check' }] : []),
  ...(canManageStaff(authUser.value?.role) ? [{ label: 'Kelola Admin', to: '/admin/pengguna', icon: 'i-lucide-shield-user' }] : [])
])

const confirmLogout = ref(false)

function isActive(to: string): boolean {
  return to === '/' ? route.path === '/' : route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <aside class="fixed inset-y-0 left-0 z-40 hidden w-68 flex-col border-r border-gray-100 bg-white px-4 py-6 lg:flex lg:px-6">
    <NuxtLink
      v-ripple.dark
      to="/"
      class="mb-8 block rounded-xl px-2 py-1"
    >
      <AppLogo class="h-9" />
    </NuxtLink>

    <nav class="hide-scrollbar flex-1 space-y-1 overflow-y-auto">
      <NuxtLink
        v-for="item in items"
        :key="item.to"
        v-ripple.dark
        :to="item.to"
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold"
        :class="isActive(item.to) ? 'bg-primary-50 text-primary' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
      >
        <span
          class="pointer-events-none flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200"
          :class="isActive(item.to) ? 'bg-primary text-white' : 'bg-gray-100'"
        >
          <UIcon
            :name="item.icon"
            class="size-4.5"
          />
        </span>
        <span class="pointer-events-none">{{ item.label }}</span>
      </NuxtLink>

      <template v-if="adminItems.length">
        <p class="px-3 pt-5 pb-1 text-xs font-bold uppercase tracking-wider text-gray-400">
          Admin
        </p>
        <NuxtLink
          v-for="item in adminItems"
          :key="item.to"
          v-ripple.dark
          :to="item.to"
          class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold"
          :class="isActive(item.to) ? 'bg-primary-50 text-primary' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'"
        >
          <span
            class="pointer-events-none flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200"
            :class="isActive(item.to) ? 'bg-primary text-white' : 'bg-gray-100'"
          >
            <UIcon
              :name="item.icon"
              class="size-4.5"
            />
          </span>
          <span class="pointer-events-none">{{ item.label }}</span>
        </NuxtLink>
      </template>
    </nav>

    <div class="mt-4 shrink-0 border-t border-gray-100 pt-4">
      <div class="mb-3 flex items-center gap-3 px-2">
        <span class="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-50">
          <UIcon
            name="i-lucide-user"
            class="size-4 text-primary"
          />
        </span>
        <div class="min-w-0">
          <template v-if="profile">
            <p class="truncate text-sm font-bold text-gray-800">
              {{ profile.nama }}
            </p>
            <p class="truncate text-xs text-gray-400">
              {{ profile.email }}
            </p>
          </template>
          <template v-else>
            <USkeleton class="h-4 w-28 rounded" />
            <USkeleton class="mt-1.5 h-3 w-36 rounded" />
          </template>
        </div>
      </div>
      <button
        v-ripple.dark
        type="button"
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-500 hover:bg-red-50"
        @click="confirmLogout = true"
      >
        <span class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-50">
          <UIcon
            name="i-lucide-log-out"
            class="size-4"
          />
        </span>
        <span class="pointer-events-none">Keluar</span>
      </button>
    </div>

    <AppLogoutConfirm v-model:open="confirmLogout" />
  </aside>
</template>
