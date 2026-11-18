import { distance, pointAtDistance, polylineLength, samplePath } from '../lines/geometry'
import type { Item, Line, Scene, Zone } from '../model/types'
import { ATTACH_DISTANCE } from './scenes'

/** An item as shown in an animation frame; opacity < 1 while fading in or out. */
export interface FrameItem extends Item {
  opacity: number
  /** Strength of the highlight ring, 0..1 (fades between scenes) */
  glow: number
}

const glowOf = (item: Item) => (item.highlight ? 1 : 0)

/** A zone as shown in an animation frame; opacity < 1 while fading in or out. */
export interface FrameZone extends Zone {
  opacity: number
}

export interface Frame {
  items: FrameItem[]
  lines: Line[]
  zones: FrameZone[]
  /** Scene the current transition starts from */
  sceneIndex: number
  /** Progress of the transition, 0..1 */
  progress: number
}

/** Total animation length: each scene's duration is its transition to the next scene. */
export function totalDuration(scenes: Scene[]): number {
  let total = 0
  for (let i = 0; i < scenes.length - 1; i++) total += scenes[i].durationMs
  return total
}

/** Time (ms) at which the given scene is reached. */
export function sceneStartTime(scenes: Scene[], index: number): number {
  let time = 0
  for (let i = 0; i < Math.min(index, scenes.length - 1); i++) time += scenes[i].durationMs
  return time
}

/** Finds the transition that is running at `time`. */
export function locateTime(scenes: Scene[], time: number): { index: number; progress: number } {
  let start = 0
  for (let i = 0; i < scenes.length - 1; i++) {
    const end = start + scenes[i].durationMs
    if (time < end) return { index: i, progress: Math.max(0, (time - start) / scenes[i].durationMs) }
    start = end
  }
  return { index: scenes.length - 1, progress: 0 }
}

/** Interpolates an angle in degrees along the shorter way round. */
export function lerpAngle(from: number, to: number, t: number): number {
  const diff = ((((to - from) % 360) + 540) % 360) - 180
  return (((from + diff * t) % 360) + 360) % 360
}

/** The line an item travels along: it starts near the line's start and ends near its end. */
export function findPathLine(lines: Line[], from: Item, to: Item): Line | undefined {
  let best: Line | undefined
  let bestScore = Infinity
  for (const line of lines) {
    const dStart = distance(from, line.points[0])
    const dEnd = distance(to, line.points[line.points.length - 1])
    if (dStart <= ATTACH_DISTANCE && dEnd <= ATTACH_DISTANCE && dStart + dEnd < bestScore) {
      best = line
      bestScore = dStart + dEnd
    }
  }
  return best
}

function positionAt(from: Item, to: Item, path: Line | undefined, t: number) {
  if (!path) return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
  const start = path.points[0]
  const end = path.points[path.points.length - 1]
  // Follow the line at constant speed (by distance), also through tight bends.
  const sampled = samplePath(path.points, path.smooth)
  const onPath = pointAtDistance(sampled, t * polylineLength(sampled))
  // Blend out the small offsets between item and line ends so start and end positions are exact.
  return {
    x: onPath.x + (from.x - start.x) * (1 - t) + (to.x - end.x) * t,
    y: onPath.y + (from.y - start.y) * (1 - t) + (to.y - end.y) * t,
  }
}

/** Item states between two scenes at progress t (0..1). */
export function interpolateScenes(from: Scene, to: Scene, t: number): FrameItem[] {
  const targets = new Map(to.items.map((item) => [item.id, item]))
  const result: FrameItem[] = from.items.map((item) => {
    const target = targets.get(item.id)
    if (!target) return { ...item, opacity: 1 - t, glow: glowOf(item) }
    const path = findPathLine(from.lines, item, target)
    return {
      ...item,
      ...positionAt(item, target, path, t),
      rotation: lerpAngle(item.rotation, target.rotation, t),
      size: item.size + (target.size - item.size) * t,
      glow: glowOf(item) + (glowOf(target) - glowOf(item)) * t,
      opacity: 1,
    }
  })
  const existing = new Set(from.items.map((item) => item.id))
  for (const item of to.items) {
    if (!existing.has(item.id)) result.push({ ...item, opacity: t, glow: glowOf(item) })
  }
  return result
}

/** Zone states between two scenes: position, size and rotation change evenly; others fade. */
export function interpolateZones(from: Zone[], to: Zone[], t: number): FrameZone[] {
  const targets = new Map(to.map((zone) => [zone.id, zone]))
  const lerp = (a: number, b: number) => a + (b - a) * t
  const result: FrameZone[] = from.map((zone) => {
    const target = targets.get(zone.id)
    if (!target) return { ...zone, opacity: 1 - t }
    return {
      ...zone,
      x: lerp(zone.x, target.x),
      y: lerp(zone.y, target.y),
      width: lerp(zone.width, target.width),
      height: lerp(zone.height, target.height),
      rotation: lerpAngle(zone.rotation, target.rotation, t),
      opacity: 1,
    }
  })
  const existing = new Set(from.map((zone) => zone.id))
  for (const zone of to) {
    if (!existing.has(zone.id)) result.push({ ...zone, opacity: t })
  }
  return result
}

/** Everything needed to draw the animation at `time` (ms). */
export function frameAt(scenes: Scene[], time: number): Frame {
  const { index, progress } = locateTime(scenes, time)
  const from = scenes[index]
  const to = scenes[index + 1]
  return {
    items: to
      ? interpolateScenes(from, to, progress)
      : from.items.map((i) => ({ ...i, opacity: 1, glow: glowOf(i) })),
    lines: from.lines,
    zones: to ? interpolateZones(from.zones, to.zones, progress) : from.zones.map((z) => ({ ...z, opacity: 1 })),
    sceneIndex: index,
    progress,
  }
}
