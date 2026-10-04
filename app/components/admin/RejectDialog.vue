<script setup lang="ts">
import type { AdminOrder } from '~/types'

/** Cancels an unpaid order whose transfer never arrived or does not match. */
const props = defineProps<{ order: AdminOrder | null }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ rejected: [order: AdminOrder] }>()

const toast = useToast()
const pending = ref(false)

async function reject() {
  if (!props.order || pending.value) return
  pending.value = true
  try {
    const rejected = await $fetch<AdminOrder>(`/api/admin/orders/${props.order.id}/reject`, { method: 'POST' })
    open.value = false
    toast.add({ title: 'Pesanan ditolak', description: `${rejected.orderNo} dibatalkan.` })
    emit('rejected', rejected)
  } catch (error) {
    handleUnauthorized(error)
    toast.add({ title: 'Gagal menolak pesanan', description: apiMessage(error, 'Coba lagi sebentar.'), color: 'error' })
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <AppDialog
    v-model:open="open"
    title="Tolak pesanan?"
    :description="order ? `${order.orderNo} dari ${order.customer.nama} akan dibatalkan. Kabari pelanggan lewat WhatsApp bila perlu.` : undefined"
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
          @click="reject"
        >
          Tolak Pesanan
        </UButton>
      </div>
    </template>
  </AppDialog>
</template>
