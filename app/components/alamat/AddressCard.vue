<script setup lang="ts">
import type { Address } from '~/types'

defineProps<{ address: Address }>()

const emit = defineEmits<{ remove: [id: number] }>()

const toast = useToast()

function edit() {
  toast.add({ title: 'Fitur edit alamat akan segera hadir' })
}
</script>

<template>
  <div class="rounded-3xl bg-white p-4 shadow-card lg:shadow-card-flat">
    <div class="mb-2 flex items-start justify-between gap-2">
      <div class="flex flex-wrap items-center gap-2">
        <UBadge
          color="primary"
          variant="subtle"
          class="rounded-full"
        >
          {{ address.label }}
        </UBadge>
        <UBadge
          v-if="address.main"
          color="secondary"
          variant="subtle"
          class="rounded-full"
        >
          Utama
        </UBadge>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <button
          v-ripple.dark
          type="button"
          class="flex size-8 items-center justify-center rounded-lg text-gray-400"
          aria-label="Edit alamat"
          @click="edit"
        >
          <UIcon
            name="i-lucide-pencil"
            class="pointer-events-none size-4"
          />
        </button>
        <button
          v-ripple.dark
          type="button"
          class="flex size-8 items-center justify-center rounded-lg text-red-400"
          aria-label="Hapus alamat"
          @click="emit('remove', address.id)"
        >
          <UIcon
            name="i-lucide-trash-2"
            class="pointer-events-none size-4"
          />
        </button>
      </div>
    </div>
    <p class="text-base font-bold text-gray-800">
      {{ address.nama }}
    </p>
    <p class="mt-0.5 text-sm text-gray-500">
      {{ address.telp }}
    </p>
    <p class="mt-2 text-sm leading-relaxed text-gray-600">
      {{ address.alamat }}
    </p>
  </div>
</template>
