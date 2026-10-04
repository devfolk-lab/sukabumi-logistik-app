<script setup lang="ts">
import type { Order } from '~/types'

/**
 * How to pay an order: transfer to our account, send the prefilled WhatsApp
 * message, send the transfer proof in that chat, then wait. The admin checks
 * the transfer and confirms the Biteship draft; the order page notices on its
 * next refresh and moves on by itself.
 */
const props = defineProps<{ order: Order }>()
const open = defineModel<boolean>('open', { default: false })

const toast = useToast()
const { copy } = useClipboard({ legacy: true })
const whatsapp = useWhatsappChat()

const chatUrl = computed(() => whatsapp.url(paymentRequestMessage(props.order)))

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
    description="Transfer, lalu konfirmasi lewat WhatsApp."
    :ui="{ content: 'sm:max-w-lg' }"
  >
    <template #body>
      <div class="space-y-5">
        <div class="flex items-center justify-between gap-3 rounded-2xl bg-primary-50 p-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-wider text-primary/60">
              Total transfer
            </p>
            <p class="mt-0.5 text-2xl font-extrabold text-primary">
              {{ formatRupiah(order.price) }}
            </p>
          </div>
          <UButton
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

        <ol class="space-y-5">
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
                Ketuk tombol di bawah. Pesannya sudah terisi Order ID dan nomor referensi pesananmu, tinggal kirim.
              </p>
              <dl class="mt-2.5 space-y-1.5 rounded-xl border border-gray-100 bg-gray-50 p-3 text-sm">
                <div class="flex justify-between gap-3">
                  <dt class="shrink-0 text-gray-400">
                    Order ID
                  </dt>
                  <dd class="truncate font-mono font-semibold text-gray-800">
                    {{ order.draftId ?? '-' }}
                  </dd>
                </div>
                <div class="flex justify-between gap-3">
                  <dt class="shrink-0 text-gray-400">
                    No. Referensi
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
      </div>
    </template>
  </AppDialog>
</template>
