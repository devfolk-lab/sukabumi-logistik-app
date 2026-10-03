<script setup lang="ts">
import type { Order, Shipment } from '~/types'

/**
 * Printable 100 × 150 mm shipping label for one order. Opens the print dialog
 * as soon as the label has rendered, and can also save it as a PDF.
 */
definePageMeta({ layout: false })

const route = useRoute()
const id = computed(() => String(route.params.id))
const toast = useToast()

const request = useRequestFetch()

// Same key as the order detail page, so arriving from there needs no fetch.
const { data, status, error, refresh } = useAsyncData(
  () => `order-${id.value}`,
  () => request<{ order: Order, shipment: Shipment }>(`/api/orders/${id.value}`),
  { lazy: true }
)

const order = computed(() => data.value?.order)
const loading = computed(() => status.value === 'pending' || status.value === 'idle')
const printable = computed(() => Boolean(order.value?.awb) && order.value?.stage !== 'BATAL')

useHead({ title: () => order.value?.awb ? `Resi ${order.value.awb}` : 'Cetak Resi' })

const sheet = useTemplateRef('sheet')

async function print() {
  await nextTick()
  await waitForImages(sheet.value ?? document)
  window.print()
}

// Print once, the first time a printable label is on screen. Arriving from
// the order page, the cached order is here at once while `useAsyncData`
// refetches it — the label renders from the cached copy rather than waiting
// behind the skeleton, or the print dialog would capture the skeleton.
let printed = false
onMounted(() => {
  watch(printable, (value) => {
    if (printed || !value) return
    printed = true
    print()
  }, { immediate: true })
})

const printer = useTemplateRef('printer')
const downloading = ref(false)

async function download() {
  if (!printer.value) return
  downloading.value = true
  try {
    await printer.value.download()
  } catch (err) {
    console.error(err)
    toast.add({ title: 'Gagal mengunduh resi', description: 'Coba lagi sebentar.', color: 'error' })
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <div class="min-h-dvh bg-gray-100 px-4 py-6 print:bg-white print:p-0">
    <div class="mx-auto mb-4 flex max-w-[100mm] items-center justify-between gap-2 print:hidden">
      <UButton
        :to="`/riwayat/${id}`"
        color="neutral"
        variant="ghost"
        icon="i-lucide-arrow-left"
        size="lg"
      >
        Kembali
      </UButton>
      <div
        v-if="order && printable"
        class="flex gap-2"
      >
        <UButton
          color="primary"
          variant="soft"
          icon="i-lucide-download"
          size="lg"
          class="font-bold"
          :loading="downloading"
          @click="download"
        >
          Unduh
        </UButton>
        <UButton
          color="primary"
          icon="i-lucide-printer"
          size="lg"
          class="font-bold"
          @click="print"
        >
          Cetak
        </UButton>
      </div>
    </div>

    <div
      v-if="order && printable"
      ref="sheet"
    >
      <ResiLabel :order="order" />
      <ResiPrinter
        ref="printer"
        :order="order"
      />
    </div>

    <div
      v-else-if="order"
      class="mx-auto max-w-md rounded-3xl bg-white p-6 text-center shadow-card"
    >
      <UIcon
        name="i-lucide-file-x"
        class="mx-auto size-8 text-amber-500"
      />
      <p class="mt-3 text-base font-bold text-gray-800">
        Resi belum bisa dicetak
      </p>
      <p class="mt-1 text-sm text-gray-500">
        {{ order.stage === 'BATAL' ? 'Pesanan ini sudah dibatalkan.' : 'Nomor resi terbit setelah pembayaran dikonfirmasi.' }}
      </p>
    </div>

    <USkeleton
      v-else-if="loading"
      class="mx-auto h-[150mm] w-[100mm] max-w-full rounded-none"
    />

    <div
      v-else
      class="mx-auto max-w-md"
    >
      <AppNotFound
        title="Pesanan tidak ditemukan"
        :description="apiMessage(error, 'Pesanan ini mungkin sudah dihapus atau bukan milik akunmu.')"
        back-label="Kembali ke Riwayat"
        back-to="/riwayat"
        :retry="refresh"
      />
    </div>
  </div>
</template>

<style>
@media print {
  @page {
    size: 100mm 150mm;
    margin: 0;
  }

  html,
  body {
    background: #fff;
  }
}
</style>
