<script setup lang="ts">
import type { Courier } from '~/types'

const props = defineProps<{
  courier: Courier
  selected: boolean
}>()

const emit = defineEmits<{
  select: [courier: Courier]
}>()

/** A carrier that cannot take this package: shown greyed out, unpriced, not selectable. */
const disabled = computed(() => Boolean(props.courier.unavailable))

function pick() {
  if (!disabled.value) emit('select', props.courier)
}
</script>

<template>
  <div
    v-if="disabled"
    class="overflow-hidden rounded-3xl border-2 border-dashed border-gray-200 bg-gray-50/80"
    aria-disabled="true"
  >
    <div class="p-4">
      <div class="flex items-start gap-3">
        <AppCourierLogo
          :code="courier.code"
          :brand="courier.brand"
          :label="courier.name"
          class="size-14 rounded-2xl text-base opacity-50 grayscale"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h4 class="truncate text-base leading-tight font-bold text-gray-500">
                {{ courier.name }}
              </h4>
              <p class="mt-0.5 truncate text-sm text-gray-400">
                {{ courier.description }}
              </p>
            </div>
            <UBadge
              color="neutral"
              variant="outline"
              class="shrink-0 rounded-full"
              size="sm"
            >
              Tidak tersedia
            </UBadge>
          </div>
        </div>
      </div>
    </div>
    <div class="flex items-center gap-2.5 border-t border-dashed border-gray-200 px-4 py-3">
      <UIcon
        name="i-lucide-weight"
        class="size-4.5 shrink-0 text-gray-400"
      />
      <p class="text-sm font-semibold text-gray-500">
        {{ courier.unavailable }}
      </p>
    </div>
  </div>
  <div
    v-else
    v-ripple.dark
    class="cursor-pointer overflow-hidden rounded-3xl border-2 bg-white shadow-card transition-all duration-250 lg:shadow-card-flat lg:hover:-translate-y-0.5"
    :class="selected ? 'border-primary bg-[#f0f7ff] shadow-xl shadow-primary/12' : 'border-transparent'"
    @click="pick"
  >
    <div class="p-4">
      <div class="flex items-start gap-3">
        <AppCourierLogo
          :code="courier.code"
          :brand="courier.brand"
          :label="courier.name"
          class="size-14 rounded-2xl text-base shadow-md"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h4 class="truncate text-base leading-tight font-bold text-gray-800">
                {{ courier.name }}
              </h4>
              <p class="mt-0.5 truncate text-sm text-gray-500">
                {{ courier.description }}
              </p>
            </div>
            <UBadge
              color="neutral"
              variant="soft"
              class="shrink-0 rounded-full font-mono"
              size="sm"
            >
              {{ courier.service }}
            </UBadge>
          </div>
          <div class="mt-2.5 flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-sm font-semibold text-gray-600">
              <UIcon
                name="i-lucide-clock"
                class="size-3.5"
              /> {{ formatEtd(courier.etd) }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="flex items-center justify-between gap-2 border-t border-gray-100 bg-gray-50 px-4 py-3">
      <p class="text-xl leading-none font-extrabold text-primary">
        {{ formatOngkir(courier.cost) }}
      </p>
      <UButton
        :color="selected ? 'success' : 'primary'"
        size="lg"
        class="pointer-events-none font-bold"
      >
        {{ selected ? 'Terpilih' : 'Pilih' }}
      </UButton>
    </div>
  </div>
</template>
