import { describe, expect, it } from 'vitest'
import { getViewport } from './dimensions'
import { fitViewport, metersToPixels, pixelsToMeters } from './layout'
import { fromView, toView, viewRect, viewRotation } from './orientation'

describe('orientation', () => {
  it('leaves landscape unchanged', () => {
    const vp = getViewport('full')
    expect(viewRect(vp, 'landscape')).toEqual(vp)
    expect(toView({ x: 3, y: 4 }, 'landscape')).toEqual({ x: 3, y: 4 })
    expect(viewRotation('landscape')).toBe(0)
  })

  it('swaps width and height in portrait', () => {
    const vp = getViewport('full')
    const vr = viewRect(vp, 'portrait')
    expect([vr.width, vr.height]).toEqual([vp.height, vp.width])
  })

  it('round-trips points between field and view', () => {
    for (const p of [
      { x: 0, y: 0 },
      { x: 52.5, y: 34 },
      { x: 105, y: 68 },
      { x: -3, y: 70 },
    ]) {
      const back = fromView(toView(p, 'portrait'), 'portrait')
      expect(back.x).toBeCloseTo(p.x)
      expect(back.y).toBeCloseTo(p.y)
    }
  })

  it('puts the goal at x = 0 at the bottom and the touchline y = 0 on the left', () => {
    const vp = getViewport('full')
    const vr = viewRect(vp, 'portrait')
    const layout = fitViewport(vr, 600, 900)
    const toPixels = (x: number, y: number) => {
      const v = toView({ x, y }, 'portrait')
      return metersToPixels(layout, vr, v.x, v.y)
    }
    const ownGoal = toPixels(0, 34)
    const otherGoal = toPixels(105, 34)
    const leftTouchline = toPixels(52.5, 0)
    expect(ownGoal.y).toBeGreaterThan(otherGoal.y)
    expect(leftTouchline.x).toBeLessThan(ownGoal.x)
  })

  it('maps every corner of the field into the fitted pixel area and back', () => {
    const vp = getViewport('half')
    const vr = viewRect(vp, 'portrait')
    const layout = fitViewport(vr, 500, 800)
    for (const corner of [
      { x: vp.x, y: vp.y },
      { x: vp.x + vp.width, y: vp.y + vp.height },
    ]) {
      const v = toView(corner, 'portrait')
      const px = metersToPixels(layout, vr, v.x, v.y)
      expect(px.x).toBeGreaterThanOrEqual(-1e-6)
      expect(px.x).toBeLessThanOrEqual(500 + 1e-6)
      expect(px.y).toBeGreaterThanOrEqual(-1e-6)
      expect(px.y).toBeLessThanOrEqual(800 + 1e-6)
      const back = fromView(pixelsToMeters(layout, vr, px.x, px.y), 'portrait')
      expect(back.x).toBeCloseTo(corner.x)
      expect(back.y).toBeCloseTo(corner.y)
    }
  })
})
