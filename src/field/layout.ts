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
