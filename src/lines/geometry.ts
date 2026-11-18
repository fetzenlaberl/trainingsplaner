import type { Point } from '../model/types'

/** Distance between two sample points along the path, in meters. */
const SAMPLE_STEP = 0.1
/** Avoids division by zero for waypoints on top of each other. */
const EPSILON = 1e-6

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function lerp(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/**
 * Point on the centripetal Catmull-Rom segment from p1 to p2 (t in [0, 1]).
 * Centripetal parametrisation avoids loops and overshoots with unevenly spaced points.
 */
function catmullRom(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const t0 = 0
  const t1 = t0 + Math.max(Math.sqrt(distance(p0, p1)), EPSILON)
  const t2 = t1 + Math.max(Math.sqrt(distance(p1, p2)), EPSILON)
  const t3 = t2 + Math.max(Math.sqrt(distance(p2, p3)), EPSILON)
  const tt = t1 + (t2 - t1) * t
  const a1 = lerp(p0, p1, (tt - t0) / (t1 - t0))
  const a2 = lerp(p1, p2, (tt - t1) / (t2 - t1))
  const a3 = lerp(p2, p3, (tt - t2) / (t3 - t2))
  const b1 = lerp(a1, a2, (tt - t0) / (t2 - t0))
  const b2 = lerp(a2, a3, (tt - t1) / (t3 - t1))
  return lerp(b1, b2, (tt - t1) / (t2 - t1))
}

/** Neighbouring points of segment i; the ends are mirrored so the curve starts straight. */
function segmentNeighbours(points: Point[], i: number): [Point, Point, Point, Point] {
  const p1 = points[i]
  const p2 = points[i + 1]
  const p0 = i > 0 ? points[i - 1] : { x: 2 * p1.x - p2.x, y: 2 * p1.y - p2.y }
  const p3 = i + 2 < points.length ? points[i + 2] : { x: 2 * p2.x - p1.x, y: 2 * p2.y - p1.y }
  return [p0, p1, p2, p3]
}

/** Point on segment i (between waypoint i and i + 1) at t in [0, 1]. */
export function pointOnSegment(points: Point[], smooth: boolean, i: number, t: number): Point {
  if (!smooth || points.length === 2) return lerp(points[i], points[i + 1], t)
  const [p0, p1, p2, p3] = segmentNeighbours(points, i)
  return catmullRom(p0, p1, p2, p3, t)
}

/**
 * Samples the path through all waypoints densely, so it can be drawn, turned into waves
 * or parallel lines, and followed in the animation. `smooth` curves through the points,
 * otherwise straight segments with corners.
 */
export function samplePath(points: Point[], smooth: boolean): Point[] {
  const result: Point[] = [points[0]]
  for (let i = 0; i < points.length - 1; i++) {
    const rough = distance(points[i], points[i + 1]) * (smooth ? 1.3 : 1)
    const steps = Math.max(1, Math.ceil(rough / SAMPLE_STEP))
    for (let s = 1; s <= steps; s++) result.push(pointOnSegment(points, smooth, i, s / steps))
  }
  return result
}

export function polylineLength(points: Point[]): number {
  let length = 0
  for (let i = 1; i < points.length; i++) length += distance(points[i - 1], points[i])
  return length
}

/** Point at the given distance (meters) along the polyline, clamped to its ends. */
export function pointAtDistance(points: Point[], target: number): Point {
  if (target <= 0) return points[0]
  let travelled = 0
  for (let i = 1; i < points.length; i++) {
    const segment = distance(points[i - 1], points[i])
    if (travelled + segment >= target) {
      return lerp(points[i - 1], points[i], segment === 0 ? 0 : (target - travelled) / segment)
    }
    travelled += segment
  }
  return points[points.length - 1]
}

/** Cuts the polyline so it ends `amount` meters before its last point. */
export function trimEnd(points: Point[], amount: number): Point[] {
  let remaining = amount
  for (let i = points.length - 1; i > 0; i--) {
    const segment = distance(points[i - 1], points[i])
    if (segment >= remaining) {
      const t = segment === 0 ? 0 : (segment - remaining) / segment
      return [...points.slice(0, i), lerp(points[i - 1], points[i], t)]
    }
    remaining -= segment
  }
  return [points[0]]
}

/** Unit normal (pointing left of the travel direction) at each vertex. */
function normals(points: Point[]): Point[] {
  return points.map((_, i) => {
    const a = points[Math.max(0, i - 1)]
    const b = points[Math.min(points.length - 1, i + 1)]
    const len = distance(a, b) || 1
    return { x: -(b.y - a.y) / len, y: (b.x - a.x) / len }
  })
}

/** Shifts the polyline sideways by `offset` meters. */
export function offsetPolyline(points: Point[], offset: number): Point[] {
  const n = normals(points)
  return points.map((p, i) => ({ x: p.x + n[i].x * offset, y: p.y + n[i].y * offset }))
}

/**
 * Turns the polyline into a sine wave around it. The amplitude fades out at both ends
 * so the wave starts and ends on the path.
 */
export function wavePolyline(points: Point[], amplitude: number, wavelength: number): Point[] {
  const n = normals(points)
  const total = polylineLength(points)
  const fade = Math.min(wavelength / 2, total / 2)
  let travelled = 0
  return points.map((p, i) => {
    if (i > 0) travelled += distance(points[i - 1], p)
    const envelope = fade > 0 ? Math.min(1, travelled / fade, (total - travelled) / fade) : 0
    const offset = amplitude * envelope * Math.sin((2 * Math.PI * travelled) / wavelength)
    return { x: p.x + n[i].x * offset, y: p.y + n[i].y * offset }
  })
}

/** Unit direction of travel at the end of a sampled path. */
export function endDirection(path: Point[]): Point {
  const end = path[path.length - 1]
  const total = polylineLength(path)
  // Look a short distance back, so tiny last sample steps do not distort the direction.
  const from = pointAtDistance(path, Math.max(0, total - Math.min(0.5, total / 4)))
  const len = distance(from, end)
  if (len < EPSILON) return { x: 1, y: 0 }
  return { x: (end.x - from.x) / len, y: (end.y - from.y) / len }
}

/** Triangle [tip, left, right] for an arrowhead at `tip` pointing in `dir`. */
export function arrowHead(tip: Point, dir: Point, length: number, width: number): Point[] {
  const base = { x: tip.x - dir.x * length, y: tip.y - dir.y * length }
  const half = width / 2
  return [
    tip,
    { x: base.x - dir.y * half, y: base.y + dir.x * half },
    { x: base.x + dir.y * half, y: base.y - dir.x * half },
  ]
}

/** Converts the old single-bend line (quadratic Bézier) into waypoints: start, curve middle, end. */
export function legacyBendToPoints(start: Point, end: Point, control: Point | null): Point[] {
  if (!control) return [start, end]
  const mid = {
    x: 0.25 * start.x + 0.5 * control.x + 0.25 * end.x,
    y: 0.25 * start.y + 0.5 * control.y + 0.25 * end.y,
  }
  return [start, mid, end]
}

export function flatten(points: Point[]): number[] {
  return points.flatMap((p) => [p.x, p.y])
}
