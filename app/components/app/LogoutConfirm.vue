<script setup lang="ts">
/** Confirmation dialog shared by the sidebar and the profile screen. */
const open = defineModel<boolean>('open', { default: false })

const { logout } = useAuthActions()
const toast = useToast()
const pending = ref(false)

async function confirm() {
  if (pending.value) return
  pending.value = true

  try {
    await logout()
    open.value = false
    toast.add({ title: 'Kamu sudah keluar', description: 'Sampai jumpa lagi.' })
    await navigateTo('/login')
  } catch (error) {
    toast.add({
      title: 'Gagal keluar',
      description: (error as Error).message,
      color: 'error'
    })
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Keluar dari akun?"
    description="Kamu perlu masuk lagi untuk mengelola pengiriman."
  >
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
          color="error"
          size="lg"
          block
          class="flex-1 font-bold"
          :loading="pending"
          @click="confirm"
        >
          Keluar
        </UButton>
      </div>
    </template>
  </UModal>
</template>
