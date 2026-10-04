<script setup lang="ts">
definePageMeta({ refreshKeys: ['profile', 'stats'] })

const { data: profile } = useProfile()
const { data: stats, status: statsStatus } = useOrderStats()

const confirmLogout = ref(false)

const statsLoading = computed(() => statsStatus.value === 'pending' || statsStatus.value === 'idle')

const tiles = computed(() => [
  { label: 'Total Pengiriman', value: stats.value?.total ?? 0, icon: 'i-lucide-package', bg: 'bg-blue-50', text: 'text-blue-600' },
  { label: 'Dalam Proses', value: stats.value?.proses ?? 0, icon: 'i-lucide-clock', bg: 'bg-amber-50', text: 'text-amber-600' },
  { label: 'Terkirim', value: stats.value?.selesai ?? 0, icon: 'i-lucide-circle-check-big', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { label: 'Dibatalkan', value: stats.value?.batal ?? 0, icon: 'i-lucide-triangle-alert', bg: 'bg-red-50', text: 'text-red-500' }
])

// Pusat Bantuan is a WhatsApp chat with the team, opened with a greeting.
const helpUrl = useWhatsappChat().url('Halo Sukabumi Logistik, saya butuh bantuan.')
const toast = useToast()

function helpUnavailable() {
  toast.add({ title: 'Pusat Bantuan belum tersedia', description: 'Nomor WhatsApp bantuan belum diatur.', color: 'warning' })
}

const menu = [
  { label: 'Alamat Tersimpan', to: '/alamat', icon: 'i-lucide-map-pin' },
  { label: 'Pengaturan Akun', to: '/profil/pengaturan', icon: 'i-lucide-settings' }
]

// Staff menus, by role. On phones this is their only entry point.
const authUser = useAuthUser()
const adminMenu = computed(() => [
  ...(canApproveOrders(authUser.value?.role) ? [{ label: 'Persetujuan Pesanan', to: '/admin/pesanan', icon: 'i-lucide-clipboard-check' }] : []),
  ...(canManageStaff(authUser.value?.role) ? [{ label: 'Kelola Admin', to: '/admin/pengguna', icon: 'i-lucide-shield-user' }] : [])
])
</script>

<template>
  <div>
    <AppPageHero>
      <div class="flex items-center gap-4">
        <div class="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
          <UIcon
            name="i-lucide-user"
            class="size-7 text-white"
          />
        </div>
        <div class="min-w-0 flex-1">
          <template v-if="profile">
            <h1 class="truncate text-2xl font-bold text-white">
              {{ profile.nama }}
            </h1>
            <p class="truncate text-sm text-white/60">
              {{ profile.email }}
            </p>
          </template>
          <template v-else>
            <USkeleton class="h-7 w-40 rounded-lg bg-white/15" />
            <USkeleton class="mt-2 h-4 w-52 rounded bg-white/10" />
          </template>
        </div>
        <NuxtLink
          to="/profil/pengaturan"
          class="relative ml-auto flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
          aria-label="Pengaturan akun"
        >
          <span
            v-ripple
            class="absolute inset-0 rounded-xl"
          />
          <UIcon
            name="i-lucide-pencil"
            class="relative z-10 size-4 text-white pointer-events-none"
          />
        </NuxtLink>
      </div>
    </AppPageHero>

    <AppPageContent class="relative z-20 -mt-5">
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800">
            Ringkasan
          </h2>
          <span class="text-base font-semibold text-gray-400">Semua Waktu</span>
        </div>
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <template v-if="statsLoading">
            <USkeleton
              v-for="n in 4"
              :key="n"
              class="h-28 rounded-2xl"
            />
          </template>
          <div
            v-for="tile in tiles"
            v-else
            :key="tile.label"
            class="rounded-2xl bg-gray-50 p-4"
          >
            <div
              class="mb-2 flex size-9 items-center justify-center rounded-xl"
              :class="tile.bg"
            >
              <UIcon
                :name="tile.icon"
                class="size-4"
                :class="tile.text"
              />
            </div>
            <p class="text-2xl font-bold text-gray-800">
              {{ tile.value }}
            </p>
            <p class="mt-0.5 text-sm text-gray-500">
              {{ tile.label }}
            </p>
          </div>
        </div>
      </div>
    </AppPageContent>

    <AppPageContent
      v-if="adminMenu.length"
      class="mt-6 space-y-3"
    >
      <h2 class="mb-1 flex items-center gap-2 text-base font-bold text-gray-800">
        Admin
        <UBadge
          color="primary"
          variant="subtle"
          class="rounded-full"
        >
          {{ ROLE_LABEL[authUser?.role ?? 'USER'] }}
        </UBadge>
      </h2>

      <NuxtLink
        v-for="item in adminMenu"
        :key="item.to"
        v-ripple.dark
        :to="item.to"
        class="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-card hover:bg-gray-50 lg:shadow-card-flat"
      >
        <span class="pointer-events-none flex items-center gap-3 text-sm font-semibold text-gray-700">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-50">
            <UIcon
              :name="item.icon"
              class="size-4 text-amber-600"
            />
          </span>
          {{ item.label }}
        </span>
        <UIcon
          name="i-lucide-chevron-right"
          class="pointer-events-none size-4 text-gray-300"
        />
      </NuxtLink>
    </AppPageContent>

    <AppPageContent class="mt-6 space-y-3 pb-6">
      <h2 class="mb-1 text-base font-bold text-gray-800">
        Akun
      </h2>

      <NuxtLink
        v-for="item in menu"
        :key="item.to"
        v-ripple.dark
        :to="item.to"
        class="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-card hover:bg-gray-50 lg:shadow-card-flat"
      >
        <span class="pointer-events-none flex items-center gap-3 text-sm font-semibold text-gray-700">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50">
            <UIcon
              :name="item.icon"
              class="size-4 text-primary"
            />
          </span>
          {{ item.label }}
        </span>
        <UIcon
          name="i-lucide-chevron-right"
          class="pointer-events-none size-4 text-gray-300"
        />
      </NuxtLink>

      <component
        :is="helpUrl ? 'a' : 'button'"
        v-ripple.dark
        v-bind="helpUrl ? { href: helpUrl, target: '_blank', rel: 'noopener' } : { type: 'button' }"
        class="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-card hover:bg-gray-50 lg:shadow-card-flat"
        @click="helpUrl || helpUnavailable()"
      >
        <span class="pointer-events-none flex items-center gap-3 text-sm font-semibold text-gray-700">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <UIcon
              name="i-simple-icons-whatsapp"
              class="size-4 text-emerald-600"
            />
          </span>
          Pusat Bantuan
        </span>
        <UIcon
          name="i-lucide-external-link"
          class="pointer-events-none size-4 text-gray-300"
        />
      </component>

      <button
        v-ripple.dark
        type="button"
        class="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-card hover:bg-red-50 lg:shadow-card-flat"
        @click="confirmLogout = true"
      >
        <span class="pointer-events-none flex items-center gap-3 text-base font-semibold text-red-500">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-50">
            <UIcon
              name="i-lucide-log-out"
              class="size-4 text-red-500"
            />
          </span>
          Keluar
        </span>
      </button>
    </AppPageContent>

    <AppLogoutConfirm v-model:open="confirmLogout" />
  </div>
</template>
