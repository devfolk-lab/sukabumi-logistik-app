<script setup lang="ts">
import type { Order, Shipment } from '~/types'
import { useBookingStore } from '~/stores/booking'

const route = useRoute()
const nav = useAppNav()
const toast = useToast()

const id = computed(() => String(route.params.id))

const request = useRequestFetch()

const { data, status, error, refresh } = useAsyncData(
  () => `order-${id.value}`,
  () => request<{ order: Order, shipment: Shipment }>(`/api/orders/${id.value}`),
  { lazy: true }
)

// This page's data is `order-<id>`, not a `useApi` key, so it refreshes itself
// and then syncs the lists the same change would affect.
registerPageRefresh(async () => {
  await refresh()
  await invalidateApiData(['orders', 'shipments', 'stats'])
})

// Only the first load shows skeletons; a refresh keeps the page on screen.
const loading = computed(() => (status.value === 'pending' || status.value === 'idle') && !data.value)
const order = computed(() => data.value?.order)
const shipment = computed(() => data.value?.shipment)

const routePoints = computed(() => order.value
  ? [
      { label: 'Lokasi Penjemputan', area: order.value.origin, party: order.value.sender },
      { label: 'Lokasi Tujuan', area: order.value.destination, party: order.value.receiver }
    ]
  : [])

const belumBayar = computed(() => order.value?.stage === 'MENUNGGU_PEMBAYARAN')

/** Why the tracking card has no carrier history to show. */
const alasanTanpaRiwayat = computed(() => {
  if (belumBayar.value) return 'Riwayat pelacakan muncul setelah pembayaran diverifikasi admin dan paket diserahkan ke kurir.'
  if (order.value?.stage === 'BATAL') return 'Pesanan dibatalkan sebelum ada kabar dari kurir.'
  return 'Belum ada kabar dari kurir. Tarik layar ke bawah untuk memperbarui.'
})
/**
 * Why the label cannot be printed yet, or `''` when it can. A label only makes
 * sense once the carrier has issued a waybill, so the button stays visible
 * but disabled until then, with the reason under it.
 */
const alasanTidakCetak = computed(() => {
  if (!order.value) return ''
  if (order.value.stage === 'BATAL') return 'Pesanan dibatalkan, resi tidak bisa dicetak.'
  if (order.value.stage === 'MENUNGGU_PEMBAYARAN') return 'Resi bisa dicetak setelah pembayaran dikonfirmasi.'
  if (!order.value.awb) return 'Menunggu nomor resi dari kurir.'
  return ''
})
const bisaCetak = computed(() => Boolean(order.value) && !alasanTidakCetak.value)

const printer = useTemplateRef('printer')
const mengunduh = ref(false)

/** Opens the print dialog for the label, right here — no navigation. */
async function cetakResi() {
  if (!printer.value || !bisaCetak.value) return
  try {
    await printer.value.print()
  } catch (err) {
    console.error(err)
    toast.add({ title: 'Gagal mencetak resi', description: 'Coba lagi sebentar.', color: 'error' })
  }
}

/** Saves the label as a PDF without leaving this page. */
async function unduhResi() {
  if (!printer.value || !bisaCetak.value || mengunduh.value) return
  mengunduh.value = true
  try {
    await printer.value.download()
  } catch (err) {
    console.error(err)
    toast.add({ title: 'Gagal mengunduh resi', description: 'Coba lagi sebentar.', color: 'error' })
  } finally {
    mengunduh.value = false
  }
}

const booking = useBookingStore()

/** Starts a fresh booking over the same pickup and delivery addresses. */
async function kirimLagi() {
  if (!order.value) return
  booking.repeatOrder(order.value)
  await navigateTo('/kirim')
}
const bisaDibatalkan = computed(() =>
  order.value?.stage === 'MENUNGGU_PEMBAYARAN' || order.value?.stage === 'DIPROSES' || order.value?.stage === 'DIJEMPUT'
)

