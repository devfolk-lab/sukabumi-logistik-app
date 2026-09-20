<script setup lang="ts">
import type { Order } from '~/types'
import { useBookingStore } from '~/stores/booking'

const booking = useBookingStore()
const nav = useAppNav()
const toast = useToast()

if (!booking.hasCourier || !booking.hasRoute) {
  await navigateTo('/kirim/kurir', { replace: true })
}

const courier = computed(() => booking.selectedCourier)

const pending = ref(false)

// Creating an order calls RajaOngkir/Komship and books a real shipment at the
// quoted tariff, so it is never queued — it waits for a live connection.
const online = useOnline()

async function checkout() {
  if (pending.value) return

  if (!online.value) {
    toast.add({
      title: 'Butuh koneksi internet',
      description: 'Pembuatan pesanan memerlukan koneksi aktif.',
      color: 'warning'
    })
    return
  }

  if (!booking.hasParties) {
    toast.add({
      title: 'Data belum lengkap',
      description: 'Lengkapi nama, nomor telepon, dan alamat pengirim serta penerima dulu.',
      color: 'warning'
    })
    return
  }

  pending.value = true

  try {
    const order = await $fetch<Order>('/api/orders', {
      method: 'POST',
      body: {
        sender: booking.sender,
        receiver: booking.receiver,
        originId: booking.origin!.id,
        originLabel: booking.origin!.label,
        destinationId: booking.destination!.id,
        destinationLabel: booking.destination!.label,
        courierId: booking.selectedCourier!.id,
        weightGram: booking.weightGram,
        content: booking.content
      }
    })

    const paid = await $fetch<Order>(`/api/orders/${order.id}/pay`, { method: 'POST' })

    booking.reset()
    await invalidateApiData(['orders', 'shipments', 'stats'])

    toast.add({
      title: 'Pesanan dibuat',
      description: `Nomor pesanan ${paid.resi}.`
    })

    await navigateTo(`/riwayat/${order.id}`)
  } catch (error) {
    toast.add({
      title: 'Gagal membuat pesanan',
      description: apiMessage(error, 'Coba lagi sebentar.'),
      color: 'error'
    })
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
          @click="nav.back('/kirim/kurir')"
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
        <div>
          <h1 class="text-xl font-bold text-white">
            Detail Pesanan
          </h1>
          <p class="text-sm text-white/60">
            Lengkapi data sebelum bayar
          </p>
        </div>
      </div>
    </AppPageHero>

    <AppPageContent
      v-if="courier && booking.origin && booking.destination"
      class="mt-5 space-y-5 pb-32"
    >
      <!-- Kurir Pilihan Kamu: carrier, quote, and the full route -->
      <div class="overflow-hidden rounded-3xl bg-white shadow-card lg:shadow-card-flat">
        <div class="p-5">
          <p class="mb-3 text-sm font-bold text-gray-400 uppercase tracking-wider">
            Kurir Pilihan Kamu
          </p>
          <div class="flex items-center gap-3">
            <AppCourierLogo
              :code="courier.code"
              :brand="courier.brand"
              class="size-14 rounded-2xl text-sm shadow-md"
            />
            <div class="min-w-0 flex-1">
              <p class="truncate text-base font-bold text-gray-800">
                {{ courier.name }}
              </p>
              <p class="truncate text-sm text-gray-500">
                {{ courier.description }}
                <span class="font-mono text-xs text-gray-400">· {{ courier.service }}</span>
              </p>
              <p class="mt-0.5 flex items-center gap-1 text-sm font-semibold text-gray-600">
                <UIcon
                  name="i-lucide-clock"
                  class="size-3.5"
                />
                {{ formatEtd(courier.etd) }}
              </p>
            </div>
            <p class="shrink-0 text-xl font-extrabold text-primary">
              {{ formatRupiah(booking.ongkir) }}
            </p>
          </div>
        </div>

        <div class="border-t border-gray-100 bg-gray-50/70 p-5">
          <div class="mb-4 flex items-center justify-between gap-3">
            <p class="text-sm font-bold text-gray-400 uppercase tracking-wider">
              Rute
            </p>
            <span class="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-sm font-extrabold text-white shadow-md shadow-primary/25">
              <UIcon
                name="i-lucide-weight"
                class="size-4"
              />
              {{ booking.weight }} kg
            </span>
          </div>

          <div class="grid grid-cols-[28px_1fr] gap-x-3">
            <div class="flex flex-col items-center">
              <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <div class="size-2.5 rounded-full bg-emerald-500" />
              </div>
              <div class="route-dash my-1.5 w-0.5 flex-1" />
            </div>
            <div class="min-w-0 pb-4">
              <p class="text-xs font-semibold text-gray-400">
                Dijemput dari
              </p>
              <p class="mt-0.5 text-base font-bold text-gray-800">
                {{ destinationTitle(booking.origin) }}
              </p>
              <p class="text-sm text-gray-500">
                {{ destinationSubtitle(booking.origin) }}
              </p>
              <p
                v-if="booking.sender.alamat"
                class="mt-1.5 rounded-lg bg-white px-2.5 py-1.5 text-sm leading-snug text-gray-700 ring-1 ring-gray-100"
              >
                {{ booking.sender.alamat }}
              </p>
            </div>

            <div class="flex flex-col items-center">
              <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-50">
                <UIcon
                  name="i-lucide-map-pin"
                  class="size-4 text-primary"
                />
              </div>
            </div>
            <div class="min-w-0">
              <p class="text-xs font-semibold text-gray-400">
                Dikirim ke
              </p>
              <p class="mt-0.5 text-base font-bold text-gray-800">
                {{ destinationTitle(booking.destination) }}
              </p>
              <p class="text-sm text-gray-500">
                {{ destinationSubtitle(booking.destination) }}
              </p>
              <p
                v-if="booking.receiver.alamat"
                class="mt-1.5 rounded-lg bg-white px-2.5 py-1.5 text-sm leading-snug text-gray-700 ring-1 ring-gray-100"
              >
                {{ booking.receiver.alamat }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Rincian Paket -->
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <div class="mb-4 flex items-center gap-2">
          <div class="flex size-8 items-center justify-center rounded-xl bg-primary-50">
            <UIcon
              name="i-lucide-package"
              class="size-4 text-primary"
            />
          </div>
          <h3 class="text-base font-bold text-gray-800">
            Rincian Paket
          </h3>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="relative col-span-2 overflow-hidden rounded-2xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] p-4 text-white sm:col-span-1">
            <div class="absolute -top-6 -right-6 size-24 rounded-full bg-white/5" />
            <p class="flex items-center gap-1.5 text-xs font-semibold text-white/60">
              <UIcon
                name="i-lucide-weight"
                class="size-3.5"
              />
              Berat paket
            </p>
            <p class="mt-1 text-3xl font-extrabold tabular-nums">
              {{ booking.weight }} <span class="text-lg font-bold text-white/70">kg</span>
            </p>
            <p class="mt-1 text-xs text-white/60">
              Ongkir dihitung dari berat ini
            </p>
          </div>
          <div class="col-span-2 rounded-2xl bg-gray-50 p-4 sm:col-span-1">
            <p class="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
              <UIcon
                name="i-lucide-box"
                class="size-3.5"
              />
              Isi paket
            </p>
            <p
              class="mt-1 text-base font-bold leading-snug"
              :class="booking.content ? 'text-gray-800' : 'text-gray-400'"
            >
              {{ booking.content || 'Belum diisi' }}
            </p>
          </div>
          <div class="rounded-2xl bg-gray-50 p-4">
            <p class="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
              <UIcon
                name="i-lucide-truck"
                class="size-3.5"
              />
              Layanan
            </p>
            <p class="mt-1 truncate text-base font-bold text-gray-800">
              {{ courier.service }}
            </p>
          </div>
          <div class="rounded-2xl bg-gray-50 p-4">
            <p class="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
              <UIcon
                name="i-lucide-calendar-clock"
                class="size-3.5"
              />
              Estimasi tiba
            </p>
            <p class="mt-1 truncate text-base font-bold text-gray-800">
              {{ formatEtd(courier.etd) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Detail Pengirim + Detail Penerima: the last thing to fill in, once
           the price is known. -->
      <KirimPartyDetailsSection
        v-model="booking.sender"
        title="Detail Pengirim"
        :subtitle="destinationTitle(booking.origin)"
        :location="destinationTitle(booking.origin)"
        icon="i-lucide-user"
        default-open
      />
      <KirimPartyDetailsSection
        v-model="booking.receiver"
        title="Detail Penerima"
        :subtitle="destinationTitle(booking.destination)"
        :location="destinationTitle(booking.destination)"
        icon="i-lucide-user-check"
        default-open
      />

      <div class="flex items-start gap-3 rounded-2xl border-2 border-red-200 bg-red-50 p-4">
        <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white">
          <UIcon
            name="i-lucide-triangle-alert"
            class="size-5"
          />
        </div>
        <div>
          <p class="text-sm font-bold text-red-700">
            Pastikan berat sesuai
          </p>
          <p class="mt-0.5 text-sm text-red-700/80">
            Bila member terbukti secara sengaja memanipulasi berat, akun kamu akan dinonaktifkan secara permanen.
          </p>
        </div>
      </div>

      <!-- Total Pembayaran -->
      <div class="relative overflow-hidden rounded-3xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] p-5 text-white shadow-lg shadow-primary/20">
        <div class="absolute top-0 right-0 size-40 -translate-y-1/2 translate-x-1/3 rounded-full bg-white/5" />
        <div class="absolute bottom-0 left-0 size-24 translate-y-1/2 -translate-x-1/3 rounded-full bg-secondary/10" />
        <dl class="relative z-10">
          <div class="flex items-center justify-between text-sm">
            <dt class="text-white/70">
              Ongkir {{ courier.name }} {{ courier.service }}
            </dt>
            <dd class="font-semibold tabular-nums">
              {{ formatRupiah(booking.ongkir) }}
            </dd>
          </div>
          <div class="my-4 border-t border-dashed border-white/20" />
          <div class="flex items-end justify-between gap-3">
            <div>
              <dt class="text-sm font-semibold text-white/70">
                Total Pembayaran
              </dt>
              <dd class="mt-0.5 text-3xl font-extrabold tabular-nums">
                {{ formatRupiah(booking.total) }}
              </dd>
            </div>
            <span class="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              Tarif resmi kurir
            </span>
          </div>
        </dl>
      </div>
    </AppPageContent>

    <AppStickyBar>
      <button
        type="button"
        class="relative flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] py-4 text-lg font-bold text-white shadow-lg shadow-primary/20 disabled:opacity-60"
        :disabled="pending || !online"
        :title="!online ? 'Butuh koneksi internet' : undefined"
        @click="checkout"
      >
        <span
          v-ripple
          class="absolute inset-0 rounded-2xl"
        />
        <span class="relative z-10 pointer-events-none">
          {{ !online ? 'Butuh koneksi internet' : pending ? 'Memproses...' : `Bayar ${formatRupiah(booking.total)}` }}
        </span>
      </button>
    </AppStickyBar>
  </div>
</template>
