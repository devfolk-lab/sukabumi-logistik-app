<script setup lang="ts">
import { useBookingStore } from '~/stores/booking'

const booking = useBookingStore()
const nav = useAppNav()
</script>

<template>
  <div>
    <AppPageHero sticky>
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10"
          @click="nav.back('/')"
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
            Kirim Paket
          </h1>
          <p class="text-sm text-white/60">
            Sukabumi Logistik
          </p>
        </div>
      </div>
    </AppPageHero>

    <AppPageContent class="mt-5 space-y-5 pb-32">
      <KirimPartyDetailsSection
        v-model="booking.sender"
        title="Detail Pengirim"
        icon="i-lucide-user"
      />
      <KirimPartyDetailsSection
        v-model="booking.receiver"
        title="Detail Penerima"
        icon="i-lucide-user"
      />
      <KirimPackageForm />
      <KirimInstantToggle />
    </AppPageContent>

    <AppStickyBar>
      <button
        type="button"
        class="relative flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] py-4 text-lg font-bold text-white shadow-lg shadow-primary/20"
        @click="navigateTo('/kirim/kurir')"
      >
        <span
          v-ripple
          class="absolute inset-0 rounded-2xl"
        />
        <span class="relative z-10 pointer-events-none">Pilih Kurir</span>
        <UIcon
          name="i-lucide-arrow-right"
          class="relative z-10 size-4 pointer-events-none"
        />
      </button>
    </AppStickyBar>
  </div>
</template>
