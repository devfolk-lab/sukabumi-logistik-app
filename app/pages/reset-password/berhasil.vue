<script setup lang="ts">
definePageMeta({ layout: 'auth' })
</script>

<template>
  <div class="text-center">
    <div class="mx-auto flex size-16 items-center justify-center rounded-3xl bg-emerald-50">
      <UIcon
        name="i-lucide-circle-check-big"
        class="size-8 text-emerald-600"
      />
    </div>
    <h1 class="mt-6 text-2xl font-extrabold text-gray-800">
      Password berhasil diubah
    </h1>
    <p class="mt-2 text-sm text-gray-500">
      Kamu bisa masuk sekarang menggunakan password barumu.
    </p>

    <UButton
      to="/login"
      size="xl"
      block
      class="mt-7 font-bold"
    >
      Masuk Sekarang
    </UButton>
  </div>
</template>
