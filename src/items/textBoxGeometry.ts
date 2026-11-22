// Outline of text boxes and speech bubbles (meters, centered at 0, 0) and their tails.

import { TAIL_STEPS, type TailDirection, type TextBoxShape } from './textBoxStyle'

export interface TextBoxBody {
  shape: TextBoxShape
  /** Half width and half height of the box, or the radii of the oval / cloud */
  rx: number
  ry: number
  /** Corner radius (rounded box) */
  corner: number
  /** Size of the cloud bumps */
  bump: number
}

/** Body around a text area of `width` × `height`; ovals and clouds are bigger so the text fits inside. */
export function textBoxBody(shape: TextBoxShape, width: number, height: number, fontFactor: number): TextBoxBody {
  if (shape === 'oval' || shape === 'cloud') {
    return { shape, rx: width * 0.62, ry: height * 0.72 + 0.3 * fontFactor, corner: 0, bump: 0.9 * fontFactor }
  }
  return { shape, rx: width / 2, ry: height / 2, corner: shape === 'rounded' ? Math.min(0.4 * fontFactor, height / 3) : 0, bump: 0 }
}

interface PathContext {
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  quadraticCurveTo(cx: number, cy: number, x: number, y: number): void
  arcTo(x1: number, y1: number, x2: number, y2: number, r: number): void
  ellipse?(x: number, y: number, rx: number, ry: number, rotation: number, start: number, end: number): void
}

/** Number of bumps of a cloud (about one per 2 bump sizes of the outline). */
export function cloudBumps(body: TextBoxBody): number {
  const perimeter = Math.PI * (3 * (body.rx + body.ry) - Math.sqrt((3 * body.rx + body.ry) * (body.rx + 3 * body.ry)))
  return Math.max(8, Math.round(perimeter / (body.bump * 2.4)))
}

/** Draws the outline of the body (without beginPath / closePath). */
export function traceTextBoxBody(ctx: PathContext, body: TextBoxBody): void {
  const { rx, ry } = body
  if (body.shape === 'oval') {
    const n = 48
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2
      if (i === 0) ctx.moveTo(rx * Math.cos(t), ry * Math.sin(t))
      else ctx.lineTo(rx * Math.cos(t), ry * Math.sin(t))
    }
    return
  }
  if (body.shape === 'cloud') {
    const n = cloudBumps(body)
    const out = body.bump
    ctx.moveTo(rx, 0)
    for (let i = 0; i < n; i++) {
      const mid = ((i + 0.5) / n) * Math.PI * 2
      const end = ((i + 1) / n) * Math.PI * 2
      ctx.quadraticCurveTo((rx + out * 1.6) * Math.cos(mid), (ry + out * 1.6) * Math.sin(mid), rx * Math.cos(end), ry * Math.sin(end))
    }
    return
  }
  const r = body.corner
  ctx.moveTo(-rx + r, -ry)
  ctx.lineTo(rx - r, -ry)
  if (r > 0) ctx.arcTo(rx, -ry, rx, -ry + r, r)
  ctx.lineTo(rx, ry - r)
  if (r > 0) ctx.arcTo(rx, ry, rx - r, ry, r)
  ctx.lineTo(-rx + r, ry)
  if (r > 0) ctx.arcTo(-rx, ry, -rx, ry - r, r)
  ctx.lineTo(-rx, -ry + r)
  if (r > 0) ctx.arcTo(-rx, -ry, -rx + r, -ry, r)
}

export interface TextBoxTail {
  /** Triangle of the speech tail: base (inside the box) and tip, as flat x, y list */
  points: number[]
  /** Thought bubbles, getting smaller away from the box */
  bubbles: { x: number; y: number; r: number }[]
  tip: { x: number; y: number }
}

