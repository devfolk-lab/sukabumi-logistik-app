<script setup lang="ts">
/**
 * A first-run walkthrough: dims the screen, cuts a spotlight around one
 * element at a time and explains it in a card beside it. Targets are found by
 * `data-tour="<target>"`, so the page only tags its elements.
 *
 * With `welcome`, it opens on a centred greeting over the dimmed screen and
 * only moves to the first spotlight when the user chooses to start.
 *
 * It runs once per account on this device — finishing or skipping both mark
 * it seen in localStorage. Storage can be missing (private mode, cleared site
 * data); the tour then simply shows again next time, which is harmless.
 *
 * Deliberately dependency-free: the spotlight is a box-shadow around a
 * positioned box, and both it and the card are re-measured every frame while
 * open, so they follow the page through scrolling and through skeletons
 * turning into content.
 */
export interface TourStep {
  target: string
  title: string
  body: string
}

export interface TourWelcome {
  title: string
  body: string
}

const props = withDefaults(defineProps<{
  steps: TourStep[]
  /** Identifies this tour in storage; bump it to show a changed tour again. */
  name: string
  /** A centred greeting shown before the first step. */
  welcome?: TourWelcome
  /** Wait before starting, so the page transition and first paint settle. */
  delay?: number
}>(), { welcome: undefined, delay: 700 })

const authUser = useAuthUser()
const storageKey = computed(() => `suklog:tour:${props.name}:${authUser.value?.id ?? 'anon'}`)

function seen(): boolean {
  try {
    return localStorage.getItem(storageKey.value) === '1'
  } catch {
    return false
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(storageKey.value, '1')
  } catch {
    // Nothing to do: the tour shows again next time.
  }
}

const active = ref(false)
/** On the welcome card, before any spotlight. */
const intro = ref(false)
const index = ref(0)
const step = computed(() => props.steps[index.value])
const isLast = computed(() => index.value === props.steps.length - 1)

const PAD = 8
const GAP = 14
const GUTTER = 16

interface Box { top: number, left: number, width: number, height: number }
const spot = ref<Box | null>(null)
const card = ref<HTMLElement | null>(null)
const cardPos = ref({ top: 0, left: 0 })

function targetEl(): HTMLElement | null {
  const target = step.value?.target
  return target ? document.querySelector<HTMLElement>(`[data-tour="${target}"]`) : null
}

function same(a: Box | null, b: Box): boolean {
  return a !== null && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height
}

// Off for the first frames so the spotlight and card appear in place rather
// than sliding in from the corner; on afterwards so steps glide between targets.
const settled = ref(false)
let settleTimer: ReturnType<typeof setTimeout> | undefined

function measure(): void {
  const el = targetEl()
  if (!el) return
  const r = el.getBoundingClientRect()
  const box = {
    top: Math.round(r.top - PAD),
    left: Math.round(r.left - PAD),
    width: Math.round(r.width + PAD * 2),
    height: Math.round(r.height + PAD * 2)
  }
  if (!same(spot.value, box)) spot.value = box

  // Below the spotlight when it fits, otherwise above; centred on it and
  // kept inside the screen edges.
  const vw = window.innerWidth
  const vh = window.innerHeight
  const cw = card.value?.offsetWidth ?? 320
  const ch = card.value?.offsetHeight ?? 180
  const below = box.top + box.height + GAP
  const top = below + ch <= vh - GUTTER ? below : Math.max(GUTTER, box.top - GAP - ch)
  const left = Math.min(Math.max(box.left + box.width / 2 - cw / 2, GUTTER), vw - cw - GUTTER)
  if (cardPos.value.top !== top || cardPos.value.left !== left) cardPos.value = { top, left }

  if (!settled.value && !settleTimer) settleTimer = setTimeout(() => (settled.value = true), 100)
}

let frame = 0
function track(): void {
  measure()
  frame = requestAnimationFrame(track)
}

/** Brings the step's element to the middle of the screen; skips missing ones. */
function show(i: number): void {
  index.value = i
  const el = targetEl()
  if (!el) {
    if (i < props.steps.length - 1) show(i + 1)
    else finish()
    return
  }
  el.scrollIntoView({ block: 'center', behavior: 'smooth' })
}

function start(): void {
  if (!props.steps.length) return
  active.value = true
  if (props.welcome) {
    intro.value = true
    return
  }
  begin()
}

/** Leaves the welcome card (if any) for the first spotlight. */
function begin(): void {
  intro.value = false
  show(0)
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(track)
}

function finish(): void {
  markSeen()
  active.value = false
  intro.value = false
  spot.value = null
  settled.value = false
  clearTimeout(settleTimer)
  settleTimer = undefined
  cancelAnimationFrame(frame)
}

function next(): void {
  if (isLast.value) finish()
  else show(index.value + 1)
}

function back(): void {
  if (index.value > 0) show(index.value - 1)
}

function onKey(event: KeyboardEvent): void {
  if (!active.value) return
  if (event.key === 'Escape') finish()
  else if (intro.value) {
    if (event.key === 'ArrowRight' || event.key === 'Enter') begin()
  } else if (event.key === 'ArrowRight') next()
  else if (event.key === 'ArrowLeft') back()
}

