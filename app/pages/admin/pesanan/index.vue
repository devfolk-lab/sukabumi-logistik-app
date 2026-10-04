<script setup lang="ts">
import type { AdminOrder } from '~/types'

/**
 * Orders from every customer, for the admins. "Menunggu" is the work queue:
 * the customer has transferred and sent the proof on WhatsApp, and approving
 * books the order on Biteship. Oldest first, so nobody waits longest.
 */
const nav = useAppNav()
const request = useRequestFetch()

type Filter = 'pending' | 'active' | 'done' | 'cancelled' | 'all'

const filter = ref<Filter>('pending')
const search = ref('')
const query = refDebounced(search, 400)

const tabs = [
  { label: 'Menunggu', value: 'pending', icon: 'i-lucide-hourglass' },
  { label: 'Diproses', value: 'active', icon: 'i-lucide-truck' },
  { label: 'Selesai', value: 'done', icon: 'i-lucide-circle-check-big' },
  { label: 'Dibatalkan', value: 'cancelled', icon: 'i-lucide-x' },
  { label: 'Semua', value: 'all', icon: 'i-lucide-layers' }
]

const { data: orders, status, error, refresh } = useAsyncData(
  () => `admin-orders-${filter.value}-${query.value.trim()}`,
  () => request<AdminOrder[]>('/api/admin/orders', { query: { status: filter.value, q: query.value.trim() } })
    .catch((err: unknown) => {
      handleUnauthorized(err)
      throw err
    }),
  { default: () => [] }
)

registerPageRefresh(async () => {
  await refresh()
})

const loading = computed(() => (status.value === 'pending' || status.value === 'idle') && !orders.value.length)

// New transfers come in while the queue is open; check again every so often.
const online = useOnline()
const visibility = useDocumentVisibility()
useIntervalFn(() => {
  if (filter.value === 'pending' && online.value && visibility.value === 'visible' && status.value !== 'pending') {
    void refresh()
  }
}, 30_000)

const approving = ref<AdminOrder | null>(null)
const rejecting = ref<AdminOrder | null>(null)
const showApprove = ref(false)
const showReject = ref(false)

function askApprove(order: AdminOrder) {
  approving.value = order
  showApprove.value = true
}

function askReject(order: AdminOrder) {
  rejecting.value = order
  showReject.value = true
}

/** The order left this tab's filter; take it off the list and resync. */
function settled(order: AdminOrder) {
  if (filter.value === 'pending') orders.value = orders.value.filter(o => o.id !== order.id)
  else orders.value = orders.value.map(o => (o.id === order.id ? order : o))
  void refresh()
}
</script>

<template>
  <div>
    <AppPageHero>
      <div class="flex items-center gap-4">
        <button
          type="button"
          class="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 lg:hidden"
          aria-label="Kembali"
          @click="nav.back('/profil')"
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
          <h1 class="text-xl font-bold text-white">
            Persetujuan Pesanan
          </h1>
          <p class="text-sm text-white/60">
            Cocokkan transfer, lalu setujui untuk membuat pesanan di Biteship
          </p>
        </div>
      </div>
    </AppPageHero>

    <AppPageContent class="space-y-3 pt-4 pb-2">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        size="xl"
        placeholder="Cari no. pesanan, resi, nama, atau email"
        class="w-full"
        :ui="{ base: 'rounded-2xl bg-white shadow-card-flat ring-0' }"
      />
      <AppSegmentedTabs
        v-model="filter"
        :items="tabs"
      />
    </AppPageContent>

    <AppPageContent class="mt-2 mb-6">
      <div
        v-if="loading"
        class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5"
      >
        <USkeleton
          v-for="n in 3"
          :key="n"
          class="h-44 rounded-3xl"
        />
      </div>
      <AppNotFound
        v-else-if="error && !orders.length"
        title="Gagal memuat pesanan"
        :description="apiMessage(error, 'Periksa koneksi lalu coba lagi.')"
        back-label="Kembali ke Profil"
        back-to="/profil"
        :retry="refresh"
      />
      <div
        v-else-if="orders.length"
        class="flex flex-col gap-3 lg:grid lg:grid-cols-2 lg:gap-5"
      >
        <AdminOrderCard
          v-for="order in orders"
          :key="order.id"
          :order="order"
          @approve="askApprove"
          @reject="askReject"
        />
      </div>
      <div
        v-else
        class="rounded-3xl bg-white p-6 text-center shadow-card lg:shadow-card-flat"
      >
        <div class="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gray-50">
          <UIcon
            :name="filter === 'pending' ? 'i-lucide-check-check' : 'i-lucide-inbox'"
            class="size-6 text-gray-400"
          />
        </div>
        <p class="mt-3 text-base font-bold text-gray-800">
          {{ filter === 'pending' && !query ? 'Tidak ada yang menunggu' : 'Tidak ada pesanan' }}
        </p>
        <p class="mt-1 text-sm text-gray-500">
          {{ filter === 'pending' && !query ? 'Semua pesanan yang sudah dibayar sudah disetujui.' : 'Coba kata kunci atau tab lain.' }}
        </p>
      </div>
    </AppPageContent>

    <AdminApproveDialog
      v-model:open="showApprove"
      :order="approving"
      @approved="settled"
    />
    <AdminRejectDialog
      v-model:open="showReject"
      :order="rejecting"
      @rejected="settled"
    />
  </div>
</template>
