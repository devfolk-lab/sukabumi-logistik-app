<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { resendConfirmation } = useAuthActions()
const registeredEmail = useState<string>('registeredEmail', () => '')
const toast = useToast()

const pending = ref(false)

async function resendEmail() {
  if (!registeredEmail.value || pending.value) return
  pending.value = true
  try {
    await resendConfirmation(registeredEmail.value)
    toast.add({ title: 'Email konfirmasi dikirim ulang', description: `Cek kotak masuk ${registeredEmail.value}.` })
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
        name="i-lucide-mail-check"
        class="size-8 text-primary"
      />
    </div>
    <h1 class="mt-6 text-center text-2xl font-extrabold text-gray-800">
      Konfirmasi email kamu
    </h1>
    <p class="mt-2 text-center text-sm text-gray-500">
      Akun kamu sudah dibuat. Kami mengirimkan link konfirmasi ke
      <span class="font-bold text-gray-700">{{ registeredEmail || 'email kamu' }}</span>.
      Klik link tersebut untuk mengaktifkan akun dan langsung masuk.
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
      v-if="registeredEmail"
      v-ripple.dark
      color="neutral"
      variant="outline"
      size="xl"
      block
      class="mt-6 font-bold"
      :loading="pending"
      @click="resendEmail"
    >
      Kirim Ulang Email Konfirmasi
    </UButton>

    <p class="mt-6 text-center text-sm text-gray-500">
      Sudah konfirmasi?
      <NuxtLink
        to="/login"
        class="font-bold text-primary"
      >Masuk</NuxtLink>
    </p>
  </div>
</template>
