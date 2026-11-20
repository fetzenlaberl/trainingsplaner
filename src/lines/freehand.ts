// Freehand strokes (finger or Apple Pencil): recorded points are thinned out so the
// line stays light to store and smooth to draw.

import type { LineType, Point } from '../model/types'

/** Points closer than this (meters) to the previous one are not recorded while drawing. */
export const MIN_POINT_DISTANCE = 0.25
/** Deviation (meters) that the simplified stroke may have from the drawn one. */
export const SIMPLIFY_TOLERANCE = 0.2

export function isFreehand(type: LineType): boolean {
  return type === 'free' || type === 'freeArrow'
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

/** Ramer–Douglas–Peucker: keeps the points that matter for the shape. Start and end always stay. */
export function simplifyPath(points: Point[], tolerance = SIMPLIFY_TOLERANCE): Point[] {
  if (points.length <= 2) return points
  const keep = new Array<boolean>(points.length).fill(false)
  keep[0] = true
  keep[points.length - 1] = true
  const stack: [number, number][] = [[0, points.length - 1]]
  while (stack.length > 0) {
    const [first, last] = stack.pop()!
    let maxDistance = 0
    let index = -1
    for (let i = first + 1; i < last; i++) {
      const d = distanceToSegment(points[i], points[first], points[last])
      if (d > maxDistance) {
        maxDistance = d
        index = i
      }
    }
    if (index >= 0 && maxDistance > tolerance) {
      keep[index] = true
      stack.push([first, index], [index, last])
    }
  }
  return points.filter((_, i) => keep[i])
}

/** Adds a point while drawing, unless it is too close to the last one. Returns the same array if nothing changed. */
export function addStrokePoint(points: Point[], point: Point): Point[] {
  const last = points[points.length - 1]
  if (last && Math.hypot(point.x - last.x, point.y - last.y) < MIN_POINT_DISTANCE) return points
  return [...points, point]
}

/** Total length of a stroke in meters. */
export function strokeLength(points: Point[]): number {
  let length = 0
  for (let i = 1; i < points.length; i++) length += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y)
  return length
}
