<script setup lang="ts">
import type { TimelineStep } from '~/types'

defineProps<{ steps: TimelineStep[] }>()
</script>

<template>
  <div>
    <div
      v-for="(step, i) in steps"
      :key="i"
      class="flex gap-3"
    >
      <div class="flex flex-col items-center">
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold"
          :class="step.done ? 'bg-emerald-500 text-white' : step.current ? 'bg-primary text-white ring-4 ring-primary/15' : 'bg-gray-200 text-gray-400'"
        >
          <UIcon
            v-if="step.done"
            name="i-lucide-check"
            class="size-4"
          />
          <UIcon
            v-else-if="step.current"
            name="i-lucide-circle-dot"
            class="size-4"
          />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <span
          v-if="i < steps.length - 1"
          class="my-1 min-h-6 w-0.5 flex-1"
          :class="step.done ? 'bg-emerald-500' : 'bg-gray-200'"
        />
      </div>
      <div
        class="min-w-0 flex-1"
        :class="i < steps.length - 1 ? 'pb-6' : ''"
      >
        <p
          class="text-sm font-bold"
          :class="step.current ? 'text-primary' : 'text-gray-800'"
        >
          {{ step.title }}
        </p>
        <p class="mt-0.5 text-sm text-gray-500">
          {{ step.location }}
        </p>
        <p class="mt-1 text-xs font-semibold text-gray-400">
          {{ step.time }}
        </p>
      </div>
    </div>
  </div>
</template>
