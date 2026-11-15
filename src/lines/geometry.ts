import type { Point } from '../model/types'

/** Distance between two sample points along the path, in meters. */
const SAMPLE_STEP = 0.1

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/** Point on a quadratic Bézier curve (or straight line if control is null) at t in [0, 1]. */
export function pointAt(start: Point, end: Point, control: Point | null, t: number): Point {
  if (!control) {
    return { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t }
  }
  const u = 1 - t
  return {
    x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
    y: u * u * start.y + 2 * u * t * control.y + t * t * end.y,
  }
}

/** Samples the path densely so it can be turned into waves or parallel lines. */
export function samplePath(start: Point, end: Point, control: Point | null): Point[] {
  const roughLength = control
    ? distance(start, control) + distance(control, end)
    : distance(start, end)
  const segments = Math.max(1, Math.ceil(roughLength / SAMPLE_STEP))
  const points: Point[] = []
  for (let i = 0; i <= segments; i++) points.push(pointAt(start, end, control, i / segments))
  return points
}

export function polylineLength(points: Point[]): number {
  let length = 0
  for (let i = 1; i < points.length; i++) length += distance(points[i - 1], points[i])
  return length
}

/** Cuts the polyline so it ends `amount` meters before its last point. */
export function trimEnd(points: Point[], amount: number): Point[] {
  let remaining = amount
  for (let i = points.length - 1; i > 0; i--) {
    const segment = distance(points[i - 1], points[i])
    if (segment >= remaining) {
      const t = segment === 0 ? 0 : (segment - remaining) / segment
      const cut = {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
      }
      return [...points.slice(0, i), cut]
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

/** Unit direction of travel at the end of the path. */
export function endDirection(start: Point, end: Point, control: Point | null): Point {
  const from = control && distance(control, end) > 1e-9 ? control : start
  const len = distance(from, end) || 1
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

/** Point on the curve at t = 0.5, where the bend handle sits. */
export function curveMidpoint(start: Point, end: Point, control: Point | null): Point {
  return pointAt(start, end, control, 0.5)
}

/** Control point that makes the curve pass through `mid` at t = 0.5. */
export function controlFromMidpoint(start: Point, end: Point, mid: Point): Point {
  return {
    x: 2 * mid.x - (start.x + end.x) / 2,
    y: 2 * mid.y - (start.y + end.y) / 2,
  }
}

export function flatten(points: Point[]): number[] {
  return points.flatMap((p) => [p.x, p.y])
}
