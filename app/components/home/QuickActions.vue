<script setup lang="ts">
const authUser = useAuthUser()

const customerActions = [
  { label: 'Kirim Paket', to: '/kirim', tour: 'kirim', icon: 'i-lucide-package', iconClass: 'bg-primary-50 text-primary' },
  { label: 'Lacak Pengiriman', to: '/lacak', tour: 'lacak', icon: 'i-lucide-map-pin', iconClass: 'bg-orange-50 text-orange-500' },
  { label: 'Riwayat', to: '/riwayat', tour: 'riwayat-menu', icon: 'i-lucide-history', iconClass: 'bg-emerald-50 text-emerald-600' },
  { label: 'Alamat Tersimpan', to: '/alamat', tour: 'alamat', icon: 'i-lucide-house', iconClass: 'bg-purple-50 text-purple-500' }
]

// Staff menus, shown by role like the sidebar's. The server checks the role
// again on every call.
const actions = computed(() => [
  ...customerActions,
  ...(canApproveOrders(authUser.value?.role)
    ? [{ label: 'Persetujuan Pesanan', to: '/admin/pesanan', tour: 'admin-pesanan', icon: 'i-lucide-clipboard-check', iconClass: 'bg-amber-50 text-amber-600' }]
    : []),
  ...(canManageStaff(authUser.value?.role)
    ? [{ label: 'Kelola Admin', to: '/admin/pengguna', tour: 'admin-pengguna', icon: 'i-lucide-shield-user', iconClass: 'bg-sky-50 text-sky-600' }]
    : [])
])

// Customers get one row of four. Staff get rows of three (a six-column grid,
// two columns each); with five items the last row's two are centred.
const staff = computed(() => actions.value.length > 4)
</script>

<template>
  <div class="rounded-3xl bg-white p-5 shadow-card lg:bg-transparent lg:p-0 lg:shadow-none">
    <div
      class="grid gap-1 lg:gap-4"
      :class="staff ? 'grid-cols-6 gap-y-4' : 'grid-cols-4'"
    >
      <NuxtLink
        v-for="(action, i) in actions"
        :key="action.to"
        v-ripple.dark
        :to="action.to"
        :data-tour="action.tour"
        class="flex min-w-0 flex-col items-center gap-2.5 rounded-2xl py-1 lg:flex-row lg:justify-start lg:gap-3.5 lg:bg-white lg:px-5 lg:py-4 lg:shadow-card-flat lg:hover:-translate-y-[3px] lg:hover:shadow-card-hover"
        :class="staff ? ['col-span-2', actions.length === 5 && i === 3 ? 'col-start-2' : ''] : ''"
      >
        <div
          class="pointer-events-none flex size-14 items-center justify-center rounded-2xl lg:size-11"
          :class="action.iconClass"
        >
          <UIcon
            :name="action.icon"
            class="size-6 lg:size-4.5"
          />
        </div>
        <span class="pointer-events-none text-center text-xs font-semibold text-gray-700 sm:text-sm lg:text-left">{{ action.label }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
