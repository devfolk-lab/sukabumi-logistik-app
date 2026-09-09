<script setup lang="ts">
import type { Party } from '~/types'

const props = defineProps<{
  title: string
  icon: string
  modelValue: Party
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Party]
}>()

const open = ref(false)

function update(field: keyof Party, value: string | number): void {
  emit('update:modelValue', { ...props.modelValue, [field]: String(value) })
}
</script>

<template>
  <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
    <button
      type="button"
      class="flex w-full items-center justify-between gap-2"
      @click="open = !open"
    >
      <div class="flex items-center gap-2">
        <div class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary-50">
          <UIcon
            :name="icon"
            class="size-4 text-primary"
          />
        </div>
        <span class="text-base font-bold text-gray-800">{{ title }}</span>
      </div>
      <UIcon
        name="i-lucide-chevron-down"
        class="size-5 shrink-0 text-gray-400 transition-transform duration-200"
        :class="open ? 'rotate-180' : ''"
      />
    </button>
    <div
      v-show="open"
      class="mt-4 space-y-3"
    >
      <UInput
        :model-value="modelValue.nama"
        placeholder="Nama Lengkap"
        size="xl"
        class="w-full"
        @update:model-value="update('nama', $event)"
      />
      <UInput
        :model-value="modelValue.telp"
        type="tel"
        placeholder="Nomor Telepon"
        size="xl"
        class="w-full"
        @update:model-value="update('telp', $event)"
      />
      <UTextarea
        :model-value="modelValue.alamat"
        placeholder="Alamat Detail (nomor rumah, patokan)"
        :rows="2"
        size="xl"
        class="w-full"
        @update:model-value="update('alamat', $event)"
      />
      <div
        v-show="modelValue.alamat.length > 2"
        class="flex items-start gap-2 rounded-xl bg-primary-50 p-3"
      >
        <UIcon
          name="i-lucide-map-pin"
          class="mt-0.5 size-4 shrink-0 text-primary"
        />
        <p class="text-sm text-gray-600">
          {{ modelValue.alamat }}
        </p>
      </div>
    </div>
  </div>
</template>
