import type { DirectiveBinding } from 'vue'
import { rippleGeometry } from '~/utils/ripple'

type RippleElement = HTMLElement & { __rippleDark?: boolean }

/**
 * A touch tap lasts ~50-80ms, shorter than the ink's fade-in, so releasing
 * on `pointerup` alone made the ripple invisible on phones. The fade-out is
 * held back until the ink has been on screen at least this long.
 */
const MIN_PRESS_MS = 250

function spawn(el: HTMLElement, event: PointerEvent, dark: boolean): void {
  const { size, left, top } = rippleGeometry(el.getBoundingClientRect(), event.clientX, event.clientY)

  const circle = document.createElement('span')
  circle.className = 'ripple-circle'
  circle.style.width = `${size}px`
  circle.style.height = `${size}px`
  circle.style.left = `${left}px`
  circle.style.top = `${top}px`
  circle.style.background = dark ? 'rgba(0, 33, 68, 0.12)' : 'rgba(255, 255, 255, 0.45)'
  el.appendChild(circle)

  // Force a layout so the `grow` transition starts from the initial state
  // this frame instead of waiting for the next animation frame.
  void circle.offsetWidth
  circle.classList.add('grow')

  const pressedAt = performance.now()
  let released = false

  const fade = () => {
    circle.classList.add('release')
    circle.addEventListener('transitionend', () => circle.remove(), { once: true })
    setTimeout(() => circle.remove(), 500)
  }

  const release = () => {
    if (released) return
    released = true
    el.removeEventListener('pointerleave', release)
    document.removeEventListener('pointerup', release)
    document.removeEventListener('pointercancel', release)

    const remaining = MIN_PRESS_MS - (performance.now() - pressedAt)
    if (remaining > 0) setTimeout(fade, remaining)
    else fade()
  }

  document.addEventListener('pointerup', release, { once: true })
  document.addEventListener('pointercancel', release, { once: true })
  el.addEventListener('pointerleave', release)
}

/**
 * `v-ripple` / `v-ripple.dark` pick the ink colour statically; `v-ripple="{
 * dark }"` picks it reactively for surfaces that flip between light and dark
 * (segmented tabs, selected cards).
 */
function isDark(binding: DirectiveBinding): boolean {
  const value = binding.value as { dark?: boolean } | boolean | undefined
  if (typeof value === 'boolean') return value
  if (value && typeof value === 'object') return Boolean(value.dark)
  return Boolean(binding.modifiers.dark)
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('ripple', {
    mounted(el: RippleElement, binding) {
      el.__rippleDark = isDark(binding)
      el.style.position = 'relative'
      el.style.overflow = 'hidden'
      el.addEventListener('pointerdown', (event: PointerEvent) => {
        if ((el as HTMLButtonElement).disabled) return
        spawn(el, event, Boolean(el.__rippleDark))
      })
    },
    updated(el: RippleElement, binding) {
      el.__rippleDark = isDark(binding)
    }
  })
})
