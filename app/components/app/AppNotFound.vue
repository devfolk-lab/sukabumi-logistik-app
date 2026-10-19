<script setup lang="ts">
/**
 * In-page "not found" state, so a bad lookup never leaves the app shell.
 * `offline` is for a lookup that failed only because there is no connection
 * and no cached copy — nothing is missing, so it is drawn as a warning.
 */
defineProps<{
  title: string
  description: string
  backLabel: string
  backTo: string
  retry?: () => Promise<void> | void
  offline?: boolean
}>()
</script>

<template>
  <div class="rounded-3xl bg-white p-8 text-center shadow-card lg:shadow-card-flat">
    <div
      class="mx-auto flex size-16 items-center justify-center rounded-2xl"
      :class="offline ? 'bg-amber-50' : 'bg-red-50'"
    >
      <UIcon
        :name="offline ? 'i-lucide-cloud-off' : 'i-lucide-search-x'"
        class="size-7"
        :class="offline ? 'text-amber-500' : 'text-red-500'"
      />
    </div>
    <p class="mt-4 text-lg font-bold text-gray-800">
      {{ title }}
    </p>
    <p class="mt-1 text-sm text-gray-500">
      {{ description }}
    </p>
    <div class="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
      <UButton
        v-ripple
        :to="backTo"
        size="lg"
        class="font-bold"
        icon="i-lucide-arrow-left"
      >
        {{ backLabel }}
      </UButton>
      <UButton
        v-if="retry"
        v-ripple.dark
        color="neutral"
        variant="soft"
        size="lg"
        icon="i-lucide-refresh-cw"
        @click="retry()"
      >
        Coba lagi
      </UButton>
    </div>
  </div>
</template>
