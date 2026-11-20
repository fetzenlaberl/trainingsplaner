import type { Point, Zone, ZoneGoals, ZoneShape } from '../model/types'

export interface ZoneTemplate {
  key: string
  name: string
  shape: ZoneShape
  goals: ZoneGoals
  /** Start size in meters */
  width: number
  height: number
  /** Uneven start shape (see Zone.corners) */
  corners?: Point[]
}

export const ZONE_TEMPLATES: ZoneTemplate[] = [
  { key: 'zone-rect', name: 'Rechteck', shape: 'rect', goals: 0, width: 20, height: 15 },
  { key: 'zone-triangle', name: 'Dreieck', shape: 'triangle', goals: 0, width: 20, height: 17 },
  { key: 'zone-ellipse', name: 'Kreis', shape: 'ellipse', goals: 0, width: 18, height: 18 },
  {
    key: 'zone-rhombus',
    name: 'Raute',
    shape: 'rect',
    goals: 0,
    width: 20,
    height: 16,
    corners: [
      { x: 0, y: -8 },
      { x: 10, y: 0 },
      { x: 0, y: 8 },
      { x: -10, y: 0 },
    ],
  },
  {
    key: 'zone-trapezoid',
    name: 'Trapez',
    shape: 'rect',
    goals: 0,
    width: 24,
    height: 14,
    corners: [
      { x: -7, y: -7 },
      { x: 7, y: -7 },
      { x: 12, y: 7 },
      { x: -12, y: 7 },
    ],
  },
  {
    key: 'zone-polygon',
    name: 'Vieleck',
    shape: 'rect',
    goals: 0,
    width: 20,
    height: 20,
    corners: regularPolygon(6, 20, 20),
  },
  { key: 'field-4', name: 'Kleinfeld 4 Tore', shape: 'rect', goals: 4, width: 30, height: 20 },
  { key: 'field-6', name: 'Kleinfeld 6 Tore', shape: 'rect', goals: 6, width: 40, height: 25 },
]

/** Corner counts offered for the polygon zone */
export const MIN_POLYGON_CORNERS = 3
export const MAX_POLYGON_CORNERS = 12

/**
 * Regular polygon with n corners fitted into width × height (relative to the centre),
 * starting with a corner at the top.
 */
export function regularPolygon(n: number, width: number, height: number): Point[] {
  // Plain numbers here: the templates above call this before the constants are defined.
  const count = Math.round(Math.min(Math.max(n, 3), 12))
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / count
    // Rounded to centimeters so files stay readable.
    return { x: Math.round(Math.cos(angle) * (width / 2) * 100) / 100, y: Math.round(Math.sin(angle) * (height / 2) * 100) / 100 }
  })
}

export const ZONE_GOAL_OPTIONS: ZoneGoals[] = [0, 4, 6]

/** Points on an ellipse that become the movable points when a circle zone is reshaped */
export const ELLIPSE_POINTS = 8
/** Curve tension through the points; with 8 points this looks like the ellipse itself */
export const ELLIPSE_TENSION = 0.55

/**
 * Corners of the regular shape: rectangle clockwise from top left, triangle from the tip,
 * ellipse as ELLIPSE_POINTS points from the top (drawn as a smooth curve through them).
 */
export function baseCorners(shape: ZoneShape, width: number, height: number): Point[] {
  const w = width / 2
  const h = height / 2
  if (shape === 'ellipse') return regularPolygon(ELLIPSE_POINTS, width, height)
  if (shape === 'triangle') {
    return [
      { x: 0, y: -h },
      { x: w, y: h },
      { x: -w, y: h },
    ]
  }
  return [
    { x: -w, y: -h },
    { x: w, y: -h },
    { x: w, y: h },
    { x: -w, y: h },
  ]
}

/** Corners as drawn (free corners or the regular shape); for ellipses the points of the curve. */
export function zoneCorners(zone: Pick<Zone, 'shape' | 'width' | 'height' | 'corners'>): Point[] {
  return zone.corners ?? baseCorners(zone.shape, zone.width, zone.height)
}

/** Zones whose corners can be dragged right away (all but a plain circle). */
export function hasDirectCorners(zone: Pick<Zone, 'shape' | 'corners'>): boolean {
  return zone.shape !== 'ellipse' || zone.corners !== null
}

