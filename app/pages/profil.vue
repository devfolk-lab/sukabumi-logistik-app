<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

const auth = useAuthStore()

async function logout() {
  auth.logout()
  await navigateTo('/login')
}
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
        <div class="min-w-0">
          <h1 class="truncate text-2xl font-bold text-white">
            {{ auth.user?.nama ?? 'Fulan' }}
          </h1>
          <p class="truncate text-sm text-white/60">
            {{ auth.user?.email ?? 'fulan@email.com' }}
          </p>
        </div>
        <button
          type="button"
          class="relative ml-auto flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10"
          aria-label="Edit profil"
        >
          <span
            v-ripple
            class="absolute inset-0 rounded-xl"
          />
          <UIcon
            name="i-lucide-pencil"
            class="relative z-10 size-4 text-white pointer-events-none"
          />
        </button>
      </div>
    </AppPageHero>

    <AppPageContent class="relative z-20 -mt-5">
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-xl font-bold text-gray-800">
            Ringkasan
          </h2>
          <button
            v-ripple.dark
            type="button"
            class="flex items-center gap-1 rounded-lg px-2 py-1 text-base font-semibold text-primary"
          >
            <span class="pointer-events-none">Minggu Ini</span>
            <UIcon
              name="i-lucide-chevron-down"
              class="pointer-events-none size-4"
            />
          </button>
        </div>
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div class="rounded-2xl bg-gray-50 p-4">
            <div class="mb-2 flex size-9 items-center justify-center rounded-xl bg-blue-50">
              <UIcon
                name="i-lucide-package"
                class="size-4 text-blue-600"
              />
            </div>
            <p class="text-2xl font-bold text-gray-800">
              24
            </p>
            <p class="mt-0.5 text-sm text-gray-500">
              Total Pengiriman
            </p>
          </div>
          <div class="rounded-2xl bg-gray-50 p-4">
            <div class="mb-2 flex size-9 items-center justify-center rounded-xl bg-amber-50">
              <UIcon
                name="i-lucide-clock"
                class="size-4 text-amber-600"
              />
            </div>
            <p class="text-2xl font-bold text-gray-800">
              8
            </p>
            <p class="mt-0.5 text-sm text-gray-500">
              Dalam Proses
            </p>
          </div>
          <div class="rounded-2xl bg-gray-50 p-4">
            <div class="mb-2 flex size-9 items-center justify-center rounded-xl bg-emerald-50">
              <UIcon
                name="i-lucide-circle-check-big"
                class="size-4 text-emerald-600"
              />
            </div>
            <p class="text-2xl font-bold text-gray-800">
              16
            </p>
            <p class="mt-0.5 text-sm text-gray-500">
              Terkirim
            </p>
          </div>
          <div class="rounded-2xl bg-gray-50 p-4">
            <div class="mb-2 flex size-9 items-center justify-center rounded-xl bg-red-50">
              <UIcon
                name="i-lucide-triangle-alert"
                class="size-4 text-red-500"
              />
            </div>
            <p class="text-2xl font-bold text-gray-800">
              3
            </p>
            <p class="mt-0.5 text-sm text-gray-500">
              Tertunda
            </p>
          </div>
        </div>
      </div>
    </AppPageContent>

    <AppPageContent class="mt-6 space-y-3 pb-6">
      <h2 class="mb-1 text-base font-bold text-gray-800">
        Akun
      </h2>

      <NuxtLink
        v-ripple.dark
        to="/alamat"
        class="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-card lg:shadow-card-flat"
      >
        <span class="flex items-center gap-3 text-sm font-semibold text-gray-700">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50">
            <UIcon
              name="i-lucide-map-pin"
              class="size-4 text-primary"
            />
          </span>
          Alamat Tersimpan
        </span>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-4 text-gray-300"
        />
      </NuxtLink>

      <button
        v-ripple.dark
        type="button"
        class="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-card lg:shadow-card-flat"
      >
        <span class="flex items-center gap-3 text-sm font-semibold text-gray-700">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50">
            <UIcon
              name="i-lucide-settings"
              class="size-4 text-primary"
            />
          </span>
          Pengaturan Akun
        </span>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-4 text-gray-300"
        />
      </button>

      <button
        v-ripple.dark
        type="button"
        class="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-card lg:shadow-card-flat"
      >
        <span class="flex items-center gap-3 text-sm font-semibold text-gray-700">
          <span class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary-50">
            <UIcon
              name="i-lucide-circle-help"
              class="size-4 text-primary"
            />
          </span>
          Pusat Bantuan
        </span>
        <UIcon
          name="i-lucide-chevron-right"
          class="size-4 text-gray-300"
        />
      </button>

      <button
        v-ripple.dark
        type="button"
        class="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 shadow-card lg:shadow-card-flat"
        @click="logout"
      >
        <span class="flex items-center gap-3 text-base font-semibold text-red-500">
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
  </div>
</template>
