<script setup lang="ts">
import type { Courier } from '~/types'

const props = defineProps<{
  courier: Courier
  selected: boolean
}>()

const emit = defineEmits<{
  select: [id: string]
}>()

const typeMeta: Record<Courier['type'], { label: string, icon: string, color: 'info' | 'warning', extraClass?: string }> = {
  regular: { label: 'Reguler', icon: 'i-lucide-truck', color: 'info' },
  instant: { label: 'Instan', icon: 'i-lucide-zap', color: 'warning' },
  sameday: { label: 'Same Day', icon: 'i-lucide-clock', color: 'info', extraClass: 'bg-sky-50 text-sky-700' }
}

const meta = computed(() => typeMeta[props.courier.type])
</script>

<template>
  <div
    v-ripple.dark
    class="cursor-pointer overflow-hidden rounded-3xl border-2 bg-white shadow-card transition-all duration-250 lg:shadow-card-flat lg:hover:-translate-y-0.5"
    :class="selected ? 'border-primary bg-[#f0f7ff] shadow-xl shadow-primary/12' : 'border-transparent'"
    @click="emit('select', courier.id)"
  >
    <div class="p-4">
      <div class="flex items-start gap-3">
        <span
          class="flex size-14 shrink-0 items-center justify-center rounded-2xl shadow-md"
          :style="{ backgroundImage: `linear-gradient(to bottom right, ${courier.brand.from}, ${courier.brand.to})` }"
        >
          <UIcon
            v-if="courier.brand.icon"
            :name="courier.brand.icon"
            class="size-6 text-white"
          />
          <span
            v-else
            class="text-base font-extrabold tracking-tight text-white"
          >{{ courier.brand.initials }}</span>
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <h4 class="text-base leading-tight font-bold text-gray-800">
              {{ courier.name }}
            </h4>
            <UBadge
              :color="meta.color"
              variant="soft"
              :icon="meta.icon"
              :class="meta.extraClass"
              class="shrink-0 rounded-full uppercase"
              size="sm"
            >
              {{ meta.label }}
            </UBadge>
          </div>
          <div class="mt-2.5 flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-sm font-semibold text-gray-600">
              <UIcon
                name="i-lucide-clock"
                class="size-3.5"
              /> {{ courier.eta }}
            </span>
            <span class="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-sm font-semibold text-gray-600">
              <UIcon
                name="i-lucide-calendar"
                class="size-3.5"
              /> {{ courier.pickup }}
            </span>
            <span
              v-if="courier.insured"
              class="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-sm font-semibold text-emerald-700"
            >
              <UIcon
                name="i-lucide-shield"
                class="size-3.5"
              /> Asuransi
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3">
      <UBadge
        color="primary"
        variant="soft"
        :icon="courier.vehicle.icon"
      >
        {{ courier.vehicle.label }}
      </UBadge>
      <div class="flex shrink-0 items-center gap-3">
        <p class="text-xl leading-none font-extrabold text-primary">
          {{ formatRupiah(courier.price) }}
        </p>
        <UButton
          :color="selected ? 'success' : 'primary'"
          size="lg"
          class="font-bold"
        >
          {{ selected ? 'Terpilih' : 'Pilih' }}
        </UButton>
      </div>
    </div>
  </div>
</template>
