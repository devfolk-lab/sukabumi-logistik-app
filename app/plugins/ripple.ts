import { rippleGeometry } from '~/utils/ripple'

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

  requestAnimationFrame(() => circle.classList.add('grow'))

  let released = false
  const release = () => {
    if (released) return
    released = true
    circle.classList.add('release')
    circle.addEventListener('transitionend', () => circle.remove(), { once: true })
    setTimeout(() => circle.remove(), 500)
    el.removeEventListener('pointerleave', release)
  }

  document.addEventListener('pointerup', release, { once: true })
  document.addEventListener('pointercancel', release, { once: true })
  el.addEventListener('pointerleave', release)
}

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.directive('ripple', {
    mounted(el: HTMLElement, binding) {
      el.style.position = 'relative'
      el.style.overflow = 'hidden'
      el.addEventListener('pointerdown', (event: PointerEvent) => {
        spawn(el, event, Boolean(binding.modifiers.dark))
      })
    }
  })
})
