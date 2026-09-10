<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { login } = useAuthActions()
const toast = useToast()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const rememberMe = ref(false)
const pending = ref(false)

async function submit() {
  if (pending.value) return
  pending.value = true

  try {
    await login(email.value.trim(), password.value)
    await navigateTo('/')
  } catch (error) {
    toast.add({
      title: 'Gagal masuk',
      description: (error as Error).message,
      color: 'error'
    })
  } finally {
    pending.value = false
  }
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
        :loading="pending"
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
