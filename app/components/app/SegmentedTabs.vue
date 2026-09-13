<script setup lang="ts">
export interface SegmentedTab<T extends string = string> {
  label: string
  value: T
  icon?: string
}

/**
 * Horizontally scrolling pill tabs. Unlike `UTabs` the labels never truncate,
 * so four options stay readable at phone width; the row scrolls instead.
 */
defineProps<{ items: SegmentedTab[] }>()

const model = defineModel<string>({ required: true })
</script>

<template>
  <div
    role="tablist"
    class="hide-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 py-1 lg:mx-0 lg:px-0"
  >
    <button
      v-for="item in items"
      :key="item.value"
      v-ripple="{ dark: model !== item.value }"
      type="button"
      role="tab"
      :aria-selected="model === item.value"
      class="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-semibold"
      :class="model === item.value
        ? 'bg-primary text-white shadow-md shadow-primary/25'
        : 'bg-white text-gray-600 shadow-card-flat hover:bg-gray-50'"
      @click="model = item.value"
    >
      <UIcon
        v-if="item.icon"
        :name="item.icon"
        class="pointer-events-none size-4"
      />
      <span class="pointer-events-none">{{ item.label }}</span>
    </button>
  </div>
</template>
