<script setup lang="ts">
import { useBookingStore } from '~/stores/booking'

const booking = useBookingStore()
const nav = useAppNav()

if (!booking.hasCourier) {
  await navigateTo('/kirim/kurir', { replace: true })
}

const typeLabels: Record<string, string> = { regular: 'Reguler', instant: 'Instan', sameday: 'Same Day' }

const typeLabel = computed(() => {
  const type = booking.selectedCourier?.type
  return type ? typeLabels[type] : ''
})
</script>

<template>
  <div>
    <AppPageHero sticky>
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10"
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

    <AppPageContent class="mt-5 space-y-5 pb-32">
      <!-- Kurir Pilihan Kamu -->
      <div class="rounded-3xl bg-white p-4 shadow-card lg:shadow-card-flat">
        <p class="mb-3 text-sm font-bold text-gray-400 uppercase tracking-wider">
          Kurir Pilihan Kamu
        </p>
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-base font-bold text-gray-800">
              {{ booking.selectedCourier?.name }}
            </p>
            <p class="text-sm text-gray-500">
              {{ typeLabel }} • {{ booking.selectedCourier?.eta }}
            </p>
          </div>
          <p class="shrink-0 text-xl font-extrabold text-primary">
            {{ formatRupiah(booking.ongkir) }}
          </p>
        </div>
        <div class="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 text-sm">
          <span class="text-gray-500">{{ booking.pickup.city }} → {{ booking.delivery.city }}</span>
          <span class="text-gray-500">{{ booking.weight }} kg</span>
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
        <dl class="space-y-2.5">
          <div class="flex justify-between">
            <dt class="text-sm text-gray-500">
              Isi Paket
            </dt>
            <dd class="text-sm font-bold text-gray-800">
              {{ booking.content || '-' }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-sm text-gray-500">
              Berat
            </dt>
            <dd class="text-sm font-bold text-gray-800">
              {{ booking.weight }} kg
            </dd>
          </div>
        </dl>
      </div>

      <!-- Data Pengirim + Data Penerima -->
      <div class="grid gap-5 lg:grid-cols-2">
        <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
          <div class="mb-4 flex items-center gap-2">
            <div class="flex size-8 items-center justify-center rounded-xl bg-emerald-50">
              <UIcon
                name="i-lucide-user"
                class="size-4 text-emerald-600"
              />
            </div>
            <h3 class="text-base font-bold text-gray-800">
              Data Pengirim
            </h3>
          </div>
          <dl class="space-y-2.5">
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-sm text-gray-500">
                Nama
              </dt>
              <dd class="truncate text-sm font-bold text-gray-800">
                {{ booking.sender.nama || '-' }}
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-sm text-gray-500">
                Telepon
              </dt>
              <dd class="truncate text-sm font-bold text-gray-800">
                {{ booking.sender.telp || '-' }}
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-sm text-gray-500">
                Alamat
              </dt>
              <dd class="truncate text-sm font-bold text-gray-800">
                {{ booking.sender.alamat || '-' }}
              </dd>
            </div>
          </dl>
        </div>

        <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
          <div class="mb-4 flex items-center gap-2">
            <div class="flex size-8 items-center justify-center rounded-xl bg-amber-50">
              <UIcon
                name="i-lucide-user"
                class="size-4 text-amber-600"
              />
            </div>
            <h3 class="text-base font-bold text-gray-800">
              Data Penerima
            </h3>
          </div>
          <dl class="space-y-2.5">
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-sm text-gray-500">
                Nama
              </dt>
              <dd class="truncate text-sm font-bold text-gray-800">
                {{ booking.receiver.nama || '-' }}
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-sm text-gray-500">
                Telepon
              </dt>
              <dd class="truncate text-sm font-bold text-gray-800">
                {{ booking.receiver.telp || '-' }}
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt class="shrink-0 text-sm text-gray-500">
                Alamat
              </dt>
              <dd class="truncate text-sm font-bold text-gray-800">
                {{ booking.receiver.alamat || '-' }}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Asuransi Pengiriman -->
      <div class="flex items-center justify-between rounded-3xl bg-white p-4 shadow-card lg:shadow-card-flat">
        <div class="flex items-center gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
            <UIcon
              name="i-lucide-shield"
              class="text-emerald-600"
            />
          </div>
          <div>
            <p class="text-sm font-bold text-gray-800">
              Asuransi Pengiriman
            </p>
            <p class="text-sm text-gray-500">
              + Rp 2.000
            </p>
          </div>
        </div>
        <USwitch v-model="booking.insurance" />
      </div>

      <div class="flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 p-3">
        <UIcon
          name="i-lucide-triangle-alert"
          class="shrink-0 text-amber-600"
        />
        <p class="text-sm text-amber-800">
          Untuk barang yang harganya lebih dari 10 kali ongkos kirim, disarankan untuk diasuransikan.
        </p>
      </div>

      <!-- Total Pembayaran -->
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <dl class="space-y-2.5">
          <div class="flex justify-between">
            <dt class="text-sm text-gray-500">
              Biaya Ongkir
            </dt>
            <dd class="text-sm font-bold text-gray-800">
              {{ formatRupiah(booking.ongkir) }}
            </dd>
          </div>
          <div class="flex justify-between">
            <dt class="text-sm text-gray-500">
              Asuransi
            </dt>
            <dd class="text-sm font-bold text-gray-800">
              {{ formatRupiah(booking.asuransi) }}
            </dd>
          </div>
          <USeparator />
          <div class="flex justify-between">
            <dt class="text-base font-bold text-gray-800">
              Total Pembayaran
            </dt>
            <dd class="text-xl font-extrabold text-primary">
              {{ formatRupiah(booking.total) }}
            </dd>
          </div>
        </dl>
      </div>

      <div class="flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50 p-3">
        <UIcon
          name="i-lucide-info"
          class="shrink-0 text-blue-600"
        />
        <p class="text-sm text-blue-800">
          Cashback yang akan kamu dapat sebesar <span class="font-bold">Rp 1.745</span> setelah kamu selesai melakukan transaksi ini.
        </p>
      </div>

      <div class="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-3">
        <UIcon
          name="i-lucide-triangle-alert"
          class="shrink-0 text-red-500"
        />
        <p class="text-sm text-red-700">
          Bila member terbukti secara sengaja <span class="font-bold">memanipulasi berat</span>, akun kamu akan dinonaktifkan secara permanen.
        </p>
      </div>
    </AppPageContent>

    <AppStickyBar>
      <button
        type="button"
        class="relative flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] py-4 text-lg font-bold text-white shadow-lg shadow-primary/20"
      >
        <span
          v-ripple
          class="absolute inset-0 rounded-2xl"
        />
        <span class="relative z-10 pointer-events-none">Lanjutkan Bayar</span>
      </button>
    </AppStickyBar>
  </div>
</template>
