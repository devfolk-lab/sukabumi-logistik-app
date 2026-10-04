<script setup lang="ts">
import type { Role, StaffUser } from '~/types'

/**
 * Creates a staff account that can sign in straight away. To make an existing
 * customer an admin, search for them on the staff page instead.
 */
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ created: [user: StaffUser] }>()

const toast = useToast()
const pending = ref(false)

const roleOptions: { label: string, value: Exclude<Role, 'USER'>, description: string }[] = [
  { label: 'Admin', value: 'ADMIN', description: 'Menyetujui pesanan' },
  { label: 'Superadmin', value: 'SUPERADMIN', description: 'Menyetujui pesanan dan mengelola admin' }
]

const form = reactive({ nama: '', email: '', telp: '', password: '', role: 'ADMIN' as Exclude<Role, 'USER'> })
const touched = ref(false)

watch(open, (now) => {
  if (!now) return
  Object.assign(form, { nama: '', email: '', telp: '', password: '', role: 'ADMIN' })
  touched.value = false
})

const errors = computed(() => ({
  nama: form.nama.trim() ? undefined : 'Wajib diisi',
  email: /^\S+@\S+\.\S+$/.test(form.email.trim()) ? undefined : 'Email tidak valid',
  password: form.password.length >= 8 ? undefined : 'Minimal 8 karakter'
}))
const valid = computed(() => !errors.value.nama && !errors.value.email && !errors.value.password)

async function submit() {
  touched.value = true
  if (!valid.value || pending.value) return
  pending.value = true
  try {
    const user = await $fetch<StaffUser>('/api/admin/users', {
      method: 'POST',
      body: { nama: form.nama.trim(), email: form.email.trim(), telp: form.telp.trim(), password: form.password, role: form.role }
    })
    open.value = false
    toast.add({ title: 'Akun dibuat', description: `${user.email} bisa langsung masuk.`, color: 'success', icon: 'i-lucide-circle-check' })
    emit('created', user)
  } catch (error) {
    handleUnauthorized(error)
    toast.add({ title: 'Gagal membuat akun', description: apiMessage(error, 'Coba lagi sebentar.'), color: 'error' })
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <AppDialog
    v-model:open="open"
    title="Tambah Admin"
    description="Akun baru langsung aktif tanpa konfirmasi email. Berikan password-nya secara pribadi."
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <form
        class="space-y-3"
        @submit.prevent="submit"
      >
        <UFormField
          label="Nama"
          :error="touched ? errors.nama : undefined"
        >
          <UInput
            v-model="form.nama"
            icon="i-lucide-user"
            size="xl"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Email"
          :error="touched ? errors.email : undefined"
        >
          <UInput
            v-model="form.email"
            type="email"
            autocomplete="off"
            icon="i-lucide-mail"
            size="xl"
            class="w-full"
          />
        </UFormField>
        <UFormField label="No. HP (opsional)">
          <UInput
            v-model="form.telp"
            type="tel"
            icon="i-lucide-phone"
            size="xl"
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Password"
          :error="touched ? errors.password : undefined"
        >
          <UInput
            v-model="form.password"
            type="password"
            autocomplete="new-password"
            icon="i-lucide-lock"
            size="xl"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Peran">
          <div class="flex gap-2">
            <button
              v-for="option in roleOptions"
              :key="option.value"
              v-ripple="{ dark: form.role !== option.value }"
              type="button"
              class="flex flex-1 flex-col items-start rounded-xl border-2 px-3 py-2.5 text-left"
              :class="form.role === option.value
                ? 'border-primary bg-primary-50 text-primary'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'"
              @click="form.role = option.value"
            >
              <span class="pointer-events-none text-sm font-bold">{{ option.label }}</span>
              <span class="pointer-events-none text-xs opacity-75">{{ option.description }}</span>
            </button>
          </div>
        </UFormField>
        <button
          type="submit"
          class="hidden"
        />
      </form>
    </template>
    <template #footer>
      <div class="flex w-full gap-2">
        <UButton
          v-ripple.dark
          color="neutral"
          variant="soft"
          size="lg"
          block
          class="flex-1"
          :disabled="pending"
          @click="open = false"
        >
          Batal
        </UButton>
        <UButton
          v-ripple
          color="primary"
          size="lg"
          block
          class="flex-1 font-bold"
          icon="i-lucide-user-plus"
          :loading="pending"
          @click="submit"
        >
          Buat Akun
        </UButton>
      </div>
    </template>
  </AppDialog>
</template>
