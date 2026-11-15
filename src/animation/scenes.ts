import { distance } from '../lines/geometry'
import type { Item, ItemType, LineType, Point, Scene } from '../model/types'

/** An item counts as standing at a line's start (or end) within this distance (meters). */
export const ATTACH_DISTANCE = 2

/** Which item types move along which line type when a new scene is created. */
const MOVERS: Record<LineType, ItemType[]> = {
  pass: ['ball'],
  shot: ['ball'],
  run: ['player'],
  dribble: ['player', 'ball'],
}

function nearestItem(items: Item[], type: ItemType, point: Point, exclude: Set<string>) {
  let best: Item | undefined
  let bestDistance = ATTACH_DISTANCE
  for (const item of items) {
    if (item.type !== type || exclude.has(item.id)) continue
    const d = distance(item, point)
    if (d <= bestDistance) {
      best = item
      bestDistance = d
    }
  }
  return best
}

/**
 * Creates the scene that follows `scene`: same items (same ids), no lines, and every
 * ball/player standing at the start of a matching line moved to that line's end.
 */
export function nextSceneFrom(scene: Scene): Scene {
  const targets = new Map<string, Point>()
  for (const line of scene.lines) {
    for (const type of MOVERS[line.type]) {
      const item = nearestItem(scene.items, type, line.points[0], new Set(targets.keys()))
      if (item) targets.set(item.id, line.points[1])
    }
  }
  return {
    durationMs: scene.durationMs,
    items: scene.items.map((item) => {
      const target = targets.get(item.id)
      return target ? { ...item, x: target.x, y: target.y } : item
    }),
    lines: [],
  }
}
