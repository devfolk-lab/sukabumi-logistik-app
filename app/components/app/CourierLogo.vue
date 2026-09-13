<script setup lang="ts">
import type { CourierBrand } from '~/types'

/**
 * Carrier mark. Renders the bundled logo when one exists, on white or on the
 * brand gradient depending on the logo's own colouring, and falls back to the
 * initials tile when there is no logo or it fails to load.
 */
const props = defineProps<{
  code: string
  brand?: CourierBrand
  label?: string
}>()

const brand = computed(() => props.brand ?? courierBrand(props.code))
const failed = ref(false)

watch(() => props.code, () => (failed.value = false))

const showLogo = computed(() => Boolean(brand.value.logo) && !failed.value)
const onBrand = computed(() => !showLogo.value || brand.value.logoOnBrand)

const style = computed(() => onBrand.value
  ? { backgroundImage: `linear-gradient(to bottom right, ${brand.value.from}, ${brand.value.to})` }
  : undefined
)
</script>

<template>
  <span
    class="flex shrink-0 items-center justify-center overflow-hidden"
    :class="onBrand ? 'text-white' : 'bg-white ring-1 ring-gray-100'"
    :style="style"
  >
    <img
      v-if="showLogo"
      :src="brand.logo"
      :alt="label ?? courierLabel(code, code)"
      class="size-full object-contain p-[14%]"
      draggable="false"
      @error="failed = true"
    >
    <UIcon
      v-else-if="brand.icon"
      :name="brand.icon"
      class="size-[45%]"
    />
    <span
      v-else
      class="text-[0.95em] font-extrabold tracking-tight"
    >{{ brand.initials }}</span>
  </span>
</template>
