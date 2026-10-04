<script setup lang="ts">
import type { Shipment } from '~/types'

/**
 * A waybill that was not created in this app, tracked straight from the
 * carrier through Biteship. Laid out like the riwayat detail, minus what only
 * an order placed here has (payment, items, label). A resi that turns out to
 * be one of the user's own orders opens that order's riwayat page instead.
 */
const route = useRoute()
const nav = useAppNav()
const toast = useToast()

const resi = computed(() => normalizeResi(String(route.params.resi)))
// Carried over from the search so an external waybill is not re-probed
// against every carrier on every visit.
const courier = computed(() => {
  const value = String(route.query.courier ?? '').toLowerCase()
  return isAllowedCourier(value) ? value : undefined
})

const request = useRequestFetch()

const { data: shipment, status, error, refresh } = useAsyncData(
  () => `shipment-${resi.value}-${courier.value ?? 'auto'}`,
  () => request<Shipment>(`/api/shipments/${resi.value}`, {
    query: courier.value ? { courier: courier.value } : {}
  }),
  { lazy: true }
)

registerPageRefresh(async () => {
  await refresh()
})

// Orders placed here belong to Riwayat, which has their payment and label too.
// Anything else was just recorded in the Lacak history, so that list refetches.
watch(shipment, (now) => {
  if (!now) return
  if (now.orderId) void navigateTo(`/riwayat/${now.orderId}`, { replace: true })
  else void invalidateApiData(['lookups'])
}, { immediate: true })

const loading = computed(() =>
  ((status.value === 'pending' || status.value === 'idle') && !shipment.value) || Boolean(shipment.value?.orderId)
)

const routePoints = computed(() => shipment.value
  ? [
      { label: 'Lokasi Penjemputan', party: shipment.value.origin },
      { label: 'Lokasi Tujuan', party: shipment.value.destination }
    ]
  : [])

const { copy } = useClipboard({ legacy: true })

async function salinResi() {
  if (!shipment.value) return
  try {
    await copy(shipment.value.resi)
    toast.add({ title: 'Nomor resi disalin', icon: 'i-lucide-copy-check' })
  } catch {
    toast.add({ title: 'Gagal menyalin', description: shipment.value.resi, color: 'warning' })
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
          aria-label="Kembali"
          @click="nav.back('/lacak')"
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
            {{ shipment?.resi ?? resi }}
          </h1>
          <p class="text-sm text-white/60">
            {{ shipment?.courier ?? 'Lacak pengiriman' }}
          </p>
        </div>
      </div>
    </AppPageHero>

    <AppPageContent
      v-if="loading"
      class="mt-5 space-y-5 pb-10"
    >
      <USkeleton class="h-28 rounded-3xl" />
      <USkeleton class="h-40 rounded-3xl" />
      <USkeleton class="h-36 rounded-3xl" />
    </AppPageContent>

    <AppPageContent
      v-else-if="error || !shipment"
      class="mt-5 pb-10"
    >
      <AppNotFound
        title="Resi tidak ditemukan"
        :description="apiMessage(error, 'Periksa lagi nomor resinya, atau cari dari daftar paket yang sedang berjalan.')"
        back-label="Kembali ke Lacak Pengiriman"
        back-to="/lacak"
        :retry="refresh"
      />
    </AppPageContent>

    <AppPageContent
      v-else
      class="mt-5 space-y-5 pb-10"
    >
      <!-- Where this data comes from -->
      <div class="flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3">
        <UIcon
          name="i-lucide-info"
          class="mt-0.5 size-4 shrink-0 text-blue-600"
        />
        <p class="text-sm text-blue-800">
          Kiriman ini tidak dibuat lewat aplikasi Sukabumi Logistik, jadi datanya diambil langsung dari kurir. Rincian barang, pembayaran, dan resi cetak hanya ada di <NuxtLink
            to="/riwayat"
            class="font-bold underline"
          >Riwayat</NuxtLink> untuk pesanan yang dibuat di aplikasi.
        </p>
      </div>

      <!-- Status: the same stepper as riwayat -->
      <div
        v-if="shipment.stage !== 'BATAL'"
        class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat"
      >
        <p class="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
          Status Pengiriman
        </p>
        <RiwayatOrderStepper :completed="stepperCompleted(shipment.stage)" />
        <div class="mt-4 rounded-2xl bg-gray-50 px-3 py-2.5">
          <p class="text-sm font-bold text-gray-800">
            {{ shipment.status }}
          </p>
          <p class="text-xs text-gray-500">
            {{ shipment.eta }}
          </p>
        </div>
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
            Pengiriman Tidak Berlanjut
          </p>
          <p class="text-sm text-red-600">
            {{ shipment.status }}
          </p>
        </div>
      </div>

      <!-- The carrier's own history -->
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <div class="mb-4 flex items-center justify-between gap-3">
          <p class="text-xs font-bold uppercase tracking-wider text-gray-400">
            Riwayat Pelacakan
          </p>
          <span
            v-if="shipment.timeline.length"
            class="text-xs font-semibold text-gray-400"
          >
            {{ shipment.timeline.length }} pembaruan
          </span>
        </div>
        <LacakTrackingTimeline
          v-if="shipment.timeline.length"
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
            Belum ada kabar dari kurir. Tarik layar ke bawah untuk memperbarui.
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
            <div class="mt-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm leading-snug">
              <p class="font-semibold text-gray-800">
                {{ point.party.nama }}
              </p>
              <p class="text-gray-600">
                {{ point.party.alamat }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- References -->
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <p class="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
          Nomor Referensi
        </p>
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs font-semibold text-gray-400">
              Resi kurir ({{ courierLabel(shipment.courierCode) }})
            </p>
            <p class="mt-0.5 truncate font-mono text-base font-bold text-gray-800">
              {{ shipment.resi }}
            </p>
          </div>
          <div class="flex shrink-0 gap-2">
            <UButton
              v-ripple.dark
              icon="i-lucide-copy"
              color="primary"
              variant="soft"
              size="lg"
              aria-label="Salin nomor resi"
              @click="salinResi"
            />
            <UButton
              v-if="shipment.link"
              v-ripple.dark
              :to="shipment.link"
              target="_blank"
              rel="noopener"
              icon="i-lucide-external-link"
              color="primary"
              variant="soft"
              size="lg"
              aria-label="Buka di situs kurir"
            />
          </div>
        </div>
      </div>

      <!-- Courier -->
      <div class="relative overflow-hidden rounded-3xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] p-5 shadow-lg shadow-primary/20">
        <div class="absolute top-0 right-0 size-32 -translate-y-1/3 translate-x-1/4 rounded-full bg-white/5" />
        <div class="relative z-10 flex items-center gap-3">
          <AppCourierLogo
            :code="shipment.courierCode"
            class="size-12 rounded-xl text-sm"
          />
          <div class="min-w-0 flex-1">
            <p class="text-sm text-white/60">
              Kurir
            </p>
            <p class="truncate text-base font-bold text-white">
              {{ shipment.courier }}
            </p>
          </div>
        </div>
      </div>

      <button
        v-ripple.dark
        type="button"
        class="w-full rounded-2xl border-2 border-gray-200 bg-white py-3.5 text-base font-bold text-gray-700 hover:border-gray-300 hover:bg-gray-50"
        @click="navigateTo('/lacak')"
      >
        Lacak Resi Lain
      </button>
    </AppPageContent>
  </div>
</template>
