import { pointAtDistance, polylineLength, samplePath } from '../lines/geometry'
import type { Point, Scene } from '../model/types'

/** Axis-aligned rectangle in field meters. */
export interface FieldRect {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Rectangle spanned by any points (e.g. the corners of a screen rectangle converted to meters). */
export function rectFromPoints(points: Point[]): FieldRect {
  return {
    minX: Math.min(...points.map((p) => p.x)),
    minY: Math.min(...points.map((p) => p.y)),
    maxX: Math.max(...points.map((p) => p.x)),
    maxY: Math.max(...points.map((p) => p.y)),
  }
}

const contains = (r: FieldRect, p: Point) => p.x >= r.minX && p.x <= r.maxX && p.y >= r.minY && p.y <= r.maxY

/**
 * Elements whose middle lies in the rectangle: items and zones by their center,
 * lines by the point halfway along the line.
 */
export function elementsInRect(scene: Pick<Scene, 'items' | 'lines' | 'zones'>, rect: FieldRect, includeLocked = false): string[] {
  const ids: string[] = []
  const free = (e: { locked?: boolean }) => includeLocked || !e.locked
  for (const zone of scene.zones) if (free(zone) && contains(rect, zone)) ids.push(zone.id)
  for (const line of scene.lines) {
    if (!free(line)) continue
    const path = samplePath(line.points, line.smooth)
    if (contains(rect, pointAtDistance(path, polylineLength(path) / 2))) ids.push(line.id)
  }
  for (const item of scene.items) if (free(item) && contains(rect, item)) ids.push(item.id)
  return ids
}

/** All selectable element ids of a scene (fixed ones are left out). */
export function allElementIds(scene: Pick<Scene, 'items' | 'lines' | 'zones'>): string[] {
  return [...scene.zones, ...scene.lines, ...scene.items].filter((e) => !e.locked).map((e) => e.id)
}

/** Adds ids that are not selected yet and removes those that are (Shift/Ctrl + rectangle or click). */
export function toggleIds(selected: string[], ids: string[]): string[] {
  const result = selected.filter((id) => !ids.includes(id))
  for (const id of ids) if (!selected.includes(id)) result.push(id)
  return result
}
