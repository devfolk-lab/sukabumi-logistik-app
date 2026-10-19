<script setup lang="ts">
/** Add-to-Home-Screen steps for iOS, which has no install prompt to call. */
const { showIosInstall } = useInstallApp()
</script>

<template>
  <AppDialog
    v-model:open="showIosInstall"
    title="Pasang di iPhone / iPad"
    description="Pemasangan di iOS dilakukan lewat menu Bagikan."
  >
    <template #body>
      <ol class="space-y-3 p-5 text-sm text-gray-600">
        <li class="flex items-start gap-3">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary-50">
            <UIcon
              name="i-lucide-share"
              class="size-4 text-primary"
            />
          </span>
          <span class="pt-1.5">Tap tombol <span class="font-semibold text-gray-800">Bagikan</span> di bilah Safari.</span>
        </li>
        <li class="flex items-start gap-3">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary-50">
            <UIcon
              name="i-lucide-square-plus"
              class="size-4 text-primary"
            />
          </span>
          <span class="pt-1.5">Pilih <span class="font-semibold text-gray-800">Tambahkan ke Layar Utama</span>.</span>
        </li>
        <li class="flex items-start gap-3">
          <span class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary-50">
            <UIcon
              name="i-lucide-smartphone"
              class="size-4 text-primary"
            />
          </span>
          <span class="pt-1.5">Tap <span class="font-semibold text-gray-800">Tambah</span>, lalu buka SukLog dari layar utama.</span>
        </li>
      </ol>
    </template>
  </AppDialog>
</template>
