<script setup lang="ts">
import type { Party } from '~/types'

const props = withDefaults(defineProps<{
  title: string
  subtitle?: string
  icon: string
  modelValue: Party
  /** The subdistrict this party sits in, shown above the street address. */
  location?: string
  defaultOpen?: boolean
}>(), { defaultOpen: false, subtitle: undefined, location: undefined })

const emit = defineEmits<{
  'update:modelValue': [value: Party]
}>()

const open = ref(props.defaultOpen)

const complete = computed(() =>
  Boolean(props.modelValue.nama.trim() && props.modelValue.telp.trim() && props.modelValue.alamat.trim())
)

function update(field: keyof Party, value: string | number): void {
  emit('update:modelValue', { ...props.modelValue, [field]: String(value) })
}
</script>

<template>
  <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
    <button
      v-ripple.dark
      type="button"
      class="-m-2 flex w-[calc(100%+1rem)] items-center justify-between gap-2 rounded-2xl p-2"
      @click="open = !open"
    >
      <div class="pointer-events-none flex min-w-0 items-center gap-3">
        <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
          <UIcon
            :name="icon"
            class="size-5 text-primary"
          />
        </div>
        <div class="min-w-0 text-left">
          <p class="text-base font-bold text-gray-800">
            {{ title }}
          </p>
          <p
            v-if="subtitle"
            class="truncate text-sm text-gray-500"
          >
            {{ subtitle }}
          </p>
        </div>
      </div>
      <div class="pointer-events-none flex shrink-0 items-center gap-2">
        <UIcon
          v-if="complete"
          name="i-lucide-circle-check"
          class="size-5 text-emerald-500"
        />
        <UIcon
          name="i-lucide-chevron-down"
          class="size-5 text-gray-400 transition-transform duration-200"
          :class="open ? 'rotate-180' : ''"
        />
      </div>
    </button>

    <div
      v-show="open"
      class="mt-5 space-y-4"
    >
      <UFormField label="Nama lengkap">
        <UInput
          :model-value="modelValue.nama"
          placeholder="Nama sesuai identitas"
          icon="i-lucide-user"
          size="xl"
          autocomplete="name"
          class="w-full"
          @update:model-value="update('nama', $event)"
        />
      </UFormField>

      <UFormField label="Nomor telepon">
        <UInput
          :model-value="modelValue.telp"
          type="tel"
          placeholder="08xx-xxxx-xxxx"
          icon="i-lucide-phone"
          size="xl"
          autocomplete="tel"
          inputmode="tel"
          class="w-full"
          @update:model-value="update('telp', $event)"
        />
      </UFormField>

      <UFormField
        label="Alamat lengkap"
        :help="location ? `Di ${location}` : undefined"
      >
        <UTextarea
          :model-value="modelValue.alamat"
          placeholder="Jalan, nomor rumah, RT/RW, patokan"
          icon="i-lucide-map-pin"
          :rows="3"
          size="xl"
          class="w-full"
          @update:model-value="update('alamat', $event)"
        />
      </UFormField>
    </div>
  </div>
</template>
