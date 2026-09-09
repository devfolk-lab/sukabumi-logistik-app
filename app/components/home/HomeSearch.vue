<script setup lang="ts">
const query = ref('')

async function search() {
  const value = query.value.trim()
  if (!value) return
  await navigateTo(`/lacak/${normalizeResi(value)}`)
}
</script>

<template>
  <form
    class="flex items-center rounded-2xl bg-white p-1 shadow-card lg:shadow-card-flat"
    @submit.prevent="search"
  >
    <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-50">
      <UIcon
        name="i-lucide-search"
        class="size-4 text-primary"
      />
    </div>
    <input
      v-model="query"
      type="text"
      placeholder="Lacak pengiriman, cari rute..."
      class="flex-1 bg-transparent px-3 py-3 text-base text-gray-700 placeholder-gray-400 focus:outline-hidden"
    >
  </form>
</template>
