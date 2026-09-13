<script setup lang="ts">
const nav = useAppNav()
const toast = useToast()
const { changePassword } = useAuthActions()

const { data: profile, status, refresh: refreshProfile } = useProfile()

const loading = computed(() => status.value === 'pending' || status.value === 'idle')

// --- Data akun ---------------------------------------------------------------

const form = reactive({ nama: '', telp: '' })
const savingProfile = ref(false)

// The form mirrors the loaded profile until the user edits it.
watch(profile, (value) => {
  if (!value) return
  form.nama = value.nama
  form.telp = value.telp ?? ''
}, { immediate: true })

const profileDirty = computed(() =>
  Boolean(profile.value)
  && (form.nama.trim() !== profile.value!.nama || form.telp.trim() !== (profile.value!.telp ?? ''))
)

const canSaveProfile = computed(() => profileDirty.value && form.nama.trim() !== '' && !savingProfile.value)

async function saveProfile() {
  if (!canSaveProfile.value) return
  savingProfile.value = true

  try {
    await $fetch('/api/profile', {
      method: 'PATCH',
      body: { nama: form.nama.trim(), telp: form.telp.trim() || null }
    })
    await refreshProfile()
    toast.add({ title: 'Profil diperbarui', color: 'success', icon: 'i-lucide-circle-check' })
  } catch (error) {
    toast.add({
      title: 'Gagal memperbarui profil',
      description: apiMessage(error, 'Coba lagi sebentar.'),
      color: 'error'
    })
  } finally {
    savingProfile.value = false
  }
}

// --- Password ----------------------------------------------------------------

const pw = reactive({ current: '', next: '', confirm: '' })
const showPassword = ref(false)
const savingPassword = ref(false)

const passwordError = computed(() => {
  if (pw.next && pw.next.length < 8) return 'Password minimal 8 karakter'
  return undefined
})
const confirmError = computed(() => {
  if (pw.confirm && pw.confirm !== pw.next) return 'Konfirmasi password tidak sama'
  return undefined
})

const canSavePassword = computed(() =>
  pw.current !== ''
  && pw.next.length >= 8
  && pw.confirm === pw.next
  && !savingPassword.value
)

async function savePassword() {
  if (!canSavePassword.value || !profile.value) return
  savingPassword.value = true

  try {
    await changePassword(profile.value.email, pw.current, pw.next)
    pw.current = ''
    pw.next = ''
    pw.confirm = ''
    toast.add({ title: 'Password diperbarui', color: 'success', icon: 'i-lucide-circle-check' })
  } catch (error) {
    toast.add({
      title: 'Gagal mengganti password',
      description: (error as Error).message,
      color: 'error'
    })
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div>
    <AppPageHero sticky>
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
          @click="nav.back('/profil')"
        >
          <span
            v-ripple
            class="absolute inset-0 rounded-xl"
          />
          <UIcon
            name="i-lucide-arrow-left"
            class="relative z-10 size-5 text-white pointer-events-none"
          />
        </button>
        <div>
          <h1 class="text-xl font-bold text-white">
            Pengaturan Akun
          </h1>
          <p class="text-sm text-white/60">
            Perbarui data diri dan password
          </p>
        </div>
      </div>
    </AppPageHero>

    <AppPageContent
      v-if="loading"
      class="mt-5 space-y-5 pb-10"
    >
      <USkeleton class="h-80 rounded-3xl" />
      <USkeleton class="h-80 rounded-3xl" />
    </AppPageContent>

    <AppPageContent
      v-else-if="!profile"
      class="mt-5 pb-10"
    >
      <AppNotFound
        title="Profil tidak dapat dimuat"
        description="Coba muat ulang halaman ini."
        back-label="Kembali ke Profil"
        back-to="/profil"
        :retry="refreshProfile"
      />
    </AppPageContent>

    <AppPageContent
      v-else
      class="mt-5 grid gap-5 pb-10 lg:grid-cols-2 lg:items-start"
    >
      <!-- Data akun -->
      <form
        class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat"
        @submit.prevent="saveProfile"
      >
        <div class="mb-5 flex items-center gap-2">
          <div class="flex size-8 items-center justify-center rounded-xl bg-primary-50">
            <UIcon
              name="i-lucide-user"
              class="size-4 text-primary"
            />
          </div>
          <h2 class="text-base font-bold text-gray-800">
            Data Akun
          </h2>
        </div>

        <div class="space-y-4">
          <UFormField label="Nama Lengkap">
            <UInput
              v-model="form.nama"
              type="text"
              size="xl"
              placeholder="Nama sesuai KTP"
              icon="i-lucide-user"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Email"
            help="Email dipakai untuk masuk dan tidak bisa diubah."
          >
            <UInput
              :model-value="profile.email"
              type="email"
              size="xl"
              icon="i-lucide-mail"
              class="w-full"
              disabled
            />
          </UFormField>

          <UFormField label="No. HP">
            <UInput
              v-model="form.telp"
              type="tel"
              size="xl"
              placeholder="08xx-xxxx-xxxx"
              icon="i-lucide-phone"
              class="w-full"
            />
          </UFormField>

          <UButton
            v-ripple
            type="submit"
            size="xl"
            block
            class="font-bold"
            :loading="savingProfile"
            :disabled="!canSaveProfile"
          >
            Simpan Perubahan
          </UButton>
        </div>
      </form>

      <!-- Password: its own form so saving one never touches the other. -->
      <form
        class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat"
        @submit.prevent="savePassword"
      >
        <div class="mb-5 flex items-center gap-2">
          <div class="flex size-8 items-center justify-center rounded-xl bg-amber-50">
            <UIcon
              name="i-lucide-lock"
              class="size-4 text-amber-600"
            />
          </div>
          <h2 class="text-base font-bold text-gray-800">
            Ganti Password
          </h2>
        </div>

        <div class="space-y-4">
          <UFormField label="Password Saat Ini">
            <UInput
              v-model="pw.current"
              :type="showPassword ? 'text' : 'password'"
              size="xl"
              placeholder="Masukkan password saat ini"
              icon="i-lucide-lock"
              autocomplete="current-password"
              class="w-full"
            >
              <template #trailing>
                <UButton
                  color="neutral"
                  variant="link"
                  :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  :aria-label="showPassword ? 'Sembunyikan password' : 'Tampilkan password'"
                  @click="showPassword = !showPassword"
                />
              </template>
            </UInput>
          </UFormField>

          <UFormField
            label="Password Baru"
            :error="passwordError"
          >
            <UInput
              v-model="pw.next"
              :type="showPassword ? 'text' : 'password'"
              size="xl"
              placeholder="Minimal 8 karakter"
              icon="i-lucide-lock-keyhole"
              autocomplete="new-password"
              class="w-full"
            />
          </UFormField>

          <UFormField
            label="Konfirmasi Password Baru"
            :error="confirmError"
          >
            <UInput
              v-model="pw.confirm"
              :type="showPassword ? 'text' : 'password'"
              size="xl"
              placeholder="Ulangi password baru"
              icon="i-lucide-lock-keyhole"
              autocomplete="new-password"
              class="w-full"
            />
          </UFormField>

          <UButton
            v-ripple
            type="submit"
            size="xl"
            block
            class="font-bold"
            :loading="savingPassword"
            :disabled="!canSavePassword"
          >
            Ganti Password
          </UButton>
        </div>
      </form>
    </AppPageContent>
  </div>
</template>
