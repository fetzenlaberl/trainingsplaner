import { distance, pointAt } from '../lines/geometry'
import type { Item, Line, Scene } from '../model/types'
import { ATTACH_DISTANCE } from './scenes'

/** An item as shown in an animation frame; opacity < 1 while fading in or out. */
export interface FrameItem extends Item {
  opacity: number
}

export interface Frame {
  items: FrameItem[]
  lines: Line[]
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
    const dEnd = distance(to, line.points[1])
    if (dStart <= ATTACH_DISTANCE && dEnd <= ATTACH_DISTANCE && dStart + dEnd < bestScore) {
      best = line
      bestScore = dStart + dEnd
    }
  }
  return best
}

function positionAt(from: Item, to: Item, path: Line | undefined, t: number) {
  if (!path) return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t }
  const [start, end] = path.points
  const onPath = pointAt(start, end, path.control, t)
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
    if (!target) return { ...item, opacity: 1 - t }
    const path = findPathLine(from.lines, item, target)
    return {
      ...item,
      ...positionAt(item, target, path, t),
      rotation: lerpAngle(item.rotation, target.rotation, t),
      size: item.size + (target.size - item.size) * t,
      opacity: 1,
    }
  })
  const existing = new Set(from.items.map((item) => item.id))
  for (const item of to.items) {
    if (!existing.has(item.id)) result.push({ ...item, opacity: t })
  }
  return result
}

/** Everything needed to draw the animation at `time` (ms). */
export function frameAt(scenes: Scene[], time: number): Frame {
  const { index, progress } = locateTime(scenes, time)
  const from = scenes[index]
  const to = scenes[index + 1]
  return {
    items: to ? interpolateScenes(from, to, progress) : from.items.map((i) => ({ ...i, opacity: 1 })),
    lines: from.lines,
    sceneIndex: index,
    progress,
  }
}
