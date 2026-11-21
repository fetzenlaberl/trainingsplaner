// Perspective ("TV camera") view of a flat image: the image plane is first turned around
// its center (looking at the pitch from another side), then tilted backwards around its
// horizontal middle axis and seen from a camera in front of it.
// The same model drives the on-screen CSS transform and the canvas warp for exports.

export interface Point2 {
  x: number
  y: number
}

export const MIN_TILT = 15
export const MAX_TILT = 65
export const DEFAULT_TILT = 45
/** Turn of the pitch in the 3D view, degrees (0 = seen from the touchline as on screen). */
export const MIN_TURN = -180
export const MAX_TURN = 180

/** Keeps a turn between -180 and 180 degrees. */
export function normalizeTurn(deg: number): number {
  const t = ((((deg + 180) % 360) + 360) % 360) - 180
  return Object.is(t, -0) ? 0 : t
}
/** Camera distance relative to the larger image side (smaller = stronger perspective). */
export const DISTANCE_FACTOR = 1.6

export function cameraDistance(width: number, height: number): number {
  return DISTANCE_FACTOR * Math.max(width, height)
}

/**
 * Projects an image point (pixels, origin top left) after tilting by `tiltDeg`.
 * Returns coordinates relative to the image center, like CSS
 * \`perspective(d) rotateX(tilt) rotateZ(turn)\` with transform-origin at the center.
 */
export function projectPoint(
  x: number,
  y: number,
  width: number,
  height: number,
  tiltDeg: number,
  turnDeg = 0,
): Point2 {
  const { x: px, y: py } = projectPointScaled(x, y, width, height, tiltDeg, turnDeg)
  return { x: px, y: py }
}

/** Like projectPoint, plus the size factor at that point (far = smaller, near = larger). */
export function projectPointScaled(
  x: number,
  y: number,
  width: number,
  height: number,
  tiltDeg: number,
  turnDeg = 0,
): Point2 & { scale: number } {
  const tilt = (tiltDeg * Math.PI) / 180
  const turn = (turnDeg * Math.PI) / 180
  const d = cameraDistance(width, height)
  // rotateZ (clockwise on screen for positive angles), around the image center
  const px = x - width / 2
  const py = y - height / 2
  const cx = px * Math.cos(turn) - py * Math.sin(turn)
  const cy = px * Math.sin(turn) + py * Math.cos(turn)
  // rotateX: the top half moves away from the viewer (negative z), the bottom comes closer.
  const ry = cy * Math.cos(tilt)
  const rz = cy * Math.sin(tilt)
  const s = d / (d - rz)
  return { x: cx * s, y: ry * s, scale: s }
}

export interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** Bounding box of the tilted image (relative to the image center). */
export function projectedBounds(width: number, height: number, tiltDeg: number, turnDeg = 0): Bounds {
  // Straight lines stay straight in perspective, so the corners give the bounding box.
  const corners = [
    projectPoint(0, 0, width, height, tiltDeg, turnDeg),
    projectPoint(width, 0, width, height, tiltDeg, turnDeg),
    projectPoint(width, height, width, height, tiltDeg, turnDeg),
    projectPoint(0, height, width, height, tiltDeg, turnDeg),
  ]
  return {
    minX: Math.min(...corners.map((p) => p.x)),
    maxX: Math.max(...corners.map((p) => p.x)),
    minY: Math.min(...corners.map((p) => p.y)),
    maxY: Math.max(...corners.map((p) => p.y)),
  }
}

/**
 * Scale and offset that fit the tilted image centered into a target area.
 * Offsets are relative to the target center.
 */
export function fitProjected(
  width: number,
  height: number,
  tiltDeg: number,
  targetWidth: number,
  targetHeight: number,
  turnDeg = 0,
): { scale: number; offsetX: number; offsetY: number } {
  const b = projectedBounds(width, height, tiltDeg, turnDeg)
  const scale = Math.min(targetWidth / (b.maxX - b.minX), targetHeight / (b.maxY - b.minY))
  return {
    scale,
    offsetX: -scale * ((b.minX + b.maxX) / 2),
    offsetY: -scale * ((b.minY + b.maxY) / 2),
  }
}

/** Output size for an export: same width as the source, height from the tilted shape. */
export function warpedSize(
  width: number,
  height: number,
  tiltDeg: number,
  turnDeg = 0,
): { width: number; height: number } {
  const b = projectedBounds(width, height, tiltDeg, turnDeg)
  const scale = width / (b.maxX - b.minX)
  return { width, height: Math.max(2, Math.round(((b.maxY - b.minY) * scale) / 2) * 2) }
}

/** Affine transform [a, b, c, d, e, f] (canvas setTransform order) mapping triangle src onto dst. */
export function affineFromTriangles(src: [Point2, Point2, Point2], dst: [Point2, Point2, Point2]): number[] {
  const [s0, s1, s2] = src
  const [d0, d1, d2] = dst
  const det = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y)
  if (Math.abs(det) < 1e-12) return [1, 0, 0, 1, 0, 0]
  const a = ((d1.x - d0.x) * (s2.y - s0.y) - (d2.x - d0.x) * (s1.y - s0.y)) / det
  const c = ((d2.x - d0.x) * (s1.x - s0.x) - (d1.x - d0.x) * (s2.x - s0.x)) / det
  const b = ((d1.y - d0.y) * (s2.y - s0.y) - (d2.y - d0.y) * (s1.y - s0.y)) / det
  const d = ((d2.y - d0.y) * (s1.x - s0.x) - (d1.y - d0.y) * (s2.x - s0.x)) / det
  const e = d0.x - a * s0.x - c * s0.y
  const f = d0.y - b * s0.x - d * s0.y
  return [a, b, c, d, e, f]
}

export function applyAffine(m: number[], p: Point2): Point2 {
  return { x: m[0] * p.x + m[2] * p.y + m[4], y: m[1] * p.x + m[3] * p.y + m[5] }
}
