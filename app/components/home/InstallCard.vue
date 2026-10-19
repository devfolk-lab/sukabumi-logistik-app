<script setup lang="ts">
/** Offers installing the app on home until it is installed or dismissed. */
const { canInstall, install, dismissed, dismiss } = useInstallApp()
</script>

<template>
  <AppPageContent
    v-if="canInstall && !dismissed"
    class="mt-4"
  >
    <div class="flex items-center gap-3 rounded-3xl bg-white p-4 shadow-card lg:shadow-card-flat">
      <span class="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50">
        <UIcon
          name="i-lucide-download"
          class="size-5 text-primary"
        />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-bold text-gray-800">
          Pasang aplikasi SukLog
        </p>
        <p class="text-xs text-gray-500">
          Lebih cepat dibuka dan tetap bisa dipakai saat offline.
        </p>
      </div>
      <UButton
        v-ripple
        size="sm"
        class="shrink-0 font-bold"
        @click="install"
      >
        Pasang
      </UButton>
      <UButton
        v-ripple.dark
        size="sm"
        color="neutral"
        variant="ghost"
        icon="i-lucide-x"
        class="shrink-0"
        aria-label="Tutup"
        @click="dismiss"
      />
    </div>
  </AppPageContent>
</template>
