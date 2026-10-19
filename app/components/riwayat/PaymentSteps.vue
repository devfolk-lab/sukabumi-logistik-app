<script setup lang="ts">
import type { Order } from '~/types'
import { PAYMENT_OUTLETS } from '#shared/utils/payment'
import type { PaymentMethod, PaymentOutlet } from '#shared/utils/payment'

/**
 * How to pay an order, one tab per way: bank transfer, QRIS, or cash at our
 * outlet. Transfer and QRIS end with the prefilled WhatsApp message and the
 * proof in that chat; cash is taken at the counter. Either way an admin
 * checks the payment and approves the order, which books it with the
 * courier; the order page notices on its next refresh and moves on by itself.
 */
const props = defineProps<{ order: Order }>()
const open = defineModel<boolean>('open', { default: false })

const method = ref<PaymentMethod>('TRANSFER')

const toast = useToast()
const { copy } = useClipboard({ legacy: true })
const whatsapp = useWhatsappChat()

const chatUrl = computed(() => whatsapp.url(paymentRequestMessage(props.order, method.value)))

/** A branch's own chat, with the cash-payment message already typed. */
function outletChatUrl(outlet: PaymentOutlet): string {
  return `https://wa.me/${outlet.whatsapp}?text=${encodeURIComponent(paymentRequestMessage(props.order, 'TUNAI'))}`
}

const DESCRIPTION: Record<PaymentMethod, string> = {
  TRANSFER: 'Transfer ke rekening kami, lalu konfirmasi lewat WhatsApp.',
  QRIS: 'Pindai QRIS dari aplikasi bank atau e-wallet, lalu konfirmasi lewat WhatsApp.',
  TUNAI: 'Bayar langsung di kasir salah satu gerai Sukabumi Logistik.'
}

async function copyText(value: string, what: string) {
  try {
    await copy(value)
    toast.add({ title: `${what} disalin`, icon: 'i-lucide-copy-check' })
  } catch {
    toast.add({ title: 'Gagal menyalin', description: value, color: 'warning' })
  }
}
</script>

