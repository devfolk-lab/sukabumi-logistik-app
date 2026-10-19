<script setup lang="ts">
import type { AdminOrder, OrderStage, Shipment } from '~/types'

/**
 * One customer's order, for the admins: our record, Biteship's booking once it
 * exists, and the courier's history from Biteship's retrieve-order.
 */
const route = useRoute()
const nav = useAppNav()
const request = useRequestFetch()

const id = computed(() => String(route.params.id))

const { data, status, error, refresh } = useAsyncData(
  () => `admin-order-${id.value}`,
  () => request<{ order: AdminOrder, shipment: Shipment }>(`/api/admin/orders/${id.value}`)
    .catch((err: unknown) => {
      handleUnauthorized(err)
      throw err
    }),
  { lazy: true }
)

registerPageRefresh(async () => {
  await refresh()
})

const loading = computed(() => (status.value === 'pending' || status.value === 'idle') && !data.value)
const order = computed(() => data.value?.order)
const shipment = computed(() => data.value?.shipment)
const waiting = computed(() => order.value?.stage === 'MENUNGGU_PEMBAYARAN')

/** "0812…" as a wa.me number (62812…). */
function waNumber(telp: string | null | undefined): string | undefined {
  const digits = (telp ?? '').replace(/\D/g, '')
  if (!digits) return undefined
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits
}

const customerChat = computed(() => {
  const number = waNumber(order.value?.customer.telp || order.value?.sender.telp)
  if (!number || !order.value) return undefined
  return `https://wa.me/${number}?text=${encodeURIComponent(`Halo ${order.value.customer.nama}, terkait pesanan ${order.value.orderNo} di Sukabumi Logistik.`)}`
})

const routePoints = computed(() => order.value
  ? [
      { label: 'Lokasi Penjemputan', area: order.value.origin, party: order.value.sender },
      { label: 'Lokasi Tujuan', area: order.value.destination, party: order.value.receiver }
    ]
  : [])

const showApprove = ref(false)
const showReject = ref(false)
const toast = useToast()

/** Our own courier: priced here after the WhatsApp chat, and moved along by hand. */
const antarLangsung = computed(() => isAntarLangsung(order.value?.courierCode))
const needsPrice = computed(() => waiting.value && antarLangsung.value && order.value?.price === null)

const priceInput = ref<number | undefined>()
const savingPrice = ref(false)
watch(() => order.value?.price, (price) => {
  priceInput.value = price ?? undefined
}, { immediate: true })

const priceError = computed(() => {
  if (priceInput.value === undefined) return undefined
  if (!Number.isInteger(priceInput.value) || priceInput.value < 1000) return 'Minimal Rp 1.000, tanpa desimal'
  return undefined
})

async function savePrice() {
  if (!order.value || savingPrice.value || priceInput.value === undefined || priceError.value) return
  savingPrice.value = true
  try {
    await $fetch<AdminOrder>(`/api/admin/orders/${order.value.id}/price`, {
      method: 'POST',
      body: { price: priceInput.value }
    })
    toast.add({
      title: 'Ongkir disimpan',
      description: `${formatRupiah(priceInput.value)} sekarang tampil di pesanan pelanggan.`,
      color: 'success',
      icon: 'i-lucide-circle-check'
    })
    await refresh()
  } catch (err) {
    handleUnauthorized(err)
    toast.add({ title: 'Gagal menyimpan ongkir', description: apiMessage(err, 'Coba lagi sebentar.'), color: 'error' })
  } finally {
    savingPrice.value = false
  }
}

/** The next step of an approved Antar Langsung order, if it has one. */
const NEXT_STEP: Partial<Record<OrderStage, { stage: OrderStage, label: string, icon: string, hint: string }>> = {
  DIPROSES: { stage: 'DIJEMPUT', label: 'Tandai Sudah Dijemput', icon: 'i-lucide-package-check', hint: 'Kurir kita sudah mengambil paket dari pengirim.' },
  DIJEMPUT: { stage: 'DALAM_PERJALANAN', label: 'Tandai Sedang Diantar', icon: 'i-lucide-truck', hint: 'Paket sedang dalam perjalanan ke penerima.' },
  DALAM_PERJALANAN: { stage: 'SELESAI', label: 'Tandai Sudah Diterima', icon: 'i-lucide-house', hint: 'Paket sudah diterima di alamat tujuan.' }
}
const nextStep = computed(() => antarLangsung.value && order.value ? NEXT_STEP[order.value.stage] ?? null : null)
const stepNote = ref('')
const advancing = ref(false)

