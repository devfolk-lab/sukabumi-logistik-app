<script setup lang="ts">
const { logout: signOut } = useAuthActions()
const toast = useToast()

const { data: profile, refresh: refreshProfile } = await useProfile()
const { data: stats } = await useOrderStats()

const editing = ref(false)
const saving = ref(false)
const form = reactive({ nama: '', telp: '' })

const tiles = computed(() => [
  { label: 'Total Pengiriman', value: stats.value?.total ?? 0, icon: 'i-lucide-package', bg: 'bg-blue-50', text: 'text-blue-600' },
  { label: 'Dalam Proses', value: stats.value?.proses ?? 0, icon: 'i-lucide-clock', bg: 'bg-amber-50', text: 'text-amber-600' },
  { label: 'Terkirim', value: stats.value?.selesai ?? 0, icon: 'i-lucide-circle-check-big', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { label: 'Dibatalkan', value: stats.value?.batal ?? 0, icon: 'i-lucide-triangle-alert', bg: 'bg-red-50', text: 'text-red-500' }
])

function openEdit() {
  form.nama = profile.value?.nama ?? ''
  form.telp = profile.value?.telp ?? ''
  editing.value = true
}

async function saveProfile() {
  if (!form.nama.trim() || saving.value) return
  saving.value = true

  try {
    await $fetch('/api/profile', {
      method: 'PATCH',
      body: { nama: form.nama.trim(), telp: form.telp.trim() || null }
    })
    await refreshProfile()
    editing.value = false
    toast.add({ title: 'Profil diperbarui' })
  } catch (error) {
    toast.add({
      title: 'Gagal memperbarui profil',
      description: apiMessage(error, 'Coba lagi sebentar.'),
      color: 'error'
    })
  } finally {
    saving.value = false
  }
}

async function logout() {
  await signOut()
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
            {{ profile?.nama ?? '...' }}
          </h1>
          <p class="truncate text-sm text-white/60">
            {{ profile?.email ?? '' }}
          </p>
        </div>
        <button
          type="button"
          class="relative ml-auto flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10"
          aria-label="Edit profil"
          @click="openEdit"
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
          <span class="text-base font-semibold text-gray-400">Semua Waktu</span>
        </div>
        <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div
            v-for="tile in tiles"
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
        @click="openEdit"
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

    <UModal
      v-model:open="editing"
      title="Edit Profil"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField label="Nama Lengkap">
            <UInput
              v-model="form.nama"
              size="xl"
              class="w-full"
            />
          </UFormField>
          <UFormField label="No. HP">
            <UInput
              v-model="form.telp"
              type="tel"
              size="xl"
              placeholder="08xx-xxxx-xxxx"
              class="w-full"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex w-full gap-2">
          <UButton
            color="neutral"
            variant="soft"
            size="lg"
            block
            class="flex-1"
            @click="editing = false"
          >
            Batal
          </UButton>
          <UButton
            size="lg"
            block
            class="flex-1 font-bold"
            :loading="saving"
            :disabled="!form.nama.trim()"
            @click="saveProfile"
          >
            Simpan
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
