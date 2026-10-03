<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { sendResetLink } = useAuthActions()
const resetEmail = useState<string>('resetEmail', () => '')
const toast = useToast()

const displayEmail = computed(() => resetEmail.value || 'email kamu')
const pending = ref(false)

async function resendEmail() {
  if (!resetEmail.value || pending.value) return
  pending.value = true
  try {
    await sendResetLink(resetEmail.value)
    toast.add({ title: 'Email berhasil dikirim ulang.', description: `Cek kotak masuk ${resetEmail.value}.` })
  } catch (error) {
    toast.add({ title: 'Gagal mengirim ulang', description: (error as Error).message, color: 'error' })
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div>
    <div class="mx-auto flex size-16 items-center justify-center rounded-3xl bg-primary-50">
      <UIcon
        name="i-lucide-mailbox"
        class="size-8 text-primary"
      />
    </div>
    <h1 class="mt-6 text-center text-2xl font-extrabold text-gray-800">
      Cek email kamu
    </h1>
    <p class="mt-2 text-center text-sm text-gray-500">
      Jika <span class="font-bold text-gray-700">{{ displayEmail }}</span> terdaftar, kami sudah mengirimkan link untuk mengatur ulang password. Klik link tersebut untuk membuat password baru.
    </p>

    <div class="mt-6 flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3.5">
      <UIcon
        name="i-lucide-info"
        class="mt-0.5 size-4 shrink-0 text-blue-600"
      />
      <p class="text-sm text-blue-800">
        Tidak menerima email? Cek folder spam atau promosi, atau kirim ulang di bawah ini.
      </p>
    </div>

    <UButton
      v-if="resetEmail"
      v-ripple.dark
      color="neutral"
      variant="outline"
      size="xl"
      block
      class="mt-6 font-bold"
      :loading="pending"
      @click="resendEmail"
    >
      Kirim Ulang Email
    </UButton>

    <p class="mt-6 text-center text-sm text-gray-500">
      <NuxtLink
        to="/login"
        class="font-bold text-primary"
      >Kembali ke Masuk</NuxtLink>
    </p>
  </div>
</template>
