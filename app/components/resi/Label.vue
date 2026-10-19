<script setup lang="ts">
import type { Area, Order, Party } from '~/types'
import logo from '~/assets/img/logo.png'

/**
 * The 100 × 150 mm shipping label for one order: carrier and our logo, a
 * Code 128 barcode of the waybill, service, route, quantity and weight, both
 * addresses and the goods. Only meaningful once the order has a waybill.
 */
const props = defineProps<{
  order: Order
}>()

// `resi` is the carrier's AWB, or our order number for Antar Langsung, which has none.
const barcode = computed(() => props.order.resi ? code128(props.order.resi) : null)

/** "SUKABUMI - JAKARTA BARAT" — the sort line in the black box. */
const sortLine = computed(() => [props.order.origin, props.order.destination]
  .map(a => a.administrative_division_level_2_name.toUpperCase())
  .join(' - '))

function addressLines(party: Party, area: Area): string[] {
  return [
    party.alamat,
    `Kec. ${areaTitle(area)}, ${areaSubtitle(area)}`
  ]
}
</script>

<template>
  <!-- Sized in millimetres so it prints true to size. -->
  <article class="label mx-auto w-[100mm] max-w-full border border-black bg-white text-[9pt] leading-tight text-black print:max-w-none">
    <!-- Carrier | us -->
    <div class="grid grid-cols-2 items-center border-b border-black">
      <div class="flex h-[20mm] items-center justify-center border-r border-black p-[1.5mm]">
        <AppCourierLogo
          :code="order.courierCode"
          flush
          class="h-full w-full text-[12pt] ring-0!"
        />
      </div>
      <div class="flex h-[20mm] items-center justify-center p-[1.5mm]">
        <img
          :src="logo"
          alt="Sukabumi Logistik"
          class="max-h-full w-auto object-contain"
        >
      </div>
    </div>

    <!-- Waybill barcode -->
    <div class="border-b border-black px-[4mm] pt-[3mm] pb-[2mm] text-center">
      <svg
        v-if="barcode"
        :viewBox="`0 0 ${barcode.width} 40`"
        preserveAspectRatio="none"
        class="h-[14mm] w-full"
        role="img"
        :aria-label="`Barcode resi ${order.resi}`"
      >
        <rect
          v-for="(bar, index) in barcode.bars"
          :key="index"
          :x="bar.x"
          y="0"
          :width="bar.width"
          height="40"
          fill="#000"
        />
      </svg>
      <p class="mt-[1.5mm] text-[11pt] font-semibold">
        Nomor Resi - <span class="font-mono font-bold">{{ order.resi }}</span>
      </p>
    </div>

    <div class="border-b border-black py-[2mm] text-center text-[10pt]">
      Nilai COD: <span class="font-bold">Non COD</span>
    </div>

    <div class="border-b border-black py-[2mm] text-center text-[10pt]">
      Jenis Layanan - <span class="font-bold">{{ order.service }}</span>
    </div>

    <!-- Sort line | quantity and weight -->
    <div class="grid grid-cols-2 border-b border-black">
      <div class="flex items-center justify-center border-r border-black p-[2mm]">
        <span class="bg-black px-[2mm] py-[1mm] text-center text-[9pt] font-bold text-white">
          {{ sortLine }}
        </span>
      </div>
      <dl class="grid grid-cols-[auto_auto_1fr] gap-x-[2mm] gap-y-[1mm] p-[2mm] text-[10pt]">
        <dt>Quantity</dt>
        <dd>:</dd>
        <dd class="font-bold">
          {{ itemsQuantity(order.items) }} Pcs
        </dd>
        <dt>Weight</dt>
        <dd>:</dd>
        <dd class="font-bold">
          {{ (order.weightGram / 1000).toLocaleString('id-ID', { maximumFractionDigits: 2 }) }} Kg
        </dd>
      </dl>
    </div>

    <!-- Receiver | sender -->
    <div class="grid grid-cols-2 border-b border-black">
      <div class="min-h-[34mm] border-r border-black p-[2mm]">
        <p class="text-[8pt]">
          Alamat Penerima:
        </p>
        <p class="mt-[1mm] font-bold">
          {{ order.receiver.nama }}
        </p>
        <p>{{ order.receiver.telp }}</p>
        <p
          v-for="line in addressLines(order.receiver, order.destination)"
          :key="line"
          class="mt-[0.5mm]"
        >
          {{ line }}
        </p>
      </div>
      <div class="min-h-[34mm] p-[2mm]">
        <p class="text-[8pt]">
          Alamat Pengirim:
        </p>
        <p class="mt-[1mm] font-bold">
          {{ order.sender.nama }}
        </p>
        <p>{{ order.sender.telp }}</p>
        <p
          v-for="line in addressLines(order.sender, order.origin)"
          :key="line"
          class="mt-[0.5mm]"
        >
          {{ line }}
        </p>
      </div>
    </div>

    <div class="border-b border-black p-[2mm]">
      Jenis Barang : <span class="font-semibold">{{ order.content }}</span>
    </div>

    <div class="grid grid-cols-[auto_auto_1fr] gap-x-[2mm] border-b border-black p-[2mm]">
      <span>No. Pesanan</span>
      <span>:</span>
      <span class="font-mono font-semibold">{{ order.orderNo }}</span>
    </div>

    <div class="py-[2mm] text-center text-[8pt]">
      <p>Pengiriman melalui Sukabumi Logistik</p>
      <p>{{ order.courier }} · via Biteship</p>
    </div>
  </article>
</template>

<style>
@media print {
  /* Background colours (the black sort box) are dropped by default, and the
     page edge is the label's edge. */
  .label {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    border: none;
  }
}
</style>
