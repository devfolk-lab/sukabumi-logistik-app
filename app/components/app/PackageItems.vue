<script setup lang="ts">
import type { PackageItem } from '~/types'

/** Read-only package lines with every Biteship field that was filled in. */
const props = defineProps<{ items: PackageItem[] }>()

function dimensions(item: PackageItem): string {
  const parts = [item.length, item.width, item.height]
  return parts.some(Boolean) ? `${parts.map(p => p ?? '-').join(' × ')} cm` : ''
}

const totalWeight = computed(() => itemsWeight(props.items))
const totalQuantity = computed(() => itemsQuantity(props.items))
const totalValue = computed(() => props.items.reduce((sum, item) => sum + item.value * item.quantity, 0))
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="rounded-2xl bg-gray-50 p-4"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-base font-bold leading-snug text-gray-800">
            {{ item.name }}
          </p>
          <p
            v-if="item.category || item.sku"
            class="mt-0.5 text-xs font-semibold text-gray-400"
          >
            {{ [item.category ? itemCategoryLabel(item.category) : '', item.sku ? `SKU ${item.sku}` : ''].filter(Boolean).join(' · ') }}
          </p>
        </div>
        <span class="shrink-0 rounded-full bg-primary-50 px-2.5 py-1 text-xs font-extrabold text-primary">
          × {{ item.quantity }}
        </span>
      </div>
      <p
        v-if="item.description"
        class="mt-2 text-sm leading-snug text-gray-600"
      >
        {{ item.description }}
      </p>
      <dl class="mt-3 grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt class="text-xs font-semibold text-gray-400">
            Berat / brg
          </dt>
          <dd class="font-bold tabular-nums text-gray-700">
            {{ item.weight.toLocaleString('id-ID') }} g
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-gray-400">
            Nilai / brg
          </dt>
          <dd class="font-bold tabular-nums text-gray-700">
            {{ item.value ? formatRupiah(item.value) : '-' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-semibold text-gray-400">
            Dimensi
          </dt>
          <dd class="font-bold tabular-nums text-gray-700">
            {{ dimensions(item) || '-' }}
          </dd>
        </div>
      </dl>
    </div>

    <dl class="grid grid-cols-3 gap-2 rounded-2xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080] p-4 text-white">
      <div>
        <dt class="text-xs font-semibold text-white/60">
          Total barang
        </dt>
        <dd class="text-lg font-extrabold tabular-nums">
          {{ totalQuantity }} pcs
        </dd>
      </div>
      <div>
        <dt class="text-xs font-semibold text-white/60">
          Total berat
        </dt>
        <dd class="text-lg font-extrabold tabular-nums">
          {{ formatBerat(totalWeight) }}
        </dd>
      </div>
      <div>
        <dt class="text-xs font-semibold text-white/60">
          Total nilai
        </dt>
        <dd class="truncate text-lg font-extrabold tabular-nums">
          {{ totalValue ? formatRupiah(totalValue) : '-' }}
        </dd>
      </div>
    </dl>
  </div>
</template>
