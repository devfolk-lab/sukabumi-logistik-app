<script setup lang="ts">
/**
 * A rupiah amount typed as digits and shown grouped with dots ("25.000"), with
 * "Rp" in front. The model is the plain number, undefined while empty. Other
 * attributes (size, placeholder, class, ui…) pass through to `UInput`.
 */
defineOptions({ inheritAttrs: false })

const model = defineModel<number | undefined>()

const shown = computed(() => model.value === undefined ? '' : model.value.toLocaleString('id-ID'))

function update(value: unknown): void {
  const digits = String(value ?? '').replace(/\D/g, '')
  model.value = digits ? Number(digits) : undefined
}
</script>

<template>
  <UInput
    v-bind="$attrs"
    :model-value="shown"
    inputmode="numeric"
    :ui="{ base: 'tabular-nums' }"
    @update:model-value="update"
  >
    <template #leading>
      <span class="text-sm font-bold text-gray-400">Rp</span>
    </template>
  </UInput>
</template>
