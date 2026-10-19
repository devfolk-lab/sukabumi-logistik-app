<script setup lang="ts">
/**
 * Our own courier, Sukabumi Logistik Antar Langsung. Laid out like `MitraCard`,
 * but it has no quote — the ongkir is agreed on WhatsApp after the order is
 * made and set by an admin — and it is dressed to stand out from the carriers
 * beside it (see `antar-*` in main.css).
 */
defineProps<{ selected: boolean }>()

const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <div
    v-ripple.dark
    role="button"
    tabindex="0"
    :aria-pressed="selected"
    class="antar-card cursor-pointer overflow-hidden rounded-3xl transition-transform duration-250 lg:hover:-translate-y-0.5"
    :style="{ '--antar-fill': selected ? '#fdf6e3' : '#ffffff' }"
    @click="emit('select')"
    @keydown.enter.prevent="emit('select')"
    @keydown.space.prevent="emit('select')"
  >
    <div class="p-4">
      <div class="flex items-start gap-3">
        <AppCourierLogo
          :code="ANTAR_LANGSUNG.code"
          :brand="ANTAR_LANGSUNG.brand"
          :label="ANTAR_LANGSUNG.name"
          class="antar-shine size-14 rounded-2xl text-base shadow-md"
        />
        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h4 class="truncate text-base leading-tight font-bold text-gray-800">
                {{ ANTAR_LANGSUNG.name }}
              </h4>
              <p class="mt-0.5 truncate text-sm text-gray-500">
                {{ ANTAR_LANGSUNG.description }}
              </p>
            </div>
            <span class="inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-extrabold text-primary">
              <UIcon
                name="i-lucide-sparkles"
                class="size-3"
              />
              Spesial
            </span>
          </div>
          <div class="mt-2.5 flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1 rounded-lg bg-gold-50 px-2 py-1 text-sm font-semibold text-gold-900">
              <UIcon
                name="i-lucide-truck"
                class="size-3.5"
              /> {{ ANTAR_LANGSUNG.service }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <div class="antar-shine flex items-center justify-between gap-2 bg-linear-135 from-[#002144] via-[#003366] to-[#004080] px-4 py-3">
      <p class="inline-flex items-center gap-1.5 text-base leading-none font-extrabold text-white">
        <UIcon
          name="i-simple-icons-whatsapp"
          class="size-4.5 text-[#25d366]"
        />
        Harga via WhatsApp
      </p>
      <UButton
        :color="selected ? 'success' : 'secondary'"
        size="lg"
        class="pointer-events-none font-bold"
      >
        {{ selected ? 'Terpilih' : 'Pilih' }}
      </UButton>
    </div>
  </div>
</template>
