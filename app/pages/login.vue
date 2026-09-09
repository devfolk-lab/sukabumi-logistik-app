<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({ layout: 'auth' })

const auth = useAuthStore()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(false)

async function submit() {
  auth.login(email.value.trim() || 'fulan@email.com')
  await navigateTo('/')
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-extrabold text-gray-800">
      Masuk ke akun kamu
    </h1>
    <p class="mt-1.5 text-sm text-gray-500">
      Kelola pengiriman paketmu lebih mudah.
    </p>

    <form
      class="mt-8 space-y-4"
      @submit.prevent="submit"
    >
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

      <UFormField label="Password">
        <UInput
          v-model="password"
          :type="showPassword ? 'text' : 'password'"
          size="xl"
          placeholder="Masukkan password"
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

      <div class="flex items-center justify-between">
        <UCheckbox
          v-model="rememberMe"
          label="Ingat saya"
        />
        <NuxtLink
          to="/lupa-password"
          class="text-sm font-semibold text-primary"
        >
          Lupa password?
        </NuxtLink>
      </div>

      <UButton
        type="submit"
        size="xl"
        block
        class="font-bold"
      >
        Masuk
      </UButton>
    </form>

    <p class="mt-6 text-center text-sm text-gray-500">
      Belum punya akun?
      <NuxtLink
        to="/register"
        class="font-bold text-primary"
      >Daftar sekarang</NuxtLink>
    </p>
  </div>
</template>
