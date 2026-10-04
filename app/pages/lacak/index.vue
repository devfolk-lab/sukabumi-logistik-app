<script setup lang="ts">
import type { TrackedWaybill } from '~/types'

/**
 * Lacak is for waybills that were not created in this app: search one, and
 * every waybill tracked before is listed below, newest first, from the
 * account's history on the server. Orders placed here are in Riwayat.
 */
definePageMeta({ refreshKeys: ['lookups'] })

const nav = useAppNav()
const toast = useToast()
const online = useOnline()
const { data: lookups, status } = useTrackedWaybills()

const loading = computed(() => (status.value === 'pending' || status.value === 'idle') && !lookups.value.length)

const stageMeta = (stage: TrackedWaybill['stage']) => {
  if (stage === 'SELESAI') return { color: 'success' as const, icon: 'i-lucide-circle-check-big', bg: 'bg-emerald-50', text: 'text-emerald-600' }
  if (stage === 'BATAL') return { color: 'error' as const, icon: 'i-lucide-x', bg: 'bg-red-50', text: 'text-red-500' }
  return { color: 'info' as const, icon: 'i-lucide-truck', bg: 'bg-blue-50', text: 'text-blue-600' }
}

const removing = ref<string | null>(null)

/** Drops one waybill from the history; needs the server, so never queued. */
async function remove(item: TrackedWaybill) {
  if (removing.value) return
  if (!online.value) {
    toast.add({ title: 'Butuh koneksi internet', description: 'Menghapus riwayat lacak memerlukan koneksi aktif.', color: 'warning' })
    return
  }
  removing.value = item.id
  try {
    await $fetch(`/api/lookups/${item.id}`, { method: 'DELETE' })
    writeApiCache('lookups', lookups.value.filter(l => l.id !== item.id))
  } catch (error) {
    handleUnauthorized(error)
    toast.add({ title: 'Gagal menghapus', description: apiMessage(error, 'Coba lagi sebentar.'), color: 'error' })
  } finally {
    removing.value = null
  }
}
</script>

<template>
  <div>
    <AppPageHero>
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20"
          aria-label="Kembali"
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
            Lacak Pengiriman
          </h1>
          <p class="text-sm text-white/60">
            Untuk kiriman di luar aplikasi
          </p>
        </div>
      </div>
    </AppPageHero>

    <AppPageContent class="mt-5 space-y-5 pb-10">
      <LacakTrackingSearch />

      <div>
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-base font-bold text-gray-800">
            Riwayat Lacak
          </h2>
          <span
            v-if="lookups.length"
            class="text-sm font-semibold text-gray-400"
          >{{ lookups.length }} resi</span>
        </div>
        <div
          v-if="loading"
          class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5"
        >
          <USkeleton
            v-for="n in 2"
            :key="n"
            class="h-28 rounded-3xl"
          />
        </div>
        <div
          v-else-if="!lookups.length"
          class="rounded-3xl bg-white p-6 text-center shadow-card lg:shadow-card-flat"
        >
          <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-orange-50">
            <UIcon
              name="i-lucide-package-search"
              class="size-6 text-orange-500"
            />
          </div>
          <p class="mt-3 text-base font-bold text-gray-800">
            Belum ada resi yang dilacak
          </p>
          <p class="mt-1 text-sm text-gray-500">
            Resi yang kamu lacak di atas akan tersimpan di sini.
          </p>
        </div>
        <div
          v-else
          class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5"
        >
          <div
            v-for="item in lookups"
            :key="item.id"
            class="relative flex items-center gap-3 rounded-3xl bg-white shadow-card lg:shadow-card-flat"
          >
            <NuxtLink
              v-ripple.dark
              :to="{ path: `/lacak/${item.resi}`, query: { courier: item.courierCode } }"
              class="flex min-w-0 flex-1 items-center gap-3 rounded-3xl p-4 pr-12"
            >
              <div class="pointer-events-none relative shrink-0">
                <AppCourierLogo
                  :code="item.courierCode"
                  class="size-12 rounded-2xl text-sm"
                />
                <span
                  class="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-full ring-2 ring-white"
                  :class="stageMeta(item.stage).bg"
                >
                  <UIcon
                    :name="stageMeta(item.stage).icon"
                    class="size-3"
                    :class="stageMeta(item.stage).text"
                  />
                </span>
              </div>
              <div class="pointer-events-none min-w-0 flex-1">
                <p class="truncate font-mono text-base font-bold text-gray-800">
                  {{ item.resi }}
                </p>
                <p class="mt-0.5 truncate text-sm text-gray-500">
                  {{ item.origin.nama }} → {{ item.destination.nama }}
                </p>
                <p
                  class="mt-1.5 truncate text-sm font-semibold"
                  :class="stageMeta(item.stage).text"
                >
                  {{ item.status }}
                </p>
                <p class="mt-0.5 truncate text-xs text-gray-400">
                  {{ item.courier }} · dilacak {{ item.lookedUpAt }}
                </p>
              </div>
            </NuxtLink>
            <UButton
              v-ripple.dark
              icon="i-lucide-trash-2"
              color="neutral"
              variant="ghost"
              size="sm"
              class="absolute top-3 right-3 text-gray-400 hover:text-red-500"
              :loading="removing === item.id"
              :aria-label="`Hapus ${item.resi} dari riwayat lacak`"
              @click="remove(item)"
            />
          </div>
        </div>
      </div>
    </AppPageContent>
  </div>
</template>