// The four-step stepper predates the six persisted stages; map onto it.
const stepsCompleted = computed(() => {
  switch (order.value?.stage) {
    case 'MENUNGGU_PEMBAYARAN': return 1
    case 'DIPROSES': return 2
    case 'DIJEMPUT': return 3
    case 'DALAM_PERJALANAN': return 3
    default: return 4
  }
})

const pending = ref(false)

// Both of these move real order state, so neither is ever queued offline.
const online = useOnline()

function requireConnection(): boolean {
  if (online.value) return true
  toast.add({
    title: 'Butuh koneksi internet',
    description: 'Tindakan ini memerlukan koneksi aktif.',
    color: 'warning'
  })
  return false
}

const showPayment = ref(false)

/**
 * Opens the payment steps. Their Order ID is the order's Biteship draft;
 * orders made before drafts existed get one here first.
 */
async function openPayment() {
  if (!order.value) return
  if (order.value.draftId) {
    showPayment.value = true
    return
  }
  if (!requireConnection()) return
  pending.value = true
  try {
    await $fetch(`/api/orders/${id.value}/draft`, { method: 'POST' })
    await refresh()
    showPayment.value = true
  } catch (error) {
    toast.add({ title: 'Gagal menyiapkan pembayaran', description: apiMessage(error, 'Coba lagi sebentar.'), color: 'error' })
  } finally {
    pending.value = false
  }
}

// The admin confirms the transfer outside the app, so an unpaid order keeps
// asking while it is on screen; the server checks Biteship on each read.
const visibility = useDocumentVisibility()
useIntervalFn(() => {
  if (belumBayar.value && online.value && visibility.value === 'visible' && status.value !== 'pending') {
    void refresh()
  }
}, 20_000)

watch(() => order.value?.stage, (now, before) => {
  if (before !== 'MENUNGGU_PEMBAYARAN' || !now || now === before) return
  showPayment.value = false
  // A change this page made itself (cancelling) has already been announced.
  if (pending.value) return
  void invalidateApiData(['orders', 'shipments', 'stats'])
  if (now === 'BATAL') {
    toast.add({ title: 'Pesanan dibatalkan', color: 'warning' })
  } else {
    toast.add({
      title: 'Pembayaran terkonfirmasi',
      description: 'Pesananmu diproses dan kurir segera dijadwalkan.',
      color: 'success',
      icon: 'i-lucide-circle-check'
    })
  }
})

