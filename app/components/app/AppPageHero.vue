<script setup lang="ts">
withDefaults(defineProps<{ sticky?: boolean }>(), { sticky: false })
</script>

<template>
  <div
    class="relative overflow-hidden bg-linear-135 from-[#002144] via-[#003366] to-[#004080] px-6 pt-14 pb-10 lg:rounded-none lg:px-12 lg:pt-10 lg:pb-8"
    :class="[
      sticky ? 'sticky top-0 z-30 lg:static' : '',
      'rounded-b-[2rem]'
    ]"
  >
    <div class="absolute top-0 right-0 size-72 -translate-y-1/3 translate-x-1/4 rounded-full bg-white/5 lg:hidden" />
    <div class="absolute bottom-0 left-0 size-48 translate-y-1/3 -translate-x-1/4 rounded-full bg-secondary/10 lg:hidden" />
    <div class="relative z-10 lg:mx-auto lg:max-w-4xl">
      <slot />
    </div>
  </div>
</template>
