<script setup lang="ts">
import logoFull from '~/assets/img/logo-full.png'

withDefaults(defineProps<{ variant?: 'full' | 'mark' }>(), { variant: 'full' })
</script>

<template>
  <img
    v-if="variant === 'full'"
    :src="logoFull"
    alt="Sukabumi Logistik"
    class="h-auto w-auto"
  >
  <span
    v-else
    class="flex items-center gap-3"
  >
    <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-linear-135 from-[#002144] via-[#003366] to-[#004080]">
      <UIcon
        name="i-lucide-package"
        class="size-5 text-white"
      />
    </span>
    <span class="min-w-0">
      <span class="block truncate text-base font-extrabold leading-tight text-white">SUKABUMI</span>
      <span class="block truncate text-xs font-bold tracking-wide text-secondary">LOGISTIK</span>
    </span>
  </span>
</template>