async function advance() {
  if (!order.value || !nextStep.value || advancing.value) return
  advancing.value = true
  try {
    await $fetch<AdminOrder>(`/api/admin/orders/${order.value.id}/stage`, {
      method: 'POST',
      body: { stage: nextStep.value.stage, ...(stepNote.value.trim() ? { note: stepNote.value.trim() } : {}) }
    })
    stepNote.value = ''
    toast.add({ title: 'Status diperbarui', color: 'success', icon: 'i-lucide-circle-check' })
    await refresh()
  } catch (err) {
    handleUnauthorized(err)
    toast.add({ title: 'Gagal memperbarui status', description: apiMessage(err, 'Coba lagi sebentar.'), color: 'error' })
  } finally {
    advancing.value = false
  }
}

async function settled() {
  await refresh()
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
          @click="nav.back('/admin/pesanan')"
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
          <h1 class="truncate font-mono text-lg font-bold text-white">
            {{ order?.orderNo ?? 'Detail Pesanan' }}
          </h1>
          <p class="text-sm text-white/60">
            {{ order ? `${order.date} · ${stageLabel(order.stage)}` : 'Persetujuan pesanan' }}
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
        :description="apiMessage(error, 'Pesanan ini mungkin sudah dihapus.')"
        back-label="Kembali ke Persetujuan"
        back-to="/admin/pesanan"
        :retry="refresh"
      />
    </AppPageContent>

    <AppPageContent
      v-else
      class="mt-5 space-y-5"
      :class="waiting ? 'pb-40' : 'pb-10'"
    >
      <!-- Where the payment stands -->
      <div
        v-if="needsPrice"
        class="antar-glow relative overflow-hidden rounded-3xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] p-5 text-white"
      >
        <div class="flex items-start gap-3">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
            <UIcon
              name="i-lucide-sparkles"
              class="size-5"
            />
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-base font-bold">
              Kurir spesial Antar Langsung · ongkir belum diatur
            </p>
            <p class="mt-0.5 text-sm text-white/75">
              Sepakati ongkir dengan pelanggan lewat WhatsApp, lalu isi di bawah. Harganya langsung tampil di pesanan pelanggan, dan pesanan bisa disetujui setelah dibayar.
            </p>
          </div>
        </div>
        <form
          class="mt-4 flex items-start gap-2"
          @submit.prevent="savePrice"
        >
          <UFormField
            :error="priceError"
            class="min-w-0 flex-1"
          >
            <AppRupiahInput
              v-model="priceInput"
              size="xl"
              placeholder="Ongkir, contoh 25.000"
              class="w-full"
            />
          </UFormField>
          <UButton
            v-ripple.dark
            type="submit"
            color="secondary"
            size="xl"
            class="shrink-0 font-bold"
            :loading="savingPrice"
            :disabled="priceInput === undefined || Boolean(priceError)"
          >
            Simpan
          </UButton>
        </form>
      </div>
      <div
        v-else-if="waiting"
        class="flex items-start gap-3 rounded-3xl border border-amber-100 bg-amber-50 p-5"
      >
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
            Cocokkan pembayaran <span class="font-bold">{{ formatOngkir(order.price) }}</span> dengan bukti transfer atau QRIS yang dikirim pelanggan lewat WhatsApp, atau terima tunai di gerai, lalu setujui.
            {{ antarLangsung ? 'Pesanan lalu diserahkan ke kurir Antar Langsung kita.' : 'Pesanan baru dibuat di Biteship setelah disetujui.' }}
          </p>
          <form
            v-if="antarLangsung"
            class="mt-3 flex items-start gap-2"
            @submit.prevent="savePrice"
          >
            <UFormField
              :error="priceError"
              class="min-w-0 flex-1"
            >
              <AppRupiahInput
                v-model="priceInput"
                class="w-full"
              />
            </UFormField>
            <UButton
              v-ripple.dark
              type="submit"
              color="neutral"
              variant="outline"
              class="shrink-0 font-bold"
              :loading="savingPrice"
              :disabled="priceInput === undefined || Boolean(priceError) || priceInput === order.price"
            >
              Ubah Ongkir
            </UButton>
          </form>
        </div>
      </div>
      <div
        v-else-if="order.stage === 'BATAL'"
        class="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-4"
      >
        <UIcon
          name="i-lucide-x"
          class="size-5 shrink-0 text-red-500"
        />
        <p class="text-base font-bold text-red-700">
          Pesanan Dibatalkan
        </p>
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
            {{ order.approvedBy ? `Disetujui ${order.approvedBy} · ${order.approvedAt}` : order.paidAt }}
          </p>
          <p
            v-if="order.paymentMethod"
            class="text-sm text-emerald-700"
          >
            Dibayar lewat {{ order.paymentMethod }}
          </p>
        </div>
      </div>

      <!-- Customer -->
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <p class="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
          Pelanggan
        </p>
        <div class="flex items-center gap-3">
          <span class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-50">
            <UIcon
              name="i-lucide-user"
              class="size-5 text-primary"
            />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-base font-bold text-gray-800">
              {{ order.customer.nama }}
            </p>
            <p class="truncate text-sm text-gray-500">
              {{ order.customer.email }}<template v-if="order.customer.telp">
                · {{ order.customer.telp }}
              </template>
            </p>
          </div>
          <UButton
            v-if="customerChat"
            v-ripple
            :to="customerChat"
            target="_blank"
            rel="noopener"
            icon="i-simple-icons-whatsapp"
            size="lg"
            class="shrink-0 bg-[#25D366] font-bold text-white hover:bg-[#1ebe5b]"
            aria-label="Chat pelanggan di WhatsApp"
          />
        </div>
      </div>

      <!-- Biteship booking -->
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <p class="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
          {{ antarLangsung ? 'Kurir Antar Langsung' : 'Biteship' }}
        </p>
        <div
          v-if="antarLangsung"
          class="space-y-4"
        >
          <dl class="divide-y divide-gray-100 text-sm">
            <div class="flex justify-between gap-3 py-2 first:pt-0">
              <dt class="shrink-0 text-gray-400">
                Resi
              </dt>
              <dd class="truncate font-mono font-semibold text-gray-800">
                {{ order.resi }}
              </dd>
            </div>
            <div class="flex justify-between gap-3 py-2 last:pb-0">
              <dt class="shrink-0 text-gray-400">
                Ongkir
              </dt>
              <dd class="truncate font-semibold text-gray-800">
                {{ formatOngkir(order.price, 'Belum diatur') }}
              </dd>
            </div>
          </dl>
          <p
            v-if="waiting || order.stage === 'BATAL'"
            class="flex items-start gap-3 rounded-2xl bg-gray-50 p-3 text-sm text-gray-500"
          >
            <UIcon
              name="i-lucide-info"
              class="mt-0.5 size-4 shrink-0 text-gray-400"
            />
            Dikirim kurir kita sendiri, tanpa Biteship. Statusnya diperbarui manual di sini setelah disetujui.
          </p>
          <div
            v-else-if="nextStep"
            class="rounded-2xl border border-gold-100 bg-gold-50 p-4"
          >
            <p class="text-sm font-bold text-gold-900">
              Perbarui status · sekarang {{ stageLabel(order.stage).toLowerCase() }}
            </p>
            <p class="mt-0.5 text-sm text-gold-800">
              {{ nextStep.hint }}
            </p>
            <UInput
              v-model="stepNote"
              placeholder="Catatan untuk pelanggan (opsional)"
              maxlength="300"
              class="mt-3 w-full"
            />
            <UButton
              v-ripple
              color="primary"
              size="lg"
              block
              class="mt-2 font-bold"
              :icon="nextStep.icon"
              :loading="advancing"
              @click="advance"
            >
              {{ nextStep.label }}
            </UButton>
          </div>
          <p
            v-else
            class="flex items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700"
          >
            <UIcon
              name="i-lucide-badge-check"
              class="size-4 shrink-0"
            />
            Paket sudah diterima.
          </p>
        </div>
        <p
          v-else-if="!order.biteshipOrderId"
          class="flex items-start gap-3 rounded-2xl bg-gray-50 p-3 text-sm text-gray-500"
        >
          <UIcon
            name="i-lucide-info"
            class="mt-0.5 size-4 shrink-0 text-gray-400"
          />
          {{ order.stage === 'BATAL' ? 'Pesanan dibatalkan sebelum dibuat di Biteship.' : 'Belum dibuat di Biteship. Pesanan dibuat saat disetujui.' }}
        </p>
        <dl
          v-else
          class="divide-y divide-gray-100 text-sm"
        >
          <div class="flex justify-between gap-3 py-2 first:pt-0">
            <dt class="shrink-0 text-gray-400">
              Order ID
            </dt>
            <dd class="truncate font-mono font-semibold text-gray-800">
              {{ order.biteshipOrderId }}
            </dd>
          </div>
          <div class="flex justify-between gap-3 py-2">
            <dt class="shrink-0 text-gray-400">
              Status
            </dt>
            <dd class="truncate font-semibold text-gray-800">
              {{ order.biteshipStatus ?? '-' }}
            </dd>
          </div>
          <div class="flex justify-between gap-3 py-2">
            <dt class="shrink-0 text-gray-400">
              Resi ({{ courierLabel(order.courierCode) }})
            </dt>
            <dd class="truncate font-mono font-semibold text-gray-800">
              {{ order.awb ?? 'Menunggu dari kurir' }}
            </dd>
          </div>
          <div class="flex justify-between gap-3 py-2 last:pb-0">
            <dt class="shrink-0 text-gray-400">
              Dibayar pelanggan
            </dt>
            <dd class="truncate font-semibold text-gray-800">
              {{ formatOngkir(order.price) }}
            </dd>
          </div>
        </dl>
      </div>

      <!-- The courier's history, from Biteship's retrieve-order -->
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
        <p
          v-else
          class="flex items-start gap-3 rounded-2xl bg-gray-50 p-3 text-sm text-gray-500"
        >
          <UIcon
            name="i-lucide-radar"
            class="mt-0.5 size-5 shrink-0 text-gray-400"
          />
          Belum ada kabar dari kurir.
        </p>
      </div>

      <!-- Route -->
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <p class="mb-3 text-xs font-bold uppercase tracking-wider text-gray-400">
          Rute Pengiriman
        </p>
        <div class="space-y-4">
          <div
            v-for="point in routePoints"
            :key="point.label"
            class="min-w-0"
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

      <!-- Package -->
      <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
        <div class="mb-3 flex items-center justify-between gap-3">
          <p class="text-xs font-bold uppercase tracking-wider text-gray-400">
            Rincian Paket
          </p>
          <span class="text-sm font-semibold text-gray-500">{{ order.courier }}</span>
        </div>
        <AppPackageItems :items="order.items" />
      </div>
    </AppPageContent>

    <AppStickyBar v-if="order && waiting">
      <div class="flex w-full gap-2">
        <UButton
          v-ripple.dark
          color="error"
          variant="soft"
          size="xl"
          block
          class="flex-1 font-bold"
          icon="i-lucide-x"
          @click="showReject = true"
        >
          Tolak
        </UButton>
        <UButton
          v-ripple
          color="primary"
          size="xl"
          block
          class="flex-1 font-bold"
          icon="i-lucide-check"
          :disabled="needsPrice"
          :title="needsPrice ? 'Atur ongkir dulu' : undefined"
          @click="showApprove = true"
        >
          Setujui
        </UButton>
      </div>
    </AppStickyBar>

    <AdminApproveDialog
      v-model:open="showApprove"
      :order="order ?? null"
      @approved="settled"
    />
    <AdminRejectDialog
      v-model:open="showReject"
      :order="order ?? null"
      @rejected="settled"
    />
  </div>
</template>
