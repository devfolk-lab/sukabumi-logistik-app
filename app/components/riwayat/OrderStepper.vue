<script setup lang="ts">
defineProps<{ completed: number }>()

const steps = ['Dibuat', 'Dijemput', 'Dikirim', 'Diterima'] as const
</script>

<template>
  <div class="flex items-start justify-between">
    <template
      v-for="(step, i) in steps"
      :key="step"
    >
      <div class="flex flex-1 flex-col items-center">
        <span
          class="flex size-8 items-center justify-center rounded-full text-[13px] font-bold transition-colors"
          :class="i < completed ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'"
        >{{ i + 1 }}</span>
        <p class="mt-2 text-center text-xs leading-tight font-semibold text-gray-500">
          {{ step }}
        </p>
      </div>
      <div
        v-if="i < steps.length - 1"
        class="mt-4 h-0.5 flex-1"
        :class="i < completed - 1 ? 'bg-emerald-500' : 'bg-gray-200'"
      />
    </template>
  </div>
</template>
