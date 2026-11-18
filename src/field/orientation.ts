import type { Rect } from './dimensions'

export type Orientation = 'landscape' | 'portrait'

/**
 * The field is always stored lying (x along the length). In portrait it is shown rotated
 * by -90°: the goal at x = 0 is at the bottom, play goes upwards, y runs from left to right.
 *
 * "View coordinates" are meters after that rotation; all fitting, zooming and pixel
 * conversion works on them.
 */
export function viewRotation(orientation: Orientation): number {
  return orientation === 'portrait' ? -90 : 0
}

export function toView(p: { x: number; y: number }, orientation: Orientation): { x: number; y: number } {
  return orientation === 'portrait' ? { x: p.y, y: -p.x } : { x: p.x, y: p.y }
}

export function fromView(p: { x: number; y: number }, orientation: Orientation): { x: number; y: number } {
  return orientation === 'portrait' ? { x: -p.y, y: p.x } : { x: p.x, y: p.y }
}

/** The visible field area (meters) in view coordinates. */
export function viewRect(viewport: Rect, orientation: Orientation): Rect {
  if (orientation === 'landscape') return viewport
  return {
    x: viewport.y,
    y: -(viewport.x + viewport.width),
    width: viewport.height,
    height: viewport.width,
  }
}