let timer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  window.addEventListener('keydown', onKey)
  if (!seen()) timer = setTimeout(start, props.delay)
})

onBeforeUnmount(() => {
  clearTimeout(timer)
  clearTimeout(settleTimer)
  cancelAnimationFrame(frame)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-300"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="active && step"
        class="fixed inset-0 z-[100] touch-none"
        role="dialog"
        aria-modal="true"
        :aria-label="intro && welcome ? welcome.title : step.title"
        @wheel.prevent
      >
        <!-- Swallows taps so nothing under the dim layer reacts. -->
        <div class="absolute inset-0" />

        <!-- Welcome: the whole screen dimmed, the greeting in the middle. -->
        <Transition
          enter-active-class="transition duration-300 ease-out"
          leave-active-class="transition duration-200 ease-in"
          enter-from-class="opacity-0 scale-95"
          leave-to-class="opacity-0 scale-95"
        >
          <div
            v-if="intro && welcome"
            class="absolute inset-0 flex items-center justify-center bg-[rgb(0_15_31/0.62)] p-4"
          >
            <div class="w-[min(24rem,100%)] overflow-hidden rounded-3xl bg-white text-center shadow-2xl">
              <div class="relative overflow-hidden bg-linear-135 from-[#002144] via-[#003366] to-[#004080] px-6 pt-8 pb-6">
                <div class="absolute top-0 right-0 size-40 -translate-y-1/3 translate-x-1/4 rounded-full bg-white/5" />
                <div class="absolute bottom-0 left-0 size-28 translate-y-1/3 -translate-x-1/4 rounded-full bg-white/5" />
                <div class="relative mx-auto flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10">
                  <UIcon
                    name="i-lucide-package"
                    class="size-8 text-white"
                  />
                </div>
              </div>
              <div class="px-6 pt-5 pb-6">
                <h2 class="text-xl font-bold text-gray-800">
                  {{ welcome.title }}
                </h2>
                <p class="mt-2 text-sm leading-relaxed text-gray-500">
                  {{ welcome.body }}
                </p>
                <p class="mt-3 text-xs font-semibold text-primary">
                  {{ steps.length }} langkah singkat
                </p>
                <div class="mt-5 flex flex-col gap-2">
                  <UButton
                    v-ripple
                    size="xl"
                    block
                    class="font-bold"
                    trailing-icon="i-lucide-arrow-right"
                    @click="begin"
                  >
                    Mulai Tur
                  </UButton>
                  <UButton
                    v-ripple.dark
                    color="neutral"
                    variant="ghost"
                    size="lg"
                    block
                    class="font-semibold text-gray-400"
                    @click="finish"
                  >
                    Lewati
                  </UButton>
                </div>
              </div>
            </div>
          </div>
        </Transition>

        <div
          v-if="spot && !intro"
          class="pointer-events-none absolute rounded-2xl ring-2 ring-white/70"
          :class="settled ? 'transition-all duration-300 ease-out' : ''"
          :style="{
            top: `${spot.top}px`,
            left: `${spot.left}px`,
            width: `${spot.width}px`,
            height: `${spot.height}px`,
            boxShadow: '0 0 0 9999px rgb(0 15 31 / 0.62)'
          }"
        />

        <div
          v-show="!intro"
          ref="card"
          class="absolute w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-white p-4 shadow-2xl"
          :class="settled ? 'transition-[top,left] duration-300 ease-out' : 'invisible'"
          :style="{ top: `${cardPos.top}px`, left: `${cardPos.left}px` }"
        >
          <div class="flex items-center justify-between gap-2">
            <p class="text-xs font-bold uppercase tracking-wider text-primary">
              {{ index + 1 }} dari {{ steps.length }}
            </p>
            <div class="flex gap-1">
              <span
                v-for="(_, i) in steps"
                :key="i"
                class="h-1.5 rounded-full transition-all duration-300"
                :class="i === index ? 'w-4 bg-primary' : 'w-1.5 bg-gray-200'"
              />
            </div>
          </div>
          <h3 class="mt-2 text-base font-bold text-gray-800">
            {{ step.title }}
          </h3>
          <p class="mt-1 text-sm leading-relaxed text-gray-500">
            {{ step.body }}
          </p>

          <div class="mt-4 flex items-center justify-between gap-2">
            <button
              v-ripple.dark
              type="button"
              class="rounded-lg px-2 py-1.5 text-sm font-semibold text-gray-400 hover:text-gray-600"
              @click="finish"
            >
              Lewati
            </button>
            <div class="flex gap-2">
              <UButton
                v-if="index > 0"
                v-ripple.dark
                color="neutral"
                variant="ghost"
                class="font-bold"
                @click="back"
              >
                Kembali
              </UButton>
              <UButton
                v-ripple
                class="font-bold"
                @click="next"
              >
                {{ isLast ? 'Selesai' : 'Lanjut' }}
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
