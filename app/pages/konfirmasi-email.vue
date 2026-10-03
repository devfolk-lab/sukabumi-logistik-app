<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const route = useRoute()
const { confirmEmail, resendConfirmation } = useAuthActions()
const toast = useToast()

const failure = ref('')
const confirmed = ref(false)
const email = ref('')
const resending = ref(false)

async function resend() {
  const value = email.value.trim()
  if (!value || resending.value) return
  resending.value = true
  try {
    await resendConfirmation(value)
    toast.add({ title: 'Link baru dikirim', description: `Jika ${value} terdaftar dan belum aktif, link konfirmasi baru sudah dikirim.` })
  } catch (error) {
    toast.add({ title: 'Gagal mengirim ulang', description: (error as Error).message, color: 'error' })
  } finally {
    resending.value = false
  }
}

// Seconds left before the success screen moves on to the home page.
const REDIRECT_SECONDS = 4
const countdown = ref(REDIRECT_SECONDS)
let timer: ReturnType<typeof setInterval> | undefined

function goHome() {
  clearInterval(timer)
  return navigateTo('/', { replace: true })
}

onBeforeUnmount(() => clearInterval(timer))

// The link from the confirmation email lands here with `?token=…`; redeeming
// it confirms the address and signs the user in, so the success screen only
// has to say so and then move on.
onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  if (!token) {
    failure.value = 'Link konfirmasi tidak lengkap. Buka lagi link dari email kamu.'
    return
  }
  try {
    await confirmEmail(token)
    confirmed.value = true
    timer = setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) void goHome()
    }, 1000)
  } catch (error) {
    failure.value = (error as Error).message
  }
})
</script>

<template>
  <div class="text-center">
    <template v-if="confirmed">
      <div class="mx-auto flex size-16 items-center justify-center rounded-3xl bg-emerald-50">
        <UIcon
          name="i-lucide-circle-check"
          class="size-8 text-emerald-500"
        />
      </div>
      <h1 class="mt-6 text-2xl font-extrabold text-gray-800">
        Email terkonfirmasi
      </h1>
      <p class="mt-2 text-sm text-gray-500">
        Akun kamu sudah aktif dan kamu sudah masuk. Selamat datang di Sukabumi Logistik!
      </p>

      <div class="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 p-3.5">
        <UIcon
          name="i-lucide-loader-circle"
          class="size-4 shrink-0 animate-spin text-emerald-600"
        />
        <p class="text-sm text-emerald-800">
          Kamu akan diarahkan ke beranda dalam {{ countdown }} detik.
        </p>
      </div>

      <UButton
        v-ripple
        size="xl"
        block
        class="mt-6 font-bold"
        @click="goHome"
      >
        Ke Beranda Sekarang
      </UButton>
    </template>

    <template v-else-if="!failure">
      <div class="mx-auto flex size-16 items-center justify-center rounded-3xl bg-primary-50">
        <UIcon
          name="i-lucide-loader-circle"
          class="size-8 animate-spin text-primary"
        />
      </div>
      <h1 class="mt-6 text-2xl font-extrabold text-gray-800">
        Mengonfirmasi email…
      </h1>
      <p class="mt-2 text-sm text-gray-500">
        Tunggu sebentar, akun kamu sedang diaktifkan.
      </p>
    </template>

    <template v-else>
      <div class="mx-auto flex size-16 items-center justify-center rounded-3xl bg-red-50">
        <UIcon
          name="i-lucide-mail-x"
          class="size-8 text-red-500"
        />
      </div>
      <h1 class="mt-6 text-2xl font-extrabold text-gray-800">
        Konfirmasi gagal
      </h1>
      <p class="mt-2 text-sm text-gray-500">
        {{ failure }} Jika akunmu sudah aktif, langsung masuk saja. Jika belum, minta link baru di bawah ini.
      </p>

      <form
        class="mt-6 space-y-3 text-left"
        @submit.prevent="resend"
      >
        <UFormField label="Email akun">
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
          v-ripple.dark
          type="submit"
          color="neutral"
          variant="outline"
          size="xl"
          block
          class="font-bold"
          :loading="resending"
          :disabled="!email.trim()"
        >
          Kirim Ulang Link Konfirmasi
        </UButton>
      </form>

      <UButton
        v-ripple
        to="/login"
        size="xl"
        block
        class="mt-3 font-bold"
      >
        Ke Halaman Masuk
      </UButton>
    </template>
  </div>
</template>
