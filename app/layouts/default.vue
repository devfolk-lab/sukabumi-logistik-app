<script setup lang="ts">
const route = useRoute()
const toast = useToast()
const online = useOnline()
const { drain } = useOutbox()
const { handler } = usePageRefresh()

const refreshKeys = computed<ApiKey[]>(() => route.meta.refreshKeys ?? [])

// A page that declares neither gets no gesture at all — intended for the kirim
// wizard, where a stray pull mid-draft would be hostile.
const pullDisabled = computed(() => refreshKeys.value.length === 0 && !handler.value)

async function pullRefresh() {
  if (!online.value) {
    toast.add({
      title: 'Tidak ada koneksi',
      description: 'Data akan diperbarui setelah kembali online.',
      color: 'warning'
    })
    return
  }

  await drain()
  await Promise.all([
    refreshKeys.value.length ? invalidateApiData(refreshKeys.value) : Promise.resolve(),
    handler.value ? handler.value() : Promise.resolve()
  ])
}
</script>

<template>
  <div class="min-h-screen bg-[#f8f9fb]">
    <AppOfflineBanner />
    <AppSidebar />
    <div class="w-full lg:ml-68 lg:w-[calc(100%-17rem)]">
      <div class="relative mx-auto min-h-screen w-full md:max-lg:max-w-105 md:max-lg:overflow-hidden md:max-lg:shadow-2xl">
        <AppPullToRefresh
          :refresh="pullRefresh"
          :disabled="pullDisabled"
        >
          <div class="animate-page-in pb-28">
            <slot />
          </div>
        </AppPullToRefresh>
      </div>
    </div>
    <AppBottomNav />
  </div>
</template>
