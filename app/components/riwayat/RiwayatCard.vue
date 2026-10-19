<script setup lang="ts">
import type { Order } from '~/types'

const props = defineProps<{ order: Order }>()

const statusMeta: Record<Order['status'], { icon: string, bg: string, text: string }> = {
  selesai: { icon: 'i-lucide-circle-check-big', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  proses: { icon: 'i-lucide-truck', bg: 'bg-blue-50', text: 'text-blue-600' },
  batal: { icon: 'i-lucide-x', bg: 'bg-red-50', text: 'text-red-500' }
}

const meta = computed(() => statusMeta[props.order.status])
const pickupCity = computed(() => titleCase(props.order.pickup.split(',')[0] ?? ''))
const deliveryCity = computed(() => titleCase(props.order.delivery.split(',')[0] ?? ''))

/** An Antar Langsung order whose ongkir is still being agreed on WhatsApp. */
const menungguHarga = computed(() => props.order.stage === 'MENUNGGU_PEMBAYARAN' && props.order.price === null)
const whatsapp = useWhatsappChat()
const hargaChatUrl = computed(() => menungguHarga.value ? whatsapp.url(antarLangsungPriceMessage(props.order)) : undefined)
</script>

<template>
  <div class="rounded-3xl bg-white shadow-card lg:shadow-card-flat">
    <NuxtLink
      v-ripple.dark
      :to="`/riwayat/${order.id}`"
      class="flex items-center gap-3 rounded-3xl p-4"
    >
      <div class="relative shrink-0">
        <AppCourierLogo
          :code="order.courierCode"
          class="size-12 rounded-2xl text-sm"
        />
        <span
          class="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-full ring-2 ring-white"
          :class="meta.bg"
        >
          <UIcon
            :name="meta.icon"
            class="size-3"
            :class="meta.text"
          />
        </span>
      </div>
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-2">
          <h4 class="truncate text-base font-bold text-gray-800">
            {{ pickupCity }} → {{ deliveryCity }}
          </h4>
          <RiwayatStatusBadge
            :status="order.status"
            class="shrink-0"
          />
        </div>
        <p class="mt-1 text-sm text-gray-500">
          {{ order.resi }} • {{ order.date }}
        </p>
        <div class="mt-2 flex items-center justify-between gap-2">
          <span class="truncate text-sm text-gray-500">{{ order.courier }}</span>
          <span
            v-if="order.price !== null"
            class="shrink-0 text-base font-extrabold text-primary"
          >{{ formatRupiah(order.price) }}</span>
        </div>
      </div>
    </NuxtLink>
    <!-- Outside the link: an anchor cannot sit inside another one. -->
    <div
      v-if="hargaChatUrl"
      class="px-4 pb-4"
    >
      <a
        v-ripple
        :href="hargaChatUrl"
        target="_blank"
        rel="noopener"
        class="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-2.5 text-sm font-bold text-white shadow-md shadow-[#25D366]/25 hover:bg-[#1ebe5b]"
      >
        <UIcon
          name="i-simple-icons-whatsapp"
          class="size-4 shrink-0 pointer-events-none"
        />
        <span class="pointer-events-none">Konfirmasi via WhatsApp</span>
      </a>
    </div>
  </div>
</template>
