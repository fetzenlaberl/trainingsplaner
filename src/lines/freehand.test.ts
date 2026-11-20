import { describe, expect, it } from 'vitest'
import { addStrokePoint, isFreehand, simplifyPath, strokeLength } from './freehand'

describe('simplifyPath', () => {
  it('removes points on a straight stroke but keeps start and end', () => {
    const points = Array.from({ length: 50 }, (_, i) => ({ x: i * 0.3, y: 2 + (i % 2) * 0.05 }))
    const simple = simplifyPath(points)
    expect(simple).toHaveLength(2)
    expect(simple[0]).toEqual(points[0])
    expect(simple[1]).toEqual(points[49])
  })

  it('keeps corners of a bent stroke', () => {
    const points = [
      ...Array.from({ length: 20 }, (_, i) => ({ x: i * 0.5, y: 0 })),
      ...Array.from({ length: 20 }, (_, i) => ({ x: 9.5, y: (i + 1) * 0.5 })),
    ]
    const simple = simplifyPath(points)
    expect(simple).toHaveLength(3)
    expect(simple[1]).toEqual({ x: 9.5, y: 0 })
  })

  it('leaves very short strokes alone', () => {
    const two = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ]
    expect(simplifyPath(two)).toBe(two)
  })
})

describe('addStrokePoint', () => {
  it('skips points that are too close to the previous one', () => {
    const start = [{ x: 0, y: 0 }]
    expect(addStrokePoint(start, { x: 0.1, y: 0 })).toBe(start)
    expect(addStrokePoint(start, { x: 1, y: 0 })).toHaveLength(2)
  })
})

describe('freehand helpers', () => {
  it('measures strokes and recognizes freehand types', () => {
    expect(
      strokeLength([
        { x: 0, y: 0 },
        { x: 3, y: 4 },
        { x: 3, y: 5 },
      ]),
    ).toBe(6)
    expect(isFreehand('free')).toBe(true)
    expect(isFreehand('freeArrow')).toBe(true)
    expect(isFreehand('pass')).toBe(false)
  })
})