async function cancel() {
  if (!requireConnection()) return
  pending.value = true
  try {
    await $fetch(`/api/orders/${id.value}/cancel`, { method: 'POST' })
    await refresh()
    await invalidateApiData(['orders', 'shipments', 'stats'])
    toast.add({ title: 'Pesanan dibatalkan' })
  } catch (error) {
    toast.add({ title: 'Gagal membatalkan pesanan', description: apiMessage(error, 'Coba lagi sebentar.'), color: 'error' })
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <div>
    <AppPageHero sticky>
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
          @click="nav.back('/riwayat')"
        >
          <span
            v-ripple
            class="absolute inset-0 rounded-xl"
          />
          <UIcon
            name="i-lucide-arrow-left"
            class="relative z-10 size-5 text-white pointer-events-none"
          />
        </button>
        <div class="min-w-0">
          <h1 class="truncate text-lg font-bold text-white">
            {{ order?.resi ?? 'Detail Pesanan' }}
          </h1>
          <p class="text-sm text-white/60">
            {{ order?.date ?? 'Riwayat pengiriman' }}
          </p>
        </div>
      </div>
    </AppPageHero>

    <AppPageContent
      v-if="loading"
      class="mt-5 space-y-5 pb-32"
    >
      <USkeleton class="h-28 rounded-3xl" />
      <USkeleton class="h-40 rounded-3xl" />
      <USkeleton class="h-36 rounded-3xl" />
    </AppPageContent>

    <AppPageContent
      v-else-if="error || !order || !shipment"
      class="mt-5 pb-10"
    >
      <AppNotFound
        title="Pesanan tidak ditemukan"
        :description="apiMessage(error, 'Pesanan ini mungkin sudah dihapus atau bukan milik akunmu.')"
        back-label="Kembali ke Riwayat"
        back-to="/riwayat"
        :retry="refresh"
      />
    </AppPageContent>

    <AppPageContent
      v-else
      class="mt-5 space-y-5 pb-64"
    >
      <div
        v-if="order.status !== 'batal'"
        class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat"
      >
        <p class="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
          Status Pesanan
        </p>
        <RiwayatOrderStepper :completed="stepsCompleted" />
      </div>
      <div
        v-else
        class="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4"
      >
        <UIcon
          name="i-lucide-x"
          class="size-5 shrink-0 text-red-500"
        />
        <div>
          <p class="text-base font-bold text-red-700">
            Pesanan Dibatalkan
          </p>
          <p class="text-sm text-red-600">
            Dibatalkan sebelum dijemput kurir.
          </p>
        </div>
      </div>

      <!-- Payment: waiting for the transfer to be verified, or confirmed -->
      <div
        v-if="belumBayar"
        class="rounded-3xl border border-amber-100 bg-amber-50 p-5"
      >
        <div class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
            <UIcon
              name="i-lucide-wallet"
              class="size-5 text-amber-600"
            />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-base font-bold text-amber-800">
              Menunggu pembayaran
            </p>
            <p class="mt-0.5 text-sm text-amber-700">
              Transfer {{ formatRupiah(order.price) }}, lalu konfirmasi lewat WhatsApp. Ketuk <span class="font-bold">Bayar</span> untuk langkah-langkahnya. Status berubah sendiri setelah admin memverifikasi.
            </p>
          </div>
        </div>
      </div>
      <div
        v-else-if="order.paidAt"
        class="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4"
      >
        <UIcon
          name="i-lucide-badge-check"
          class="size-5 shrink-0 text-emerald-600"
        />
        <div class="min-w-0">
          <p class="text-base font-bold text-emerald-800">
            Pembayaran terkonfirmasi
          </p>
          <p class="text-sm text-emerald-700">
            {{ order.paidAt }}
          </p>
        </div>
      </div>

      <!-- The carrier's own history, synced from Biteship on every load -->
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <div class="mb-4 flex items-center justify-between gap-3">
          <p class="text-xs font-bold uppercase tracking-wider text-gray-400">
            Riwayat Pelacakan
          </p>
          <span
            v-if="shipment.tracked"
            class="text-xs font-semibold text-gray-400"
          >
            {{ shipment.timeline.length }} pembaruan
          </span>
        </div>
        <LacakTrackingTimeline
          v-if="shipment.tracked"
          :steps="shipment.timeline"
        />
        <div
          v-else
          class="flex items-start gap-3 rounded-2xl bg-gray-50 p-3"
        >
          <UIcon
            name="i-lucide-radar"
            class="mt-0.5 size-5 shrink-0 text-gray-400"
          />
          <p class="text-sm text-gray-500">
            {{ alasanTanpaRiwayat }}
          </p>
        </div>
      </div>

      <!-- Route -->
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <p class="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
          Rute Pengiriman
        </p>
        <div class="grid grid-cols-[28px_1fr] gap-x-3">
          <div class="row-span-2 flex flex-col items-center">
            <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
              <div class="size-2.5 rounded-full bg-emerald-500" />
            </div>
            <div class="route-dash my-1.5 w-0.5 flex-1" />
            <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-50">
              <UIcon
                name="i-lucide-map-pin"
                class="size-4 text-primary"
              />
            </div>
          </div>
          <div
            v-for="(point, index) in routePoints"
            :key="point.label"
            class="min-w-0"
            :class="index === 0 ? 'pb-4' : ''"
          >
            <p class="text-xs font-bold text-gray-400 uppercase">
              {{ point.label }}
            </p>
            <p class="mt-1 text-base font-semibold text-gray-800">
              {{ areaTitle(point.area) }}
            </p>
            <p class="text-sm text-gray-500">
              {{ areaSubtitle(point.area) }}
            </p>
            <div class="mt-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm leading-snug">
              <p class="font-semibold text-gray-800">
                {{ point.party.nama }} <span class="font-normal text-gray-500">· {{ point.party.telp }}</span>
              </p>
              <p class="text-gray-600">
                {{ point.party.alamat }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Package Details -->
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <p class="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
          Rincian Paket
        </p>
        <AppPackageItems :items="order.items" />
      </div>

      <!-- References: the carrier's numbers first, ours last -->
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <p class="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
          Nomor Referensi
        </p>
        <dl class="divide-y divide-gray-100">
          <div class="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
            <div class="min-w-0">
              <dt class="text-xs font-semibold text-gray-400">
                Resi kurir ({{ courierLabel(order.courierCode) }})
              </dt>
              <dd
                class="mt-0.5 truncate font-mono text-base font-bold"
                :class="order.awb ? 'text-gray-800' : 'text-gray-400'"
              >
                {{ order.awb ?? 'Menunggu dari kurir' }}
              </dd>
            </div>
            <div
              v-if="order.awb"
              class="flex shrink-0 gap-2"
            >
              <UButton
                v-if="bisaCetak"
                icon="i-lucide-printer"
                color="primary"
                variant="soft"
                size="lg"
                class="font-bold"
                aria-label="Cetak resi"
                @click="cetakResi"
              />
              <UButton
                v-if="bisaCetak"
                icon="i-lucide-download"
                color="primary"
                variant="soft"
                size="lg"
                class="font-bold"
                aria-label="Unduh resi (PDF)"
                :loading="mengunduh"
                @click="unduhResi"
              />
              <UButton
                :to="{ path: `/lacak/${order.awb}`, query: { courier: order.courierCode } }"
                color="primary"
                variant="soft"
                size="lg"
                class="font-bold"
              >
                Lacak
              </UButton>
            </div>
          </div>
          <div
            v-if="order.draftId"
            class="py-2.5"
          >
            <dt class="text-xs font-semibold text-gray-400">
              Order ID
            </dt>
            <dd class="mt-0.5 truncate font-mono text-base font-bold text-gray-800">
              {{ order.draftId }}
            </dd>
          </div>
          <div
            v-if="order.biteshipOrderId"
            class="py-2.5"
          >
            <dt class="text-xs font-semibold text-gray-400">
              No. order Biteship
            </dt>
            <dd class="mt-0.5 truncate font-mono text-base font-bold text-gray-800">
              {{ order.biteshipOrderId }}
            </dd>
          </div>
          <div class="py-2.5 last:pb-0">
            <dt class="text-xs font-semibold text-gray-400">
              No. pesanan internal
            </dt>
            <dd class="mt-0.5 font-mono text-sm font-semibold text-gray-500">
              {{ order.orderNo }}
            </dd>
          </div>
        </dl>
      </div>

      <!-- Courier + Price -->
      <div class="relative overflow-hidden rounded-3xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] p-5 shadow-lg shadow-primary/20">
        <div class="absolute top-0 right-0 size-32 -translate-y-1/3 translate-x-1/4 rounded-full bg-white/5" />
        <div class="relative z-10 flex items-center justify-between gap-3">
          <AppCourierLogo
            :code="order.courierCode"
            class="size-12 rounded-xl text-sm"
          />
          <div class="min-w-0 flex-1">
            <p class="text-sm text-white/60">
              Kurir
            </p>
            <p class="truncate text-base font-bold text-white">
              {{ order.courier }}
            </p>
          </div>
          <p class="ml-2 shrink-0 text-xl font-extrabold text-white">
            {{ formatRupiah(order.price) }}
          </p>
        </div>
      </div>

      <ResiPrinter
        v-if="bisaCetak"
        ref="printer"
        :order="order"
      />

      <RiwayatPaymentSteps
        v-model:open="showPayment"
        :order="order"
      />
    </AppPageContent>

    <AppStickyBar v-if="order && !loading">
      <div class="w-full space-y-2">
        <button
          v-if="belumBayar"
          type="button"
          class="relative flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] py-4 text-lg font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-60"
          :disabled="pending || !online"
          :title="!online ? 'Butuh koneksi internet' : undefined"
          @click="openPayment"
        >
          <span
            v-ripple
            class="absolute inset-0 rounded-2xl"
          />
          <UIcon
            name="i-lucide-wallet"
            class="relative z-10 size-5 pointer-events-none"
          />
          <span class="relative z-10 pointer-events-none">
            {{ !online ? 'Butuh koneksi internet' : pending ? 'Memproses...' : `Bayar ${formatRupiah(order.price)}` }}
          </span>
        </button>
        <!-- None of these touch the server, so they stay usable offline. -->
        <div class="flex gap-2">
          <button
            type="button"
            class="relative flex flex-1 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-2xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
            :disabled="!bisaCetak"
            :title="alasanTidakCetak || undefined"
            @click="cetakResi"
          >
            <span
              v-if="bisaCetak"
              v-ripple
              class="absolute inset-0 rounded-2xl"
            />
            <UIcon
              name="i-lucide-printer"
              class="relative z-10 size-4.5 shrink-0 pointer-events-none"
            />
            <span class="relative z-10 pointer-events-none">Cetak Resi</span>
          </button>
          <button
            type="button"
            class="relative flex flex-1 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-2xl border-2 border-primary/20 bg-white py-2.5 text-sm font-bold text-primary hover:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="!bisaCetak || mengunduh"
            :title="alasanTidakCetak || 'Unduh resi sebagai PDF'"
            @click="unduhResi"
          >
            <span
              v-if="bisaCetak"
              v-ripple.dark
              class="absolute inset-0 rounded-2xl"
            />
            <UIcon
              :name="mengunduh ? 'i-lucide-loader-circle' : 'i-lucide-download'"
              class="relative z-10 size-4.5 shrink-0 pointer-events-none"
              :class="{ 'animate-spin': mengunduh }"
            />
            <span class="relative z-10 pointer-events-none">Unduh Resi</span>
          </button>
          <button
            v-ripple.dark
            type="button"
            class="flex flex-1 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-2xl border-2 border-primary/20 bg-white py-2.5 text-sm font-bold text-primary hover:border-primary/40"
            title="Kirim paket baru dengan alamat pengirim dan penerima yang sama"
            @click="kirimLagi"
          >
            <UIcon
              name="i-lucide-repeat"
              class="size-4.5 shrink-0 pointer-events-none"
            />
            <span class="pointer-events-none">Kirim Lagi</span>
          </button>
        </div>
        <p
          v-if="alasanTidakCetak"
          class="flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-gray-500"
        >
          <UIcon
            name="i-lucide-info"
            class="size-3.5 shrink-0"
          />
          {{ alasanTidakCetak }}
        </p>
        <button
          v-if="bisaDibatalkan"
          v-ripple.dark
          type="button"
          class="w-full rounded-2xl border-2 border-red-100 bg-white py-3 text-base font-bold text-red-500 disabled:opacity-60"
          :disabled="pending || !online"
          :title="!online ? 'Butuh koneksi internet' : undefined"
          @click="cancel"
        >
          {{ online ? 'Batalkan Pesanan' : 'Butuh koneksi internet' }}
        </button>
      </div>
    </AppStickyBar>
  </div>
</template>
