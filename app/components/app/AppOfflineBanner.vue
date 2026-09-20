<script setup lang="ts">
const online = useOnline()
const route = useRoute()
const { pending } = useOutbox()

/** The keys this screen actually shows, so the timestamp describes what is on it. */
const keys = computed<ApiKey[]>(() => {
  const declared = route.meta.refreshKeys
  return declared?.length ? declared : [...API_KEYS]
})

/** The oldest of them — the honest answer to "how old is this screen?". */
const oldest = computed(() => {
  const stamps = keys.value
    .map(key => fetchedAtState[key])
    .filter((at): at is number => typeof at === 'number')
  return stamps.length ? Math.min(...stamps) : null
})

const updatedAt = computed(() => {
  if (!oldest.value) return null
  return new Date(oldest.value).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
})
</script>

<template>
  <Transition
    enter-active-class="transition-transform duration-300"
    leave-active-class="transition-transform duration-300"
    enter-from-class="-translate-y-full"
    leave-to-class="-translate-y-full"
  >
    <div
      v-if="!online"
      class="sticky top-0 z-40 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-xs font-semibold text-white"
    >
      <UIcon
        name="i-lucide-cloud-off"
        class="size-4 shrink-0"
      />
      <span>
        Mode offline
        <template v-if="updatedAt">— data terakhir diperbarui {{ updatedAt }}</template>
        <template v-if="pending.length"> · {{ pending.length }} perubahan menunggu sinkron</template>
      </span>
    </div>
  </Transition>
</template>
