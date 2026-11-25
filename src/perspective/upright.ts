// Upright items in the perspective view: the ground (pitch, zones, drawn lines and items
// drawn from above, like goals or ladders) is tilted as a picture; players, dummies and
// other standing items are drawn on top, untilted, at the projected spot of their feet
// and smaller towards the back.

import type { Rect } from '../field/dimensions'
import { toView, viewRect, type Orientation } from '../field/orientation'
import type { ItemType } from '../model/types'
import { fitProjected, projectPointScaled, type Point2 } from './perspective'

/** Items that stand upright in the perspective view; all others lie on the ground. */
export const STANDING_TYPES: readonly ItemType[] = [
  'player',
  'coach',
  'ball',
  'cone',
  'pole',
  'flag',
  'dummy',
  'poleDummy',
  'figureDummy',
  'figure',
  'flagPole',
  'discPole',
  'goalFront',
  'minigoalFront',
  'marker',
  'text',
  'textbox',
  'crest',
]

export function isStanding(type: ItemType): boolean {
  return STANDING_TYPES.includes(type)
}

/** Screen spot of a field point and the pixels per meter there. */
export interface Projected {
  x: number
  y: number
  /** Pixels per meter at this spot */
  scale: number
}

export type FieldProjector = (x: number, y: number) => Projected

/** How the flat field picture is laid out (as in FieldView). */
export interface FlatLayout {
  viewport: Rect
  orientation: Orientation
  /** Pixels per meter of the flat picture */
  scale: number
  offsetX: number
  offsetY: number
  /** Size of the flat picture in pixels */
  width: number
  height: number
}

/** Pixel position of a field point (meters) in the flat picture. */
export function fieldToFlat(layout: FlatLayout, x: number, y: number): Point2 {
  const view = toView({ x, y }, layout.orientation)
  const corner = viewRect(layout.viewport, layout.orientation)
  return {
    x: layout.offsetX + (view.x - corner.x) * layout.scale,
    y: layout.offsetY + (view.y - corner.y) * layout.scale,
  }
}

/**
 * Maps field points onto the tilted picture fitted into outWidth × outHeight,
 * exactly like the CSS view and the export warp.
 */
export function makeProjector(
  layout: FlatLayout,
  tiltDeg: number,
  outWidth: number,
  outHeight: number,
  turnDeg = 0,
): FieldProjector {
  const fit = fitProjected(layout.width, layout.height, tiltDeg, outWidth, outHeight, turnDeg)
  return (x, y) => {
    const flat = fieldToFlat(layout, x, y)
    const p = projectPointScaled(flat.x, flat.y, layout.width, layout.height, tiltDeg, turnDeg)
    return {
      x: outWidth / 2 + fit.offsetX + p.x * fit.scale,
      y: outHeight / 2 + fit.offsetY + p.y * fit.scale,
      scale: layout.scale * fit.scale * p.scale,
    }
  }
}

/** Direction (degrees, screen) of a field direction at a point, after the tilt. */
export function projectedRotation(project: FieldProjector, x: number, y: number, rotationDeg: number): number {
  const rad = (rotationDeg * Math.PI) / 180
  const a = project(x, y)
  const b = project(x + Math.cos(rad), y + Math.sin(rad))
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
}

/**
 * Tip of a freely dragged bubble tail for the upright bubble, so that it still points at the
 * same spot of the field (e.g. a player). `tip` is relative to the middle of the flat bubble,
 * which is turned by the item and kept upright against the view (`viewRotationDeg`).
 */
export function projectedTailTip(
  project: FieldProjector,
  item: { x: number; y: number; rotation: number; size: number },
  tip: Point2,
  viewRotationDeg: number,
): Point2 {
  const flat = turn(tip, item.rotation - viewRotationDeg)
  const at = project(item.x, item.y)
  const target = project(item.x + flat.x * item.size, item.y + flat.y * item.size)
  const unit = at.scale * item.size
  return turn({ x: (target.x - at.x) / unit, y: (target.y - at.y) / unit }, -item.rotation)
}

function turn(p: Point2, degrees: number): Point2 {
  const rad = (degrees * Math.PI) / 180
  return { x: p.x * Math.cos(rad) - p.y * Math.sin(rad), y: p.x * Math.sin(rad) + p.y * Math.cos(rad) }
}
