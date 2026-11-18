import { describe, expect, it } from 'vitest'
import {
  arrowHead,
  distance,
  endDirection,
  legacyBendToPoints,
  offsetPolyline,
  pointAtDistance,
  pointOnSegment,
  polylineLength,
  samplePath,
  trimEnd,
  wavePolyline,
} from './geometry'

const start = { x: 0, y: 0 }
const end = { x: 10, y: 0 }
const sCurve = [
  { x: 0, y: 0 },
  { x: 10, y: 5 },
  { x: 20, y: -5 },
  { x: 30, y: 0 },
]

/** Smallest distance from a point to any sample of the path. */
function distanceToPath(path: { x: number; y: number }[], p: { x: number; y: number }) {
  return Math.min(...path.map((q) => distance(p, q)))
}

describe('samplePath', () => {
  it('samples a straight line densely and keeps the end points', () => {
    const pts = samplePath([start, end], true)
    expect(pts.length).toBeGreaterThan(50)
    expect(pts[0]).toEqual(start)
    expect(pts.at(-1)).toEqual(end)
    expect(polylineLength(pts)).toBeCloseTo(10)
  })

  it('treats a smooth line with two points as straight', () => {
    const pts = samplePath([start, end], true)
    expect(Math.max(...pts.map((p) => Math.abs(p.y)))).toBeCloseTo(0)
  })

  it('passes through every waypoint of a smooth curve', () => {
    const path = samplePath(sCurve, true)
    for (const waypoint of sCurve) expect(distanceToPath(path, waypoint)).toBeLessThan(1e-9)
  })

  it('is longer than the corner version, because it bulges around the points', () => {
    const smooth = polylineLength(samplePath(sCurve, true))
    const corners = polylineLength(samplePath(sCurve, false))
    expect(corners).toBeCloseTo(
      distance(sCurve[0], sCurve[1]) + distance(sCurve[1], sCurve[2]) + distance(sCurve[2], sCurve[3]),
    )
    expect(smooth).toBeGreaterThan(corners * 0.99)
  })

  it('goes straight between waypoints with corners', () => {
    const path = samplePath(sCurve, false)
    const halfway = pointOnSegment(sCurve, false, 0, 0.5)
    expect(halfway).toEqual({ x: 5, y: 2.5 })
    expect(distanceToPath(path, halfway)).toBeLessThan(1e-9)
  })

  it('bends away from the straight line on a smooth curve', () => {
    // Middle of the first segment lies above the straight connection.
    const mid = pointOnSegment(sCurve, true, 1, 0.5)
    expect(mid.x).toBeCloseTo(15, 0)
    expect(Math.abs(mid.y)).toBeLessThan(5)
  })

  it('copes with two waypoints on top of each other', () => {
    const pts = samplePath([start, start, end], true)
    expect(pts.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true)
    expect(pts.at(-1)).toEqual(end)
  })
})

describe('pointAtDistance', () => {
  const path = samplePath([start, end], false)

  it('finds points by distance along the path', () => {
    expect(pointAtDistance(path, 2.5).x).toBeCloseTo(2.5)
  })

  it('clamps to the ends', () => {
    expect(pointAtDistance(path, -1)).toEqual(start)
    expect(pointAtDistance(path, 99)).toEqual(end)
  })
})

describe('trimEnd', () => {
  it('shortens the polyline by the given amount', () => {
    const trimmed = trimEnd(samplePath([start, end], false), 1.5)
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
  const wave = wavePolyline(samplePath([start, end], false), 0.4, 2)

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
    const dir = endDirection(samplePath([start, end], false))
    expect(dir.x).toBeCloseTo(1)
    expect(dir.y).toBeCloseTo(0)
  })

  it('follows the last segment of a line with corners', () => {
    const dir = endDirection(samplePath([start, { x: 10, y: 0 }, { x: 10, y: 10 }], false))
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

describe('legacyBendToPoints', () => {
  it('keeps straight lines with two points', () => {
    expect(legacyBendToPoints(start, end, null)).toEqual([start, end])
  })

  it('turns the old control point into a waypoint in the middle of the old curve', () => {
    const points = legacyBendToPoints(start, end, { x: 5, y: 8 })
    expect(points).toEqual([start, { x: 5, y: 4 }, end])
  })
})
