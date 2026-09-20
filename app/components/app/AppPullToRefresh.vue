<script setup lang="ts">
const props = defineProps<{
  /** Runs on release past the threshold. The indicator holds until it settles. */
  refresh: () => Promise<void>
  disabled?: boolean
}>()

/** Translated pixels, not finger pixels — the drag is damped by half. */
const THRESHOLD = 64
const MAX = 80
const HOLD = 56

const root = useTemplateRef<HTMLElement>('root')
const distance = ref(0)
const refreshing = ref(false)
const tracking = ref(false)
const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')

let startY = 0
let startX = 0
let active = false

const progress = computed(() => Math.min(distance.value / THRESHOLD, 1))
const visible = computed(() => distance.value > 0 || refreshing.value)

// Reduced motion keeps the spinner but stops the content sliding.
const offset = computed(() => (reduced.value ? 0 : distance.value))

const contentStyle = computed(() => ({
  transform: `translateY(${offset.value}px)`,
  transition: tracking.value ? 'none' : 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)'
}))

const indicatorStyle = computed(() => ({
  transform: `translateY(${Math.max(offset.value, refreshing.value ? HOLD : 0) - 44}px)`,
  transition: tracking.value ? 'none' : 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  opacity: visible.value ? 1 : 0
}))

function onTouchStart(event: TouchEvent) {
  if (props.disabled || refreshing.value) return

  const touch = event.touches[0]
  if (!touch) return

  // A sheet locks body scroll, so scrollY stays 0 while the user drags inside
  // it — without this, dragging in the alamat form would refresh the page.
  if ((event.target as Element | null)?.closest('[role="dialog"]')) return
  if (window.scrollY > 0) return

  startY = touch.clientY
  startX = touch.clientX
  active = true
}

function onTouchMove(event: TouchEvent) {
  if (!active) return

  const touch = event.touches[0]
  if (!touch) return

  const dy = touch.clientY - startY
  const dx = touch.clientX - startX

  // Horizontal drags belong to the segmented tabs and carousels.
  if (!tracking.value && Math.abs(dx) > Math.abs(dy)) {
    active = false
    return
  }

  if (dy <= 0) {
    if (!tracking.value) active = false
    return
  }

  tracking.value = true
  // Claim the gesture so the page neither scrolls nor triggers the browser's
  // own refresh. Requires the non-passive listener registered below.
  if (event.cancelable) event.preventDefault()
  distance.value = Math.min(dy * 0.5, MAX)
}

async function onTouchEnd() {
  if (!active) return
  active = false

  if (!tracking.value) return
  tracking.value = false

  if (distance.value < THRESHOLD) {
    distance.value = 0
    return
  }

  refreshing.value = true
  distance.value = HOLD

  try {
    await props.refresh()
  } finally {
    refreshing.value = false
    distance.value = 0
  }
}

// `{ passive: false }` is what makes preventDefault legal in onTouchMove.
useEventListener(root, 'touchstart', onTouchStart, { passive: true })
useEventListener(root, 'touchmove', onTouchMove, { passive: false })
useEventListener(root, 'touchend', onTouchEnd, { passive: true })
useEventListener(root, 'touchcancel', onTouchEnd, { passive: true })
</script>

<template>
  <div ref="root">
    <div
      class="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center"
      :style="indicatorStyle"
    >
      <span class="flex size-9 items-center justify-center rounded-full bg-white shadow-card">
        <UIcon
          name="i-lucide-refresh-cw"
          class="size-4 text-primary"
          :class="refreshing ? 'animate-spin' : ''"
          :style="refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }"
        />
      </span>
    </div>

    <div :style="contentStyle">
      <slot />
    </div>
  </div>
</template>