/** Speech tail and thought bubbles pointing to `direction`. */
export function textBoxTail(body: TextBoxBody, direction: TailDirection, fontFactor: number): TextBoxTail {
  const [sx, sy] = TAIL_STEPS[direction]
  const len = Math.hypot(sx, sy)
  const out = { x: sx / len, y: sy / len }
  const round = body.shape === 'oval' || body.shape === 'cloud'
  const diagonal = sx !== 0 && sy !== 0
  // Where the tail leaves the box; on a box the diagonal tails start on the top or bottom edge near the corner.
  const edge = round
    ? { x: body.rx * out.x, y: body.ry * out.y }
    : diagonal
      ? { x: sx * body.rx * 0.6, y: sy * body.ry }
      : { x: sx * body.rx, y: sy * body.ry }
  const inward = !round && diagonal ? { x: 0, y: -sy } : { x: -out.x, y: -out.y }
  const depth = 0.7 * fontFactor
  const half = 0.75 * fontFactor
  const base = { x: edge.x + inward.x * depth, y: edge.y + inward.y * depth }
  const side = { x: -inward.y * half, y: inward.x * half }
  const length = 2.6 * fontFactor
  const tip = { x: edge.x + out.x * length, y: edge.y + out.y * length }
  const bubbles = [
    { d: 0.9, r: 0.55 },
    { d: 1.9, r: 0.38 },
    { d: 2.7, r: 0.25 },
  ].map(({ d, r }) => ({ x: edge.x + out.x * d * fontFactor, y: edge.y + out.y * d * fontFactor, r: r * fontFactor }))
  return {
    points: [base.x + side.x, base.y + side.y, tip.x, tip.y, base.x - side.x, base.y - side.y],
    bubbles,
    tip,
  }
}

/** Speech tail and thought bubbles reaching to a freely dragged tip (relative to the middle of the box). */
export function textBoxTailTo(body: TextBoxBody, tip: { x: number; y: number }, fontFactor: number): TextBoxTail {
  const len = Math.hypot(tip.x, tip.y) || 1
  const u = { x: tip.x / len, y: tip.y / len }
  const round = body.shape === 'oval' || body.shape === 'cloud'
  // Where the line from the middle to the tip leaves the box, and the inward direction there.
  let t: number
  let inward: { x: number; y: number }
  if (round) {
    t = 1 / Math.sqrt((u.x / body.rx) ** 2 + (u.y / body.ry) ** 2)
    inward = { x: -u.x, y: -u.y }
  } else {
    const tx = u.x === 0 ? Infinity : body.rx / Math.abs(u.x)
    const ty = u.y === 0 ? Infinity : body.ry / Math.abs(u.y)
    t = Math.min(tx, ty)
    inward = tx < ty ? { x: -Math.sign(u.x), y: 0 } : { x: 0, y: -Math.sign(u.y) }
  }
  const edge = { x: u.x * t, y: u.y * t }
  const depth = Math.min(0.7 * fontFactor, 0.45 * Math.min(body.rx, body.ry))
  const half = Math.min(0.75 * fontFactor, 0.4 * Math.min(body.rx, body.ry) + 0.2)
  const base = { x: edge.x + inward.x * depth, y: edge.y + inward.y * depth }
  const side = { x: -inward.y * half, y: inward.x * half }
  const reach = Math.max(0, len - t)
  const bubbles = [
    { f: 0.2, r: 0.55 },
    { f: 0.55, r: 0.38 },
    { f: 0.85, r: 0.25 },
  ].map(({ f, r }) => ({ x: edge.x + u.x * reach * f, y: edge.y + u.y * reach * f, r: r * fontFactor }))
  return {
    points: [base.x + side.x, base.y + side.y, tip.x, tip.y, base.x - side.x, base.y - side.y],
    bubbles,
    tip: { ...tip },
  }
}

/**
 * Text area for a dragged corner of the box (half extents `lx`, `ly` from the middle):
 * ovals and clouds are bigger than their text area, see textBoxBody.
 */
export function textAreaFromCorner(shape: TextBoxShape, lx: number, ly: number, fontFactor: number): { w: number; h: number } {
  if (shape === 'oval' || shape === 'cloud') return { w: lx / 0.62, h: Math.max(0, (ly - 0.3 * fontFactor) / 0.72) }
  return { w: 2 * lx, h: 2 * ly }
}