<template>
  <AppDialog
    v-model:open="open"
    title="Cara Bayar"
    :description="DESCRIPTION[method]"
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="space-y-5">
        <div
          role="tablist"
          aria-label="Metode pembayaran"
          class="grid grid-cols-3 gap-1 rounded-2xl bg-gray-100 p-1"
        >
          <button
            v-for="item in PAYMENT_METHODS"
            :key="item"
            v-ripple="{ dark: method !== item }"
            type="button"
            role="tab"
            :aria-selected="method === item"
            class="flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-sm font-semibold"
            :class="method === item
              ? 'bg-primary text-white shadow-md shadow-primary/25'
              : 'text-gray-500 hover:text-gray-700'"
            @click="method = item"
          >
            <UIcon
              :name="PAYMENT_METHOD_META[item].icon"
              class="pointer-events-none size-4 shrink-0"
            />
            <span class="pointer-events-none truncate">{{ PAYMENT_METHOD_META[item].short }}</span>
          </button>
        </div>

        <div class="flex items-center justify-between gap-3 rounded-2xl bg-primary-50 p-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-primary/60">
              Total bayar
            </p>
            <p class="mt-0.5 text-2xl font-extrabold text-primary">
              {{ formatOngkir(order.price) }}
            </p>
          </div>
          <UButton
            v-if="method === 'TRANSFER'"
            v-ripple.dark
            icon="i-lucide-copy"
            color="primary"
            variant="soft"
            class="font-bold"
            @click="copyText(String(order.price), 'Nominal')"
          >
            Salin
          </UButton>
        </div>

        <!-- Bank transfer -->
        <ol
          v-if="method === 'TRANSFER'"
          class="space-y-5"
        >
          <li class="flex gap-3">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">1</span>
            <div class="min-w-0 flex-1">
              <p class="text-base font-bold text-gray-800">
                Transfer ke rekening ini
              </p>
              <p class="mt-0.5 text-sm text-gray-500">
                Transfer tepat sesuai total di atas supaya mudah dicocokkan.
              </p>
              <div class="mt-2.5 flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div class="min-w-0">
                  <p class="text-xs font-semibold text-gray-400">
                    {{ PAYMENT_ACCOUNT.bank }}
                  </p>
                  <p class="font-mono text-lg font-bold tracking-wide text-gray-800">
                    {{ PAYMENT_ACCOUNT.number }}
                  </p>
                  <p class="truncate text-sm text-gray-500">
                    a.n. {{ PAYMENT_ACCOUNT.holder }}
                  </p>
                </div>
                <UButton
                  v-ripple.dark
                  icon="i-lucide-copy"
                  color="neutral"
                  variant="outline"
                  class="shrink-0 font-bold"
                  @click="copyText(PAYMENT_ACCOUNT.number, 'Nomor rekening')"
                >
                  Salin
                </UButton>
              </div>
            </div>
          </li>

          <li class="flex gap-3">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">2</span>
            <div class="min-w-0 flex-1">
              <p class="text-base font-bold text-gray-800">
                Konfirmasi lewat WhatsApp
              </p>
              <p class="mt-0.5 text-sm text-gray-500">
                Ketuk tombol di bawah. Pesannya sudah terisi nomor pesananmu, tinggal kirim.
              </p>
              <dl class="mt-2.5 space-y-1.5 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
                <div class="flex justify-between gap-3">
                  <dt class="shrink-0 text-gray-400">
                    No. Pesanan
                  </dt>
                  <dd class="truncate font-mono font-semibold text-gray-800">
                    {{ order.orderNo }}
                  </dd>
                </div>
              </dl>
              <UButton
                v-if="chatUrl"
                v-ripple
                :to="chatUrl"
                target="_blank"
                rel="noopener"
                icon="i-simple-icons-whatsapp"
                size="xl"
                block
                class="mt-3 bg-[#25D366] font-bold text-white hover:bg-[#1ebe5b]"
              >
                Kirim via WhatsApp
              </UButton>
              <p
                v-else
                class="mt-3 text-sm font-semibold text-amber-600"
              >
                Nomor WhatsApp admin belum diatur.
              </p>
            </div>
          </li>

          <li class="flex gap-3">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">3</span>
            <div class="min-w-0 flex-1">
              <p class="text-base font-bold text-gray-800">
                Kirim bukti transfer
              </p>
              <p class="mt-0.5 text-sm text-gray-500">
                Di chat yang sama, kirim foto atau tangkapan layar bukti transfer.
              </p>
            </div>
          </li>

          <li class="flex gap-3">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary">
              <UIcon
                name="i-lucide-hourglass"
                class="size-3.5"
              />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-base font-bold text-gray-800">
                Tunggu verifikasi
              </p>
              <p class="mt-0.5 text-sm text-gray-500">
                Admin akan memeriksa pembayaranmu. Setelah dikonfirmasi, status pesanan di aplikasi berubah sendiri, nomor resi terbit, dan kurir dijadwalkan menjemput paket.
              </p>
            </div>
          </li>
        </ol>

        <!-- QRIS -->
        <ol
          v-else-if="method === 'QRIS'"
          class="space-y-5"
        >
          <li class="flex gap-3">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">1</span>
            <div class="min-w-0 flex-1">
              <p class="text-base font-bold text-gray-800">
                Pindai kode QRIS
              </p>
              <p class="mt-0.5 text-sm text-gray-500">
                Buka aplikasi bank atau e-wallet mana saja, pindai kode ini, lalu masukkan nominal tepat sesuai total di atas.
              </p>
              <div class="mt-2.5 rounded-xl border border-gray-100 bg-gray-50 p-4 text-center">
                <img
                  v-if="PAYMENT_QRIS.image"
                  :src="PAYMENT_QRIS.image"
                  :alt="`QRIS ${PAYMENT_QRIS.merchant}`"
                  class="mx-auto aspect-square w-full max-w-56 rounded-lg bg-white object-contain p-2"
                >
                <div
                  v-else
                  class="mx-auto flex aspect-square w-full max-w-44 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-white p-4"
                >
                  <UIcon
                    name="i-lucide-qr-code"
                    class="size-10 text-gray-300"
                  />
                  <p class="text-xs text-gray-500">
                    Kode QRIS dikirim admin lewat WhatsApp
                  </p>
                </div>
                <p class="mt-2.5 text-sm font-bold text-gray-800">
                  {{ PAYMENT_QRIS.merchant }}
                </p>
                <p
                  v-if="PAYMENT_QRIS.nmid"
                  class="font-mono text-xs text-gray-400"
                >
                  NMID {{ PAYMENT_QRIS.nmid }}
                </p>
              </div>
            </div>
          </li>

          <li class="flex gap-3">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">2</span>
            <div class="min-w-0 flex-1">
              <p class="text-base font-bold text-gray-800">
                Konfirmasi lewat WhatsApp
              </p>
              <p class="mt-0.5 text-sm text-gray-500">
                Ketuk tombol di bawah. Pesannya sudah terisi nomor pesananmu, tinggal kirim.
              </p>
              <dl class="mt-2.5 space-y-1.5 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
                <div class="flex justify-between gap-3">
                  <dt class="shrink-0 text-gray-400">
                    No. Pesanan
                  </dt>
                  <dd class="truncate font-mono font-semibold text-gray-800">
                    {{ order.orderNo }}
                  </dd>
                </div>
              </dl>
              <UButton
                v-if="chatUrl"
                v-ripple
                :to="chatUrl"
                target="_blank"
                rel="noopener"
                icon="i-simple-icons-whatsapp"
                size="xl"
                block
                class="mt-3 bg-[#25D366] font-bold text-white hover:bg-[#1ebe5b]"
              >
                Kirim via WhatsApp
              </UButton>
              <p
                v-else
                class="mt-3 text-sm font-semibold text-amber-600"
              >
                Nomor WhatsApp admin belum diatur.
              </p>
            </div>
          </li>

          <li class="flex gap-3">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">3</span>
            <div class="min-w-0 flex-1">
              <p class="text-base font-bold text-gray-800">
                Kirim bukti pembayaran
              </p>
              <p class="mt-0.5 text-sm text-gray-500">
                Di chat yang sama, kirim tangkapan layar pembayaran QRIS yang berhasil.
              </p>
            </div>
          </li>

          <li class="flex gap-3">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary">
              <UIcon
                name="i-lucide-hourglass"
                class="size-3.5"
              />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-base font-bold text-gray-800">
                Tunggu verifikasi
              </p>
              <p class="mt-0.5 text-sm text-gray-500">
                Admin akan memeriksa pembayaranmu. Setelah dikonfirmasi, status pesanan di aplikasi berubah sendiri, nomor resi terbit, dan kurir dijadwalkan menjemput paket.
              </p>
            </div>
          </li>
        </ol>

        <!-- Cash at the outlet: the number to quote at the counter, then where -->
        <div
          v-else
          class="space-y-3"
        >
          <div class="flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
            <div class="min-w-0">
              <p class="text-xs font-semibold text-gray-400">
                No. Pesanan
              </p>
              <p class="truncate font-mono text-lg font-bold tracking-wide text-gray-800">
                {{ order.orderNo }}
              </p>
            </div>
            <UButton
              v-ripple.dark
              icon="i-lucide-copy"
              color="neutral"
              variant="outline"
              class="shrink-0 font-bold"
              @click="copyText(order.orderNo, 'Nomor pesanan')"
            >
              Salin
            </UButton>
          </div>

          <ul class="space-y-2">
            <li
              v-for="outlet in PAYMENT_OUTLETS"
              :key="outlet.name"
              class="rounded-xl border border-gray-100 bg-gray-50 p-3"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="text-sm font-bold text-gray-800">
                  {{ outlet.name }}
                </p>
                <span
                  class="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                  :class="outlet.type === 'Kantor Utama' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'"
                >{{ outlet.type }}</span>
              </div>
              <p class="mt-1 flex gap-2 text-sm text-gray-500">
                <UIcon
                  name="i-lucide-map-pin"
                  class="mt-0.5 size-4 shrink-0 text-gray-400"
                />
                {{ outlet.address }}
              </p>
              <p class="mt-1 flex gap-2 text-sm text-gray-500">
                <UIcon
                  name="i-lucide-clock"
                  class="mt-0.5 size-4 shrink-0 text-gray-400"
                />
                {{ outlet.hours }}
              </p>
              <div class="mt-2.5 grid grid-cols-2 gap-2">
                <UButton
                  v-ripple
                  :to="outletChatUrl(outlet)"
                  target="_blank"
                  rel="noopener"
                  icon="i-simple-icons-whatsapp"
                  size="sm"
                  block
                  class="bg-[#25D366] font-bold text-white hover:bg-[#1ebe5b]"
                >
                  Chat Admin
                </UButton>
                <UButton
                  v-ripple.dark
                  :to="outlet.mapsUrl"
                  target="_blank"
                  rel="noopener"
                  icon="i-lucide-navigation"
                  color="neutral"
                  variant="outline"
                  size="sm"
                  block
                  class="font-bold"
                >
                  Buka di Maps
                </UButton>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </AppDialog>
</template>