/** Width and height of the area actually covered (meters, before rotation). */
export function zoneExtent(zone: Pick<Zone, 'shape' | 'width' | 'height' | 'corners'>): {
  width: number
  height: number
} {
  if (!zone.corners) return { width: zone.width, height: zone.height }
  const xs = zone.corners.map((p) => p.x)
  const ys = zone.corners.map((p) => p.y)
  return { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
}

/** Smallest and largest number of corners a zone outline may have. */
export const MIN_CORNERS = 3
export const MAX_CORNERS = 32

/** Inserts a corner after corner `afterIndex` (the last edge closes back to the first corner). */
export function insertCorner(corners: Point[], afterIndex: number, point: Point): Point[] {
  if (corners.length >= MAX_CORNERS) return corners
  const result = [...corners]
  result.splice(afterIndex + 1, 0, point)
  return result
}

/** Removes a corner, but never below a triangle. */
export function removeCorner(corners: Point[], index: number): Point[] {
  if (corners.length <= MIN_CORNERS || index < 0 || index >= corners.length) return corners
  return corners.filter((_, i) => i !== index)
}

/** Middle of each edge of a closed outline (edge i runs from corner i to corner i + 1). */
export function edgeMidpoints(corners: Point[]): Point[] {
  return corners.map((p, i) => {
    const q = corners[(i + 1) % corners.length]
    return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }
  })
}

const normalizeDegrees = (deg: number) => ((deg % 360) + 360) % 360

/**
 * Positions of the built-in mini goals of a four-cornered zone, relative to its center.
 * The goals sit on the two shorter opposite sides (also slanted ones), opening inwards;
 * rotation 0 = opening towards +x.
 */
export function zoneGoalPositions(corners: Point[], goals: ZoneGoals): { x: number; y: number; rotation: number }[] {
  if (goals === 0 || corners.length !== 4) return []
  const [a, b, c, d] = corners
  const length = (p: Point, q: Point) => Math.hypot(q.x - p.x, q.y - p.y)
  // Opposite side pairs: left/right (a-d, b-c) and top/bottom (a-b, d-c), each running the same way.
  const leftRight: [Point, Point][] = [
    [a, d],
    [b, c],
  ]
  const topBottom: [Point, Point][] = [
    [a, b],
    [d, c],
  ]
  const sides =
    length(a, d) + length(b, c) <= length(a, b) + length(d, c) ? leftRight : topBottom
  const center = { x: (a.x + b.x + c.x + d.x) / 4, y: (a.y + b.y + c.y + d.y) / 4 }
  const fractions = goals === 4 ? [0.25, 0.75] : [1 / 6, 0.5, 5 / 6]

  return fractions.flatMap((f) =>
    sides.map(([from, to]) => {
      const x = from.x + (to.x - from.x) * f
      const y = from.y + (to.y - from.y) * f
      // Normal of the side, turned towards the middle of the zone.
      let nx = -(to.y - from.y)
      let ny = to.x - from.x
      if (nx * (center.x - x) + ny * (center.y - y) < 0) {
        nx = -nx
        ny = -ny
      }
      return { x, y, rotation: normalizeDegrees((Math.atan2(ny, nx) * 180) / Math.PI) }
    }),
  )
}

export const ZONE_SHAPES: ZoneShape[] = ['rect', 'triangle', 'ellipse']

export const MIN_ZONE_SIZE = 1
export const MAX_ZONE_SIZE = 140

export const ZONE_COLORS: { value: string; name: string }[] = [
  { value: '#facc15', name: 'Gelb' },
  { value: '#ffffff', name: 'Weiß' },
  { value: '#dc2626', name: 'Rot' },
  { value: '#2563eb', name: 'Blau' },
  { value: '#16a34a', name: 'Grün' },
  { value: '#f97316', name: 'Orange' },
]

export const DEFAULT_ZONE_COLOR = ZONE_COLORS[0].value
export const DEFAULT_ZONE_FILL_OPACITY = 0.22
export const MAX_ZONE_FILL_OPACITY = 0.8

export function clampFillOpacity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_ZONE_FILL_OPACITY
  return Math.round(Math.min(Math.max(value, 0), MAX_ZONE_FILL_OPACITY) * 100) / 100
}

export function clampZoneSize(value: number): number {
  if (!Number.isFinite(value)) return MIN_ZONE_SIZE
  return Math.min(Math.max(value, MIN_ZONE_SIZE), MAX_ZONE_SIZE)
}
