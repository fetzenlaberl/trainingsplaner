import { describe, expect, it } from 'vitest'
import {
  arrowHead,
  controlFromMidpoint,
  curveMidpoint,
  distance,
  endDirection,
  offsetPolyline,
  pointAt,
  polylineLength,
  samplePath,
  trimEnd,
  wavePolyline,
} from './geometry'

const start = { x: 0, y: 0 }
const end = { x: 10, y: 0 }

describe('pointAt / samplePath', () => {
  it('interpolates a straight line linearly', () => {
    expect(pointAt(start, end, null, 0.25)).toEqual({ x: 2.5, y: 0 })
  })

  it('starts and ends a curve at its end points', () => {
    const control = { x: 5, y: 8 }
    expect(pointAt(start, end, control, 0)).toEqual(start)
    expect(pointAt(start, end, control, 1)).toEqual(end)
  })

  it('samples densely and keeps the end points', () => {
    const pts = samplePath(start, end, null)
    expect(pts.length).toBeGreaterThan(50)
    expect(pts[0]).toEqual(start)
    expect(pts.at(-1)).toEqual(end)
    expect(polylineLength(pts)).toBeCloseTo(10)
  })

  it('makes a curve longer than the straight line', () => {
    expect(polylineLength(samplePath(start, end, { x: 5, y: 8 }))).toBeGreaterThan(10)
  })
})

describe('trimEnd', () => {
  it('shortens the polyline by the given amount', () => {
    const trimmed = trimEnd(samplePath(start, end, null), 1.5)
    expect(trimmed.at(-1)!.x).toBeCloseTo(8.5)
    expect(polylineLength(trimmed)).toBeCloseTo(8.5)
  })

  it('collapses to the first point if trimmed more than its length', () => {
    expect(trimEnd([start, end], 20)).toEqual([start])
  })
})

describe('offsetPolyline', () => {
  it('shifts a horizontal line sideways', () => {
    const shifted = offsetPolyline([start, end], 0.5)
    expect(shifted[0].y).toBeCloseTo(0.5)
    expect(shifted[1].y).toBeCloseTo(0.5)
    expect(shifted[1].x).toBeCloseTo(10)
  })
})

describe('wavePolyline', () => {
  const path = samplePath(start, end, null)
  const wave = wavePolyline(path, 0.4, 2)

  it('starts and ends on the path', () => {
    expect(wave[0].y).toBeCloseTo(0)
    expect(wave.at(-1)!.y).toBeCloseTo(0)
  })

  it('never exceeds the amplitude and actually waves', () => {
    const ys = wave.map((p) => p.y)
    expect(Math.max(...ys)).toBeLessThanOrEqual(0.4 + 1e-9)
    expect(Math.max(...ys)).toBeGreaterThan(0.3)
    expect(Math.min(...ys)).toBeLessThan(-0.3)
  })
})

describe('endDirection / arrowHead', () => {
  it('points along a straight line', () => {
    expect(endDirection(start, end, null)).toEqual({ x: 1, y: 0 })
  })

  it('follows the curve tangent at the end', () => {
    const dir = endDirection(start, end, { x: 10, y: -10 })
    expect(dir.x).toBeCloseTo(0)
    expect(dir.y).toBeCloseTo(1)
  })

  it('builds a symmetric triangle behind the tip', () => {
    const [tip, left, right] = arrowHead(end, { x: 1, y: 0 }, 1, 0.8)
    expect(tip).toEqual(end)
    expect(left.x).toBeCloseTo(9)
    expect(right.x).toBeCloseTo(9)
    expect(Math.abs(left.y - right.y)).toBeCloseTo(0.8)
  })
})

describe('curve handle', () => {
  it('sits in the middle of a straight line', () => {
    expect(curveMidpoint(start, end, null)).toEqual({ x: 5, y: 0 })
  })

  it('round-trips: the curve passes through the dragged handle position', () => {
    const handle = { x: 4, y: 3 }
    const control = controlFromMidpoint(start, end, handle)
    expect(distance(curveMidpoint(start, end, control), handle)).toBeCloseTo(0)
  })
})
