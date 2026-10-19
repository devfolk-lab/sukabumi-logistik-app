<script setup lang="ts">
// Viewport, icons and `lang` are in `app.head` (nuxt.config.ts): they have to
// be in the shell the server sends, which this component never touches.

const title = 'Sukabumi Logistik'
const description = 'Layanan multi-ekspedisi dan solusi pengiriman untuk individu, UMKM, dan bisnis di Sukabumi.'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator
      color="#d4a124"
      :height="3"
    />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
