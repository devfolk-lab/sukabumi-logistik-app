<script setup lang="ts">
const { data: profile } = await useProfile()
const { data: shipments, status } = await useActiveShipments()

const salam = computed(() => {
  const jam = new Date().getHours()
  if (jam < 11) return 'Selamat Pagi,'
  if (jam < 15) return 'Selamat Siang,'
  if (jam < 19) return 'Selamat Sore,'
  return 'Selamat Malam,'
})
</script>

<template>
  <div>
    <AppPageHero>
      <div class="flex items-start justify-between">
        <div>
          <p class="text-sm font-medium text-white/70">
            {{ salam }}
          </p>
          <h1 class="mt-0.5 flex items-center gap-1.5 text-2xl font-bold text-white">
            {{ profile?.nama ?? '...' }}
            <UIcon
              name="i-lucide-hand"
              class="size-5"
            />
          </h1>
        </div>
        <button
          type="button"
          class="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10"
          aria-label="Notifikasi"
        >
          <span
            v-ripple
            class="absolute inset-0 rounded-2xl"
          />
          <UIcon
            name="i-lucide-bell"
            class="relative z-10 size-5 text-white pointer-events-none"
          />
          <span
            v-if="shipments.length"
            class="pointer-events-none absolute -top-1.5 -right-1.5 z-20 flex size-6 items-center justify-center rounded-full border-2 border-[#002144] bg-red-500 text-sm font-bold text-white"
          >{{ shipments.length }}</span>
        </button>
      </div>
    </AppPageHero>

    <AppPageContent class="-mt-4 relative z-20">
      <HomeSearch />
    </AppPageContent>

    <AppPageContent class="mt-6">
      <HomeQuickActions />
    </AppPageContent>

    <AppPageContent class="mt-6">
      <HomePartnerCarriers />
    </AppPageContent>

    <AppPageContent class="mt-6 mb-6">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-base font-bold text-gray-800">
          Pengiriman Aktif
        </h2>
        <NuxtLink
          v-ripple.dark
          to="/lacak"
          class="rounded-lg px-2 py-1 text-sm font-semibold text-primary"
        >
          Lihat Semua
        </NuxtLink>
      </div>
      <div
        v-if="status === 'pending'"
        class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5"
      >
        <USkeleton
          v-for="n in 2"
          :key="n"
          class="h-24 rounded-3xl"
        />
      </div>
      <div
        v-else-if="shipments.length"
        class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5"
      >
        <NuxtLink
          v-for="shipment in shipments"
          :key="shipment.resi"
          :to="`/lacak/${shipment.resi}`"
        >
          <HomeActiveShipmentCard :shipment="shipment" />
        </NuxtLink>
      </div>
      <div
        v-else
        class="rounded-3xl bg-white p-6 text-center shadow-card lg:shadow-card-flat"
      >
        <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary-50">
          <UIcon
            name="i-lucide-package"
            class="size-6 text-primary"
          />
        </div>
        <p class="mt-3 text-base font-bold text-gray-800">
          Belum ada pengiriman aktif
        </p>
        <p class="mt-1 text-sm text-gray-500">
          Kirim paket pertamamu, statusnya akan tampil di sini.
        </p>
        <UButton
          to="/kirim"
          size="lg"
          class="mt-4 font-bold"
        >
          Kirim Paket
        </UButton>
      </div>
    </AppPageContent>
  </div>
</template>
