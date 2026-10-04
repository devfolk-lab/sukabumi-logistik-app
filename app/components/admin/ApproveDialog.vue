<script setup lang="ts">
import type { AdminOrder } from '~/types'

/**
 * Approves a paid order: the admin has seen the transfer, and this books the
 * shipment on Biteship. Coordinates are optional — some carriers (Lion Parcel
 * among them) place the pickup by them and may refuse an order without.
 */
const props = defineProps<{ order: AdminOrder | null }>()
const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{ approved: [order: AdminOrder] }>()

const toast = useToast()
const pending = ref(false)
const showCoordinates = ref(false)
const origin = ref('')
const destination = ref('')

watch(open, (now) => {
  if (!now) return
  showCoordinates.value = false
  origin.value = ''
  destination.value = ''
})

const originPoint = computed(() => parseCoordinate(origin.value))
const destinationPoint = computed(() => parseCoordinate(destination.value))
const invalid = computed(() => originPoint.value === false || destinationPoint.value === false)

async function approve() {
  if (!props.order || pending.value || invalid.value) return
  pending.value = true
  try {
    const approved = await $fetch<AdminOrder>(`/api/admin/orders/${props.order.id}/approve`, {
      method: 'POST',
      body: {
        ...(originPoint.value ? { originCoordinate: originPoint.value } : {}),
        ...(destinationPoint.value ? { destinationCoordinate: destinationPoint.value } : {})
      }
    })
    open.value = false
    toast.add({
      title: 'Pesanan disetujui',
      description: approved.awb ? `Resi ${approved.awb} terbit.` : 'Pesanan sudah dibuat di Biteship.',
      color: 'success',
      icon: 'i-lucide-circle-check'
    })
    emit('approved', approved)
  } catch (error) {
    handleUnauthorized(error)
    toast.add({ title: 'Gagal menyetujui pesanan', description: apiMessage(error, 'Coba lagi sebentar.'), color: 'error' })
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <AppDialog
    v-model:open="open"
    title="Setujui pesanan?"
    description="Pastikan transfer sudah masuk. Pesanan akan dibuat di Biteship dan kurir dijadwalkan."
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div
        v-if="order"
        class="space-y-4"
      >
        <div class="flex items-center justify-between gap-3 rounded-2xl bg-primary-50 p-4">
          <div class="min-w-0">
            <p class="text-xs font-bold uppercase tracking-wider text-primary/60">
              Cocokkan dengan transfer
            </p>
            <p class="mt-0.5 text-2xl font-extrabold text-primary">
              {{ formatRupiah(order.price) }}
            </p>
          </div>
          <div class="min-w-0 text-right">
            <p class="font-mono text-sm font-bold text-gray-800">
              {{ order.orderNo }}
            </p>
            <p class="truncate text-sm text-gray-500">
              {{ order.customer.nama }}
            </p>
          </div>
        </div>

        <dl class="space-y-1.5 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
          <div class="flex justify-between gap-3">
            <dt class="shrink-0 text-gray-400">
              Kurir
            </dt>
            <dd class="truncate font-semibold text-gray-800">
              {{ order.courier }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="shrink-0 text-gray-400">
              Rute
            </dt>
            <dd class="truncate font-semibold text-gray-800">
              {{ order.pickup }} → {{ order.delivery }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="shrink-0 text-gray-400">
              Berat
            </dt>
            <dd class="truncate font-semibold text-gray-800">
              {{ order.weight }} · {{ order.items.length }} barang
            </dd>
          </div>
        </dl>

        <div>
          <button
            v-ripple.dark
            type="button"
            class="flex w-full items-center justify-between rounded-xl px-1 py-1.5 text-sm font-semibold text-gray-600"
            :aria-expanded="showCoordinates"
            @click="showCoordinates = !showCoordinates"
          >
            <span class="pointer-events-none flex items-center gap-2">
              <UIcon
                name="i-lucide-map-pinned"
                class="size-4 text-gray-400"
              />
              Koordinat (opsional)
            </span>
            <UIcon
              name="i-lucide-chevron-down"
              class="pointer-events-none size-4 text-gray-400 transition-transform"
              :class="showCoordinates ? 'rotate-180' : ''"
            />
          </button>
          <div
            v-if="showCoordinates"
            class="mt-2 space-y-3"
          >
            <p class="text-xs text-gray-500">
              Isi jika kurir menolak pesanan tanpa koordinat. Salin dari Google Maps, contoh <span class="font-mono">-6.9175, 106.9277</span>.
            </p>
            <UFormField
              label="Titik penjemputan"
              :error="originPoint === false ? 'Format: lintang, bujur' : undefined"
            >
              <UInput
                v-model="origin"
                placeholder="-6.9175, 106.9277"
                inputmode="decimal"
                class="w-full font-mono"
              />
            </UFormField>
            <UFormField
              label="Titik tujuan"
              :error="destinationPoint === false ? 'Format: lintang, bujur' : undefined"
            >
              <UInput
                v-model="destination"
                placeholder="-6.2000, 106.8166"
                inputmode="decimal"
                class="w-full font-mono"
              />
            </UFormField>
          </div>
        </div>
      </div>
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
          icon="i-lucide-check"
          :loading="pending"
          :disabled="invalid"
          @click="approve"
        >
          Setujui
        </UButton>
      </div>
    </template>
  </AppDialog>
</template>
