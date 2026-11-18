import type { Rect } from './dimensions'
import type { Layout } from './layout'

export const MIN_ZOOM = 1
export const MAX_ZOOM = 5

/** Screen-only zoom: zoom factor and the point (meters) shown in the middle of the container. */
export interface ViewState {
  zoom: number
  centerX: number
  centerY: number
}

export interface ZoomContext {
  viewport: Rect
  container: { width: number; height: number }
  /** Pixels per meter when the whole viewport fits (zoom 1) */
  baseScale: number
}

export function defaultView(viewport: Rect): ViewState {
  return {
    zoom: 1,
    centerX: viewport.x + viewport.width / 2,
    centerY: viewport.y + viewport.height / 2,
  }
}

function clampAxis(center: number, start: number, length: number, visible: number): number {
  // If everything fits, keep it centered; otherwise do not show beyond the edges.
  if (visible >= length) return start + length / 2
  return Math.min(Math.max(center, start + visible / 2), start + length - visible / 2)
}

/** Keeps the zoom in range and the field on screen. */
export function clampView(view: ViewState, { viewport, container, baseScale }: ZoomContext): ViewState {
  const zoom = Math.min(Math.max(view.zoom, MIN_ZOOM), MAX_ZOOM)
  const scale = baseScale * zoom
  return {
    zoom,
    centerX: clampAxis(view.centerX, viewport.x, viewport.width, container.width / scale),
    centerY: clampAxis(view.centerY, viewport.y, viewport.height, container.height / scale),
  }
}

/** Meter-to-pixel layout for a (clamped) view. */
export function zoomedLayout(view: ViewState, ctx: ZoomContext): Layout {
  const v = clampView(view, ctx)
  const scale = ctx.baseScale * v.zoom
  return {
    scale,
    offsetX: ctx.container.width / 2 - (v.centerX - ctx.viewport.x) * scale,
    offsetY: ctx.container.height / 2 - (v.centerY - ctx.viewport.y) * scale,
  }
}

/** Zooms by `factor` while keeping the point under (anchorX, anchorY) pixels in place. */
export function zoomAround(
  view: ViewState,
  ctx: ZoomContext,
  factor: number,
  anchorX: number,
  anchorY: number,
): ViewState {
  const layout = zoomedLayout(view, ctx)
  const anchorM = {
    x: ctx.viewport.x + (anchorX - layout.offsetX) / layout.scale,
    y: ctx.viewport.y + (anchorY - layout.offsetY) / layout.scale,
  }
  const zoom = Math.min(Math.max(clampView(view, ctx).zoom * factor, MIN_ZOOM), MAX_ZOOM)
  const scale = ctx.baseScale * zoom
  return clampView(
    {
      zoom,
      centerX: anchorM.x - (anchorX - ctx.container.width / 2) / scale,
      centerY: anchorM.y - (anchorY - ctx.container.height / 2) / scale,
    },
    ctx,
  )
}

/** Moves the view by a pixel distance (content follows the finger or mouse). */
export function panBy(view: ViewState, ctx: ZoomContext, dx: number, dy: number): ViewState {
  const v = clampView(view, ctx)
  const scale = ctx.baseScale * v.zoom
  return clampView({ zoom: v.zoom, centerX: v.centerX - dx / scale, centerY: v.centerY - dy / scale }, ctx)
}
