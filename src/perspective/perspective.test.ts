import { describe, expect, it } from 'vitest'
import {
  affineFromTriangles,
  applyAffine,
  fitProjected,
  projectedBounds,
  projectPoint,
  warpedSize,
  normalizeTurn,
} from './perspective'

const W = 1000
const H = 600

describe('projectPoint', () => {
  it('keeps the center in place', () => {
    const p = projectPoint(W / 2, H / 2, W, H, 45)
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(0)
  })

  it('makes the far (top) edge narrower than the near (bottom) edge', () => {
    const topWidth = projectPoint(W, 0, W, H, 45).x - projectPoint(0, 0, W, H, 45).x
    const bottomWidth = projectPoint(W, H, W, H, 45).x - projectPoint(0, H, W, H, 45).x
    expect(topWidth).toBeLessThan(W)
    expect(bottomWidth).toBeGreaterThan(topWidth)
  })

  it('squeezes the image vertically', () => {
    const b = projectedBounds(W, H, 45)
    expect(b.maxY - b.minY).toBeLessThan(H)
  })

  it('is symmetric left to right', () => {
    const left = projectPoint(0, 100, W, H, 30)
    const right = projectPoint(W, 100, W, H, 30)
    expect(left.x).toBeCloseTo(-right.x)
    expect(left.y).toBeCloseTo(right.y)
  })

  it('does nothing at tilt 0', () => {
    const p = projectPoint(100, 50, W, H, 0)
    expect(p.x).toBeCloseTo(100 - W / 2)
    expect(p.y).toBeCloseTo(50 - H / 2)
  })

  it('tilts more strongly with a bigger angle', () => {
    const height = (tilt: number) => {
      const b = projectedBounds(W, H, tilt)
      return b.maxY - b.minY
    }
    expect(height(60)).toBeLessThan(height(30))
  })
})

describe('fitProjected / warpedSize', () => {
  it('fits the tilted image into the target area, centered', () => {
    const { scale, offsetX, offsetY } = fitProjected(W, H, 45, 800, 500)
    const b = projectedBounds(W, H, 45)
    const left = scale * b.minX + offsetX
    const right = scale * b.maxX + offsetX
    const top = scale * b.minY + offsetY
    const bottom = scale * b.maxY + offsetY
    expect(right - left).toBeLessThanOrEqual(800 + 1e-6)
    expect(bottom - top).toBeLessThanOrEqual(500 + 1e-6)
    expect(left + right).toBeCloseTo(0)
    expect(top + bottom).toBeCloseTo(0)
  })

  it('keeps the export width and computes an even height', () => {
    const size = warpedSize(W, H, 45)
    expect(size.width).toBe(W)
    expect(size.height % 2).toBe(0)
    expect(size.height).toBeLessThan(H)
  })
})

describe('affineFromTriangles', () => {
  it('maps the three source corners exactly onto the destination corners', () => {
    const src: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ]
    const dst: typeof src = [
      { x: 5, y: 5 },
      { x: 20, y: 8 },
      { x: 3, y: 30 },
    ]
    const m = affineFromTriangles(src, dst)
    src.forEach((p, i) => {
      const q = applyAffine(m, p)
      expect(q.x).toBeCloseTo(dst[i].x)
      expect(q.y).toBeCloseTo(dst[i].y)
    })
  })

  it('falls back to identity for a degenerate triangle', () => {
    const p = { x: 1, y: 1 }
    expect(affineFromTriangles([p, p, p], [p, p, p])).toEqual([1, 0, 0, 1, 0, 0])
  })
})

describe('turning the 3D view', () => {
  const W = 400
  const H = 300

  it('keeps the old view without a turn', () => {
    expect(projectPoint(10, 20, W, H, 45, 0)).toEqual(projectPoint(10, 20, W, H, 45))
  })

  it('shows the pitch from the other side at 180°', () => {
    // The top left corner comes to the bottom right (near the viewer).
    const turned = projectPoint(0, 0, W, H, 45, 180)
    const plain = projectPoint(W, H, W, H, 45)
    expect(turned.x).toBeCloseTo(plain.x)
    expect(turned.y).toBeCloseTo(plain.y)
  })

  it('fits the turned picture', () => {
    const b = projectedBounds(W, H, 0, 90)
    expect(b.maxX - b.minX).toBeCloseTo(H)
    expect(b.maxY - b.minY).toBeCloseTo(W)
    const fit = fitProjected(W, H, 45, 800, 600, 30)
    expect(fit.scale).toBeGreaterThan(0)
    expect(warpedSize(W, H, 45, 90).width).toBe(W)
  })

  it('keeps turns between -180 and 180', () => {
    expect(normalizeTurn(190)).toBe(-170)
    expect(normalizeTurn(-190)).toBe(170)
    expect(normalizeTurn(360)).toBe(0)
    expect(normalizeTurn(45)).toBe(45)
  })
})
