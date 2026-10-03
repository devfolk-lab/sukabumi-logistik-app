<script setup lang="ts">
import { useBookingStore } from '~/stores/booking'

const booking = useBookingStore()
const nav = useAppNav()
const toast = useToast()

const { data: profile } = useProfile()
const { data: addresses } = useAddresses()

// Prefill the sender from the saved default address so the common case is one
// tap. Anything the user already typed wins. The data is fetched client-side,
// so this runs once both requests have settled rather than on mount.
watch([profile, addresses], () => {
  if (booking.sender.nama || booking.origin) return

  const utama = addresses.value.find(a => a.main && a.area)

  if (utama) {
    booking.useAddress('sender', utama)
  } else if (profile.value) {
    booking.sender = { nama: profile.value.nama, telp: profile.value.telp ?? '', alamat: '' }
  }
}, { immediate: true })

// The next step is a separate chunk; fetch it now so the button feels instant.
onMounted(() => preloadRouteComponents('/kirim/kurir'))

const kurang = computed(() => {
  if (!booking.hasRoute) return 'Pilih lokasi penjemputan dan tujuan dulu.'
  return booking.itemsProblem
})

async function next() {
  if (kurang.value) {
    toast.add({ title: 'Data belum lengkap', description: kurang.value, color: 'warning' })
    return
  }
  await navigateTo('/kirim/kurir')
}
</script>

<template>
  <div>
    <AppPageHero sticky>
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
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
      <KirimPackageForm />
    </AppPageContent>

    <AppStickyBar>
      <button
        type="button"
        class="relative flex w-full items-center justify-center gap-2 rounded-2xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] py-4 text-lg font-bold text-white shadow-lg shadow-primary/20"
        @click="next"
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
