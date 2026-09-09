export interface RippleRect {
  left: number
  top: number
  width: number
  height: number
}

export interface RippleGeometry {
  size: number
  left: number
  top: number
}

export function rippleGeometry(rect: RippleRect, clientX: number, clientY: number): RippleGeometry {
  const x = clientX - rect.left
  const y = clientY - rect.top
  const dx = Math.max(x, rect.width - x)
  const dy = Math.max(y, rect.height - y)
  const size = Math.hypot(dx, dy) * 2

  return { size, left: x - size / 2, top: y - size / 2 }
}
