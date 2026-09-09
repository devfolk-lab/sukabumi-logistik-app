<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const password = ref('')
const confirm = ref('')
const showPassword = ref(false)

const errors = computed(() => ({
  password: password.value.length > 0 && password.value.length < 8 ? 'Password minimal 8 karakter' : undefined,
  confirm: confirm.value.length > 0 && confirm.value !== password.value ? 'Konfirmasi password tidak cocok' : undefined
}))

const canSubmit = computed(() => password.value.length >= 8 && password.value === confirm.value)

async function submit() {
  if (!canSubmit.value) return
  await navigateTo('/reset-password/berhasil')
}
</script>

<template>
  <div>
    <div class="mx-auto flex size-16 items-center justify-center rounded-3xl bg-emerald-50">
      <UIcon
        name="i-lucide-lock-open"
        class="size-8 text-emerald-600"
      />
    </div>
    <h1 class="mt-6 text-center text-2xl font-extrabold text-gray-800">
      Buat password baru
    </h1>
    <p class="mt-2 text-center text-sm text-gray-500">
      Link magic kamu valid. Buat password baru untuk akun ini.
    </p>

    <form
      class="mt-7 space-y-4"
      @submit.prevent="submit"
    >
      <UFormField
        label="Password Baru"
        :error="errors.password"
        help="Kombinasikan huruf dan angka agar lebih aman."
      >
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

      <UFormField
        label="Konfirmasi Password Baru"
        :error="errors.confirm"
      >
        <UInput
          v-model="confirm"
          type="password"
          size="xl"
          placeholder="Ulangi password baru"
          icon="i-lucide-lock"
          class="w-full"
        />
      </UFormField>

      <UButton
        type="submit"
        size="xl"
        block
        class="font-bold"
        :disabled="!canSubmit"
      >
        Simpan Password Baru
      </UButton>
    </form>
  </div>
</template>
