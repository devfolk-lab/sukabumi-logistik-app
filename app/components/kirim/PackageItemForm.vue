<script setup lang="ts">
import type { PackageItem } from '~/types'

/**
 * One package line, with every field Biteship's `items` take. Name, jumlah,
 * berat and nilai are required for a quote; the rest sit behind "Detail
 * tambahan" so a simple parcel stays four fields long.
 */
const props = defineProps<{
  modelValue: PackageItem
  index: number
  removable: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: PackageItem]
  'remove': []
}>()

const categories = ITEM_CATEGORIES.map(c => ({ label: c.label, value: c.value as string }))

// Opens by itself when the line already carries optional details.
const showMore = ref(Boolean(
  props.modelValue.description || props.modelValue.sku
  || props.modelValue.length || props.modelValue.width || props.modelValue.height
))

function set<K extends keyof PackageItem>(key: K, value: PackageItem[K]): void {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

/** Digits only, so "1.000" and "1000" both read as a thousand. */
function digitsOf(value: unknown): number | null {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits ? Number(digits) : null
}

function setRequired(key: 'value' | 'quantity', value: unknown): void {
  set(key, digitsOf(value) ?? 0)
}

// Berat is entered in kilograms to one decimal (0,5 kg = 500 g) but stored in
// grams, which is what Biteship takes.
const weightKg = computed(() => props.modelValue.weight ? props.modelValue.weight / 1000 : undefined)
const weightFormat = { style: 'unit', unit: 'kilogram', minimumFractionDigits: 1, maximumFractionDigits: 1 } as const

function setWeight(kg: number | null | undefined): void {
  set('weight', kg ? Math.round(kg * 10) * 100 : 0)
}

function setDimension(key: 'length' | 'width' | 'height', value: unknown): void {
  set(key, digitsOf(value))
}

const numberInput = 'tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
</script>

<template>
  <div class="rounded-2xl border border-gray-100 bg-gray-50/60 p-4">
    <div class="mb-3 flex items-center justify-between gap-2">
      <p class="text-sm font-bold uppercase tracking-wider text-gray-400">
        Barang {{ index + 1 }}
      </p>
      <button
        v-if="removable"
        v-ripple.dark
        type="button"
        class="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-semibold text-red-500 hover:bg-red-50"
        @click="emit('remove')"
      >
        <UIcon
          name="i-lucide-trash-2"
          class="pointer-events-none size-4"
        />
        <span class="pointer-events-none">Hapus</span>
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <UFormField
        label="Nama barang"
        required
        class="col-span-2"
      >
        <UInput
          :model-value="modelValue.name"
          placeholder="Contoh: Kaos polos"
          size="xl"
          class="w-full"
          @update:model-value="set('name', String($event ?? ''))"
        />
      </UFormField>

      <UFormField
        label="Kategori"
        class="col-span-2 sm:col-span-1"
      >
        <USelect
          :model-value="modelValue.category"
          :items="categories"
          placeholder="Pilih kategori"
          size="xl"
          class="w-full"
          @update:model-value="set('category', String($event ?? ''))"
        />
      </UFormField>

      <UFormField
        label="Nilai barang"
        required
        class="col-span-2 sm:col-span-1"
      >
        <UInput
          :model-value="modelValue.value ? modelValue.value.toLocaleString('id-ID') : ''"
          inputmode="numeric"
          placeholder="0"
          size="xl"
          class="w-full"
          :ui="{ base: numberInput }"
          @update:model-value="setRequired('value', $event)"
        >
          <template #leading>
            <span class="text-sm font-bold text-gray-400">Rp</span>
          </template>
        </UInput>
      </UFormField>

      <UFormField
        label="Jumlah"
        required
      >
        <UInput
          :model-value="modelValue.quantity ? String(modelValue.quantity) : ''"
          inputmode="numeric"
          placeholder="1"
          size="xl"
          class="w-full"
          :ui="{ base: numberInput }"
          @update:model-value="setRequired('quantity', $event)"
        >
          <template #trailing>
            <span class="text-sm font-bold text-gray-400">pcs</span>
          </template>
        </UInput>
      </UFormField>

      <UFormField
        label="Berat barang"
        required
      >
        <UInputNumber
          :model-value="weightKg"
          :min="0.1"
          :step="0.1"
          :format-options="weightFormat"
          locale="id-ID"
          placeholder="1,0 kg"
          size="xl"
          class="w-full"
          :ui="{ base: 'tabular-nums' }"
          @update:model-value="setWeight"
        />
      </UFormField>
    </div>

    <button
      v-ripple.dark
      type="button"
      class="mt-3 flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-semibold text-primary"
      @click="showMore = !showMore"
    >
      <UIcon
        name="i-lucide-chevron-down"
        class="pointer-events-none size-4 transition-transform duration-200"
        :class="showMore ? 'rotate-180' : ''"
      />
      <span class="pointer-events-none">Detail tambahan (deskripsi, SKU, dimensi)</span>
    </button>

    <div
      v-show="showMore"
      class="mt-3 grid grid-cols-3 gap-3"
    >
      <UFormField
        label="Deskripsi"
        class="col-span-3"
      >
        <UTextarea
          :model-value="modelValue.description"
          placeholder="Warna, ukuran, atau keterangan lain"
          :rows="2"
          size="xl"
          class="w-full"
          @update:model-value="set('description', String($event ?? ''))"
        />
      </UFormField>

      <UFormField
        label="SKU"
        class="col-span-3"
      >
        <UInput
          :model-value="modelValue.sku"
          placeholder="Kode barang (opsional)"
          size="xl"
          class="w-full"
          @update:model-value="set('sku', String($event ?? ''))"
        />
      </UFormField>

      <UFormField
        v-for="dimension in (['length', 'width', 'height'] as const)"
        :key="dimension"
        :label="{ length: 'Panjang', width: 'Lebar', height: 'Tinggi' }[dimension]"
      >
        <UInput
          :model-value="modelValue[dimension] ? String(modelValue[dimension]) : ''"
          inputmode="numeric"
          placeholder="0"
          size="xl"
          class="w-full"
          :ui="{ base: numberInput }"
          @update:model-value="setDimension(dimension, $event)"
        >
          <template #trailing>
            <span class="text-sm font-bold text-gray-400">cm</span>
          </template>
        </UInput>
      </UFormField>
    </div>
  </div>
</template>
