import type { Rect } from './dimensions'

export interface Layout {
  /** Pixels per meter */
  scale: number
  /** Pixel position of the viewport's top-left corner */
  offsetX: number
  offsetY: number
}

/**
 * Fits a viewport (meters) into a container (pixels) while keeping the aspect ratio,
 * centered, with an optional pixel padding on each side.
 */
export function fitViewport(
  viewport: Rect,
  containerWidth: number,
  containerHeight: number,
  padding = 0,
): Layout {
  const availableWidth = Math.max(containerWidth - 2 * padding, 0)
  const availableHeight = Math.max(containerHeight - 2 * padding, 0)
  const scale = Math.min(availableWidth / viewport.width, availableHeight / viewport.height)
  return {
    scale,
    offsetX: (containerWidth - viewport.width * scale) / 2,
    offsetY: (containerHeight - viewport.height * scale) / 2,
  }
}

/** Converts a point in meters to pixels. */
export function metersToPixels(
  layout: Layout,
  viewport: Rect,
  x: number,
  y: number,
): { x: number; y: number } {
  return {
    x: layout.offsetX + (x - viewport.x) * layout.scale,
    y: layout.offsetY + (y - viewport.y) * layout.scale,
  }
}

/** Converts a point in pixels to meters. */
export function pixelsToMeters(
  layout: Layout,
  viewport: Rect,
  px: number,
  py: number,
): { x: number; y: number } {
  return {
    x: viewport.x + (px - layout.offsetX) / layout.scale,
    y: viewport.y + (py - layout.offsetY) / layout.scale,
  }
}

export function isInsideRect(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}

/** Clamps a point so it stays inside the rectangle. */
export function clampToRect(rect: Rect, x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(Math.max(x, rect.x), rect.x + rect.width),
    y: Math.min(Math.max(y, rect.y), rect.y + rect.height),
  }
}
