<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'auth' })

const auth = useAuthStore()
const toast = useToast()

const nama = ref('')
const email = ref('')
const telepon = ref('')
const password = ref('')
const passwordConfirm = ref('')
const showPassword = ref(false)
const agree = ref(false)

async function submit() {
  auth.register(nama.value, email.value.trim() || 'fulan@email.com')
  toast.add({
    title: 'Akun berhasil dibuat!',
    description: `Selamat datang${nama.value.trim() ? `, ${nama.value.trim()}` : ''}.`
  })
  await navigateTo('/')
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-extrabold text-gray-800">
      Buat akun baru
    </h1>
    <p class="mt-1.5 text-sm text-gray-500">
      Isi datamu untuk mulai mengirim paket.
    </p>

    <form
      class="mt-8 space-y-4"
      @submit.prevent="submit"
    >
      <UFormField label="Nama Lengkap">
        <UInput
          v-model="nama"
          type="text"
          size="xl"
          placeholder="Nama sesuai KTP"
          icon="i-lucide-user"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Email">
        <UInput
          v-model="email"
          type="email"
          size="xl"
          placeholder="nama@email.com"
          icon="i-lucide-mail"
          class="w-full"
        />
      </UFormField>

      <UFormField label="No. HP">
        <UInput
          v-model="telepon"
          type="tel"
          size="xl"
          placeholder="08xx-xxxx-xxxx"
          icon="i-lucide-phone"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Password">
        <UInput
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          size="xl"
          placeholder="Minimal 8 karakter"
          icon="i-lucide-lock"
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

      <UFormField label="Konfirmasi Password">
        <UInput
          v-model="passwordConfirm"
          type="password"
          size="xl"
          placeholder="Ulangi password"
          icon="i-lucide-lock"
          class="w-full"
        />
      </UFormField>

      <UCheckbox
        v-model="agree"
        label="Saya menyetujui Syarat & Ketentuan serta Kebijakan Privasi Sukabumi Logistik"
      />

      <UButton
        type="submit"
        size="xl"
        block
        class="font-bold"
      >
        Daftar
      </UButton>
    </form>

    <p class="mt-6 text-center text-sm text-gray-500">
      Sudah punya akun?
      <NuxtLink
        to="/login"
        class="font-bold text-primary"
      >Masuk</NuxtLink>
    </p>
  </div>
</template>
