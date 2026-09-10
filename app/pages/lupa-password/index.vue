<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { sendResetLink } = useAuthActions()
const toast = useToast()

const resetEmail = useState<string>('resetEmail', () => '')
const email = ref('')
const pending = ref(false)

async function sendMagicLink() {
  const value = email.value.trim()
  if (!value || pending.value) return
  pending.value = true

  try {
    await sendResetLink(value)
    resetEmail.value = value
    await navigateTo('/lupa-password/terkirim')
  } catch (error) {
    toast.add({
      title: 'Gagal mengirim link',
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
        :loading="pending"
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
