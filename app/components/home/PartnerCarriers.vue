<script setup lang="ts">
</script>

<template>
  <div>
    <h2 class="mb-3 text-base font-bold text-gray-800">
      Mitra Pengiriman
    </h2>
    <div class="rounded-3xl bg-white p-5 shadow-card lg:shadow-card-flat">
      <div class="grid grid-cols-5 gap-x-2 gap-y-5 lg:grid-cols-10">
        <NuxtLink
          v-for="partner in PARTNER_BADGES"
          :key="partner.label"
          to="/kirim"
          class="flex cursor-pointer flex-col items-center gap-1.5"
        >
          <span
            v-ripple
            class="flex size-12 items-center justify-center rounded-full shadow-xs"
            :style="{ backgroundColor: partner.color }"
          >
            <span
              v-if="partner.initials"
              class="pointer-events-none text-sm font-bold"
              :class="partner.textClass"
            >{{ partner.initials }}</span>
            <UIcon
              v-else-if="partner.icon"
              :name="partner.icon"
              class="pointer-events-none size-4"
              :class="partner.textClass"
            />
          </span>
          <span class="text-sm font-semibold text-gray-500">{{ partner.label }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
