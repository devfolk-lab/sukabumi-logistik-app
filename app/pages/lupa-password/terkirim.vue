<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const resetEmail = useState<string>('resetEmail', () => '')
const toast = useToast()

const displayEmail = computed(() => resetEmail.value || 'email kamu')

function resendEmail() {
  toast.add({ title: 'Email berhasil dikirim ulang.' })
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
      Kami sudah mengirimkan link masuk ke <span class="font-bold text-gray-700">{{ displayEmail }}</span>. Klik link tersebut untuk melanjutkan mengatur ulang password.
    </p>

    <div class="mt-6 flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3.5">
      <UIcon
        name="i-lucide-info"
        class="mt-0.5 size-4 shrink-0 text-blue-600"
      />
      <p class="text-sm text-blue-800">
        Link berlaku selama 15 menit. Tidak menerima email? Cek folder spam, atau kirim ulang di bawah ini.
      </p>
    </div>

    <UButton
      v-ripple.dark
      color="neutral"
      variant="outline"
      size="xl"
      block
      class="mt-6 font-bold"
      @click="resendEmail"
    >
      Kirim Ulang Email
    </UButton>

    <div class="mt-4 rounded-2xl border border-secondary/20 bg-secondary-50 p-4">
      <p class="text-sm font-bold uppercase tracking-wide text-secondary">
        Mode Demo
      </p>
      <p class="mt-1 text-sm text-gray-600">
        Karena ini prototipe, gunakan tombol di bawah untuk mensimulasikan link magic yang seharusnya kamu buka dari email.
      </p>
      <UButton
        to="/reset-password"
        size="xl"
        block
        class="mt-3 font-bold"
      >
        Buka Link Magic (Simulasi)
      </UButton>
    </div>

    <p class="mt-6 text-center text-sm text-gray-500">
      <NuxtLink
        to="/login"
        class="font-bold text-primary"
      >Kembali ke Masuk</NuxtLink>
    </p>
  </div>
</template>
