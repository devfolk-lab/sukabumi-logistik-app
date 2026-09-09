<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const resetEmail = useState<string>('resetEmail', () => '')
const email = ref('')

async function sendMagicLink() {
  resetEmail.value = email.value.trim()
  await navigateTo('/lupa-password/terkirim')
}
</script>

<template>
  <div>
    <UButton
      v-ripple.dark
      to="/login"
      color="neutral"
      variant="soft"
      icon="i-lucide-arrow-left"
      class="mb-6 rounded-xl bg-gray-100 text-gray-600"
      aria-label="Kembali"
    />

    <h1 class="text-2xl font-extrabold text-gray-800">
      Lupa password?
    </h1>
    <p class="mt-1.5 text-sm text-gray-500">
      Masukkan email akun kamu, kami akan kirimkan link masuk (magic link) untuk mengatur ulang password.
    </p>

    <form
      class="mt-7 space-y-4"
      @submit.prevent="sendMagicLink"
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

      <UButton
        type="submit"
        size="xl"
        block
        class="font-bold"
      >
        Kirim Link Masuk
      </UButton>
    </form>

    <p class="mt-6 text-center text-sm text-gray-500">
      Ingat password kamu?
      <NuxtLink
        to="/login"
        class="font-bold text-primary"
      >Masuk</NuxtLink>
    </p>
  </div>
</template>
