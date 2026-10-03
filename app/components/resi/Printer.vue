<script setup lang="ts">
import type { Order } from '~/types'

/**
 * Prints an order's shipping label, or saves it as a PDF, from whatever page
 * it sits on — nothing navigates. The label is only mounted for the duration
 * of the job, and never shows on screen.
 *
 * - Print: the label goes into a sheet at the end of `<body>`, and a
 *   stylesheet that exists only for this job hides every other child of
 *   `<body>` (the app, toasts) and sets the 100 × 150 mm page.
 * - PDF: the label is mounted off screen at exactly 100 mm wide — the page
 *   around it may be narrower on a phone, and it would wrap differently.
 */
const props = defineProps<{
  order: Order
}>()

const mode = ref<'cetak' | 'unduh' | null>(null)
const sheet = useTemplateRef('sheet')
const offscreen = useTemplateRef('offscreen')

const PRINT_CSS = `
@page { size: 100mm 150mm; margin: 0; }
@media print {
  html, body { background: #fff !important; }
  body > :not(.resi-print-sheet) { display: none !important; }
}`

/**
 * Undoes a print job. Runs on `afterprint`; a browser that never fires it
 * (some mobile ones) is cleaned up by the next job instead. Nothing it leaves
 * behind shows on screen, since the sheet is hidden and the CSS print-only.
 */
let endPrint: (() => void) | null = null

async function print(): Promise<void> {
  endPrint?.()
  if (mode.value) return
  mode.value = 'cetak'
  await nextTick()
  if (!sheet.value) {
    mode.value = null
    throw new Error('Label tidak ter-render')
  }
  await waitForImages(sheet.value)

  const style = document.createElement('style')
  style.textContent = PRINT_CSS
  document.head.append(style)

  const done = () => {
    window.removeEventListener('afterprint', done)
    style.remove()
    mode.value = null
    endPrint = null
  }
  endPrint = done
  window.addEventListener('afterprint', done)

  // Blocks until the dialog closes on desktop; returns at once on Android,
  // which is why the sheet is only removed on `afterprint`.
  window.print()
}

async function download(): Promise<void> {
  endPrint?.()
  if (mode.value) return
  mode.value = 'unduh'
  try {
    await nextTick()
    const label = offscreen.value?.querySelector<HTMLElement>('.label')
    if (!label) throw new Error('Label tidak ter-render')
    await downloadLabelPdf(label, `resi-${props.order.awb ?? props.order.orderNo}.pdf`)
  } finally {
    mode.value = null
  }
}

onBeforeUnmount(() => endPrint?.())

defineExpose({ print, download })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="mode === 'cetak'"
      ref="sheet"
      class="resi-print-sheet hidden print:block"
    >
      <ResiLabel :order="order" />
    </div>
  </Teleport>
  <div
    v-if="mode === 'unduh'"
    ref="offscreen"
    aria-hidden="true"
    class="pointer-events-none fixed top-0 left-[-10000px] w-[100mm] print:hidden"
  >
    <ResiLabel :order="order" />
  </div>
</template>
