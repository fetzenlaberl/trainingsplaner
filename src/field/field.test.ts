import { describe, expect, it } from 'vitest'
import { FIELD_TYPES, getViewport, PITCH, RUNOFF } from './dimensions'
import { fitViewport, metersToPixels } from './layout'
import { arcPoints, getGoals, getPitchMarkings } from './markings'

describe('getViewport', () => {
  it('shows the whole pitch plus runoff for the full field', () => {
    expect(getViewport('full')).toEqual({
      x: -RUNOFF,
      y: -RUNOFF,
      width: 105 + 2 * RUNOFF,
      height: 68 + 2 * RUNOFF,
    })
  })

  it('ends the half field at the halfway line', () => {
    const v = getViewport('half')
    expect(v.x + v.width).toBe(PITCH.length / 2)
  })

  it('contains the penalty area and the penalty arc in the penalty view', () => {
    const v = getViewport('penalty')
    const arcEnd = PITCH.penaltySpotDistance + PITCH.penaltyArcRadius
    expect(v.x).toBeLessThanOrEqual(-PITCH.goalDepth)
    expect(v.x + v.width).toBeGreaterThan(arcEnd)
    expect(v.y).toBeLessThan(PITCH.width / 2 - PITCH.penaltyAreaWidth / 2)
    expect(v.y + v.height).toBeGreaterThan(PITCH.width / 2 + PITCH.penaltyAreaWidth / 2)
  })

  it('returns a positive area for every field type', () => {
    for (const type of FIELD_TYPES) {
      const v = getViewport(type)
      expect(v.width).toBeGreaterThan(0)
      expect(v.height).toBeGreaterThan(0)
    }
  })
})

describe('fitViewport', () => {
  const viewport = { x: 0, y: 0, width: 100, height: 50 }

  it('is limited by width in a tall container and centers vertically', () => {
    const layout = fitViewport(viewport, 1000, 1000)
    expect(layout.scale).toBe(10)
    expect(layout.offsetX).toBe(0)
    expect(layout.offsetY).toBe(250)
  })

  it('is limited by height in a wide container and centers horizontally', () => {
    const layout = fitViewport(viewport, 2000, 500)
    expect(layout.scale).toBe(10)
    expect(layout.offsetX).toBe(500)
    expect(layout.offsetY).toBe(0)
  })

  it('respects padding', () => {
    const layout = fitViewport(viewport, 1020, 1000, 10)
    expect(layout.scale).toBe(10)
    expect(layout.offsetX).toBe(10)
  })

  it('never returns a negative scale for tiny containers', () => {
    expect(fitViewport(viewport, 5, 5, 10).scale).toBe(0)
  })
})

describe('metersToPixels', () => {
  it('maps viewport corners to the fitted pixel area', () => {
    const viewport = { x: -5, y: -5, width: 100, height: 50 }
    const layout = fitViewport(viewport, 1000, 1000)
    expect(metersToPixels(layout, viewport, -5, -5)).toEqual({ x: 0, y: 250 })
    expect(metersToPixels(layout, viewport, 95, 45)).toEqual({ x: 1000, y: 750 })
  })
})

describe('markings', () => {
  it('starts and ends arcs at the requested angles', () => {
    const pts = arcPoints(0, 0, 2, 0, 90, 4)
    expect(pts[0]).toBeCloseTo(2)
    expect(pts[1]).toBeCloseTo(0)
    expect(pts.at(-2)).toBeCloseTo(0)
    expect(pts.at(-1)).toBeCloseTo(2)
  })

  it('draws the outer boundary at 105 x 68 m', () => {
    expect(getPitchMarkings()[0]).toEqual({ kind: 'rect', x: 0, y: 0, width: 105, height: 68 })
  })

  it('places penalty spots 11 m from each goal line', () => {
    const spots = getPitchMarkings().filter((m) => m.kind === 'spot')
    const xs = spots.map((s) => (s.kind === 'spot' ? s.x : NaN)).sort((a, b) => a - b)
    expect(xs).toEqual([11, 52.5, 94])
  })

  it('starts the penalty arcs exactly on the penalty area line', () => {
    const arcs = getPitchMarkings().filter(
      (m) => m.kind === 'line' && m.points.length > 4 && m.points.length < 100,
    )
    const leftArc = arcs.find((m) => m.kind === 'line' && Math.abs(m.points[0] - 16.5) < 1e-9)
    expect(leftArc).toBeDefined()
  })

  it('places goals centered behind both goal lines', () => {
    const [left, right] = getGoals()
    expect(left.x + left.width).toBe(0)
    expect(right.x).toBe(105)
    expect(left.y + left.height / 2).toBe(34)
    expect(left.height).toBeCloseTo(7.32)
  })
})
