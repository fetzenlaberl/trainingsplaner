import { describe, expect, it } from 'vitest'
import { fitViewport, metersToPixels } from './layout'
import {
  clampView,
  defaultView,
  MAX_ZOOM,
  panBy,
  zoomAround,
  zoomedLayout,
  zoomToRect,
  type ZoomContext,
} from './zoom'

const viewport = { x: 0, y: 0, width: 100, height: 50 }
const container = { width: 1000, height: 600 }
const base = fitViewport(viewport, container.width, container.height, 0)
const ctx: ZoomContext = { viewport, container, baseScale: base.scale }

describe('zoomedLayout', () => {
  it('equals the fitted layout at zoom 1', () => {
    const layout = zoomedLayout(defaultView(viewport), ctx)
    expect(layout.scale).toBeCloseTo(base.scale)
    expect(layout.offsetX).toBeCloseTo(base.offsetX)
    expect(layout.offsetY).toBeCloseTo(base.offsetY)
  })

  it('scales with the zoom factor', () => {
    expect(zoomedLayout({ ...defaultView(viewport), zoom: 2 }, ctx).scale).toBeCloseTo(base.scale * 2)
  })
})

describe('clampView', () => {
  it('limits the zoom range', () => {
    expect(clampView({ ...defaultView(viewport), zoom: 0.2 }, ctx).zoom).toBe(1)
    expect(clampView({ ...defaultView(viewport), zoom: 50 }, ctx).zoom).toBe(MAX_ZOOM)
  })

  it('keeps the field centered while it fits completely', () => {
    expect(clampView({ zoom: 1, centerX: 90, centerY: 5 }, ctx)).toEqual(defaultView(viewport))
  })

  it('does not scroll beyond the edges when zoomed in', () => {
    const v = clampView({ zoom: 4, centerX: -50, centerY: 999 }, ctx)
    const layout = zoomedLayout(v, ctx)
    // The field's left and bottom edges stay at the container edges.
    expect(metersToPixels(layout, viewport, 0, 0).x).toBeCloseTo(0)
    expect(metersToPixels(layout, viewport, 0, 50).y).toBeCloseTo(container.height)
  })
})

describe('zoomAround', () => {
  it('keeps the point under the anchor in place', () => {
    const anchor = { x: 300, y: 200 }
    const before = zoomedLayout(defaultView(viewport), ctx)
    const meters = {
      x: viewport.x + (anchor.x - before.offsetX) / before.scale,
      y: viewport.y + (anchor.y - before.offsetY) / before.scale,
    }
    const v = zoomAround(defaultView(viewport), ctx, 2, anchor.x, anchor.y)
    const px = metersToPixels(zoomedLayout(v, ctx), viewport, meters.x, meters.y)
    expect(px.x).toBeCloseTo(anchor.x)
    expect(px.y).toBeCloseTo(anchor.y)
  })

  it('returns to the fitted view when zooming all the way out', () => {
    const zoomed = zoomAround(defaultView(viewport), ctx, 3, 100, 100)
    expect(zoomAround(zoomed, ctx, 0.01, 500, 300)).toEqual(defaultView(viewport))
  })
})

describe('panBy', () => {
  it('moves the content with the pointer when zoomed in', () => {
    const v = { ...defaultView(viewport), zoom: 3 }
    const before = zoomedLayout(v, ctx)
    const after = zoomedLayout(panBy(v, ctx, 40, -20), ctx)
    expect(after.offsetX - before.offsetX).toBeCloseTo(40)
    expect(after.offsetY - before.offsetY).toBeCloseTo(-20)
  })

  it('does nothing at zoom 1', () => {
    expect(panBy(defaultView(viewport), ctx, 200, 200)).toEqual(defaultView(viewport))
  })
})

describe('zoomToRect', () => {
  it('fills the screen with the chosen area', () => {
    // A 25 × 15 m area is 4× smaller than the 100 × 50 m viewport in width.
    const v = zoomToRect(ctx, { minX: 10, minY: 10, maxX: 35, maxY: 25 })
    expect(v.zoom).toBeCloseTo(4)
    expect(v.centerX).toBeCloseTo(22.5)
    expect(v.centerY).toBeCloseTo(17.5)
    const layout = zoomedLayout(v, ctx)
    const left = metersToPixels(layout, viewport, 10, 17.5)
    const right = metersToPixels(layout, viewport, 35, 17.5)
    expect(left.x).toBeGreaterThanOrEqual(-1e-6)
    expect(right.x).toBeLessThanOrEqual(container.width + 1e-6)
  })

  it('stays within the zoom limits for tiny areas', () => {
    expect(zoomToRect(ctx, { minX: 10, minY: 10, maxX: 10.1, maxY: 10.1 }).zoom).toBe(MAX_ZOOM)
  })

  it('shows the whole field for an area bigger than the field', () => {
    expect(zoomToRect(ctx, { minX: -50, minY: -50, maxX: 200, maxY: 200 })).toEqual(defaultView(viewport))
  })
})
