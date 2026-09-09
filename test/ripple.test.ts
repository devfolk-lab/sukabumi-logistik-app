import { describe, expect, it } from 'vitest'
import { rippleGeometry } from '~/utils/ripple'

const rect = { left: 0, top: 0, width: 100, height: 100 }

describe('rippleGeometry', () => {
  it('covers the whole element when pressed dead centre', () => {
    const { size } = rippleGeometry(rect, 50, 50)
    expect(size).toBeCloseTo(Math.hypot(50, 50) * 2)
  })

  it('grows to reach the far corner when pressed at an edge', () => {
    const { size } = rippleGeometry(rect, 0, 0)
    expect(size).toBeCloseTo(Math.hypot(100, 100) * 2)
  })

  it('centres the circle on the press point', () => {
    const { size, left, top } = rippleGeometry(rect, 50, 50)
    expect(left).toBeCloseTo(50 - size / 2)
    expect(top).toBeCloseTo(50 - size / 2)
  })

  it('accounts for the element offset within the viewport', () => {
    const offset = { left: 20, top: 10, width: 100, height: 100 }
    const { left, top, size } = rippleGeometry(offset, 70, 60)
    expect(left).toBeCloseTo(50 - size / 2)
    expect(top).toBeCloseTo(50 - size / 2)
  })
})
