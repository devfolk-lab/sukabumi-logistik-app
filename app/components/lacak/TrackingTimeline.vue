<script setup lang="ts">
import type { TimelineStep } from '~/types'

defineProps<{ steps: TimelineStep[] }>()

/**
 * Every step shows the icon of its own status. Colour says where it stands:
 * failures red and holds amber whenever they happened, the latest event in
 * primary, earlier ones green, steps still ahead grey.
 */
function markerClass(step: TimelineStep): string {
  const { tone } = trackingStatusMeta(step.status)
  const ring = step.current ? ' ring-4' : ''
  if (tone === 'danger') return `bg-red-500 text-white ring-red-500/15${ring}`
  if (tone === 'warning') return `bg-amber-500 text-white ring-amber-500/15${ring}`
  if (step.current) return 'bg-primary text-white ring-4 ring-primary/15'
  if (step.done) return 'bg-emerald-500 text-white'
  return 'bg-gray-100 text-gray-400'
}

function titleClass(step: TimelineStep): string {
  const { tone } = trackingStatusMeta(step.status)
  if (tone === 'danger') return 'text-red-600'
  if (step.current) return 'text-primary'
  return step.done ? 'text-gray-800' : 'text-gray-400'
}
</script>

<template>
  <ol>
    <li
      v-for="(step, i) in steps"
      :key="i"
      class="flex gap-3"
    >
      <div class="flex flex-col items-center">
        <span
          class="flex size-8 shrink-0 items-center justify-center rounded-full"
          :class="markerClass(step)"
        >
          <UIcon
            :name="trackingStatusMeta(step.status).icon"
            class="size-4"
          />
        </span>
        <span
          v-if="i < steps.length - 1"
          class="my-1 min-h-6 w-0.5 flex-1"
          :class="step.done ? 'bg-emerald-500' : 'bg-gray-200'"
        />
      </div>
      <div
        class="min-w-0 flex-1 pt-1"
        :class="i < steps.length - 1 ? 'pb-6' : ''"
      >
        <p
          class="text-sm font-bold"
          :class="titleClass(step)"
        >
          {{ step.title }}
        </p>
        <p
          v-if="step.note"
          class="mt-0.5 text-sm text-gray-600"
        >
          {{ step.note }}
        </p>
        <p class="mt-0.5 text-sm text-gray-500">
          {{ step.location }}
        </p>
        <p class="mt-1 text-xs font-semibold text-gray-400">
          {{ step.time }}
        </p>
      </div>
    </li>
  </ol>
</template>
