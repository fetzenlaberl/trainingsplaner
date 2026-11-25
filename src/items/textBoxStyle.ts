// Look of text boxes and speech bubbles: shape, width, font, border and an optional tail
// (speech point or thought bubbles) pointing in one of eight directions or dragged freely.

import { isHexColor } from '../field/pitchStyle'

export type TextBoxShape = 'rect' | 'rounded' | 'oval' | 'cloud'
export type TextBoxFont = 'small' | 'medium' | 'large' | 'xlarge'
export type TextBoxWidth = 'narrow' | 'normal' | 'wide' | 'xwide'
/** Direction the tail points to, as on the box: n = up, se = down right … */
export type TailDirection = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
export type TailKind = 'speech' | 'thought'

export interface TextBoxStyle {
  /** missing = rounded */
  shape?: TextBoxShape
  /** missing = medium */
  font?: TextBoxFont
  /** missing = normal */
  width?: TextBoxWidth
  bold?: boolean
  italic?: boolean
  /** Border color; missing = faint dark border */
  border?: string
  /** missing = no tail */
  tail?: TailDirection
  /** missing = speech */
  tailKind?: TailKind
  /** Tip of the tail dragged freely, relative to the middle of the box (meters at size 1); overrides the direction */
  tailTip?: { x: number; y: number }
  /** Own width of the text area in meters (dragged); overrides `width` */
  w?: number
  /** Own minimum height of the text area in meters (dragged) */
  h?: number
  /** Text color; missing = black or white, whichever reads better on the background */
  textColor?: string
}

/** Limits of the freely dragged size (meters) and of the tail tip */
export const MIN_TEXTBOX_W = 3
export const MAX_TEXTBOX_W = 60
export const MAX_TEXTBOX_H = 40
export const MAX_TAIL_TIP = 80

export const TEXTBOX_SHAPES: { value: TextBoxShape; label: string }[] = [
  { value: 'rect', label: 'Eckig' },
  { value: 'rounded', label: 'Abgerundet' },
  { value: 'oval', label: 'Oval' },
  { value: 'cloud', label: 'Wolke' },
]

export const TEXTBOX_FONTS: { value: TextBoxFont; label: string; factor: number }[] = [
  { value: 'small', label: 'Klein', factor: 0.75 },
  { value: 'medium', label: 'Normal', factor: 1 },
  { value: 'large', label: 'Groß', factor: 1.45 },
  { value: 'xlarge', label: 'Sehr groß', factor: 2 },
]

/** Width of the text area in meters */
export const TEXTBOX_WIDTHS: { value: TextBoxWidth; label: string; meters: number }[] = [
  { value: 'narrow', label: 'Schmal', meters: 8 },
  { value: 'normal', label: 'Normal', meters: 12 },
  { value: 'wide', label: 'Breit', meters: 18 },
  { value: 'xwide', label: 'Sehr breit', meters: 26 },
]

/** Directions in the order of a 3 × 3 picker (null = middle = no tail). */
export const TAIL_PICKER: (TailDirection | null)[] = ['nw', 'n', 'ne', 'w', null, 'e', 'sw', 's', 'se']
export const TAIL_ARROWS: Record<TailDirection, string> = {
  nw: '↖',
  n: '↑',
  ne: '↗',
  w: '←',
  e: '→',
  sw: '↙',
  s: '↓',
  se: '↘',
}

/** Unit steps of each direction (y grows downwards). */
export const TAIL_STEPS: Record<TailDirection, [number, number]> = {
  n: [0, -1],
  ne: [1, -1],
  e: [1, 0],
  se: [1, 1],
  s: [0, 1],
  sw: [-1, 1],
  w: [-1, 0],
  nw: [-1, -1],
}

export const BORDER_COLORS: { value: string; name: string }[] = [
  { value: '#111827', name: 'Schwarz' },
  { value: '#ffffff', name: 'Weiß' },
  { value: '#dc2626', name: 'Rot' },
  { value: '#2563eb', name: 'Blau' },
  { value: '#16a34a', name: 'Grün' },
  { value: '#f97316', name: 'Orange' },
  { value: '#facc15', name: 'Gelb' },
]

export function textBoxFontFactor(style: TextBoxStyle | undefined): number {
  return TEXTBOX_FONTS.find((f) => f.value === style?.font)?.factor ?? 1
}

export function textBoxWidth(style: TextBoxStyle | undefined): number {
  if (style?.w !== undefined) return style.w
  return TEXTBOX_WIDTHS.find((w) => w.value === style?.width)?.meters ?? 12
}

/** Text area of a bubble should not get higher than this share of its width */
const BUBBLE_RATIO = 0.6
/** Widest automatic text area (meters, at normal font size) */
const MAX_AUTO_WIDTH = 30

/** Bubbles (with a tail, oval or cloud) widen for long texts, unless their width was dragged. */
export function isAutoWidth(style: TextBoxStyle | undefined): boolean {
  if (!style || style.w !== undefined) return false
  return style.tail !== undefined || isRoundShape(style.shape)
}

function isRoundShape(shape: TextBoxShape | undefined): boolean {
  return shape === 'oval' || shape === 'cloud'
}

/**
 * Width of a bubble: the chosen width, and wider for long texts (in steps of 1 m).
 * `heightAt` gives the height of the wrapped text for a width.
 */
export function bubbleWidth(style: TextBoxStyle | undefined, heightAt: (width: number) => number): number {
  const start = textBoxWidth(style)
  if (!isAutoWidth(style)) return start
  const max = MAX_AUTO_WIDTH * Math.max(1, textBoxFontFactor(style))
  let width = start
  let height = heightAt(width)
  // Narrowest width with the lowest height so far
  let best = { width, height }
  while (height > width * BUBBLE_RATIO && width < max) {
    width = Math.min(max, width + 1)
    height = heightAt(width)
    if (height < best.height) best = { width, height }
  }
  // An oval needs the room for its first and last lines; a box would only get empty space.
  return isRoundShape(style?.shape) ? width : best.width
}

/** Applies a change; values equal to the default are left out, an empty style becomes undefined. */
export function changeTextBoxStyle(style: TextBoxStyle | undefined, change: Partial<Record<keyof TextBoxStyle, unknown>>): TextBoxStyle | undefined {
  const next: Record<string, unknown> = { ...style, ...change }
  const defaults: Record<string, unknown> = { shape: 'rounded', font: 'medium', width: 'normal', bold: false, italic: false, tailKind: 'speech' }
  for (const key of Object.keys(next)) {
    if (next[key] === undefined || next[key] === null || next[key] === defaults[key]) delete next[key]
  }
  return Object.keys(next).length > 0 ? (next as TextBoxStyle) : undefined
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Validates a stored style; null if it is broken. */
export function parseTextBoxStyle(value: unknown): TextBoxStyle | null {
  if (!isRecord(value)) return null
  const oneOf = <T extends string>(v: unknown, list: { value: T }[] | T[]) =>
    v === undefined || (list as ({ value: T } | T)[]).some((o) => (typeof o === 'string' ? o : o.value) === v)
  if (
    !oneOf(value.shape, TEXTBOX_SHAPES) ||
    !oneOf(value.font, TEXTBOX_FONTS) ||
    !oneOf(value.width, TEXTBOX_WIDTHS) ||
    !oneOf(value.tail, Object.keys(TAIL_STEPS) as TailDirection[]) ||
    !oneOf(value.tailKind, ['speech', 'thought'] as TailKind[]) ||
    !(value.bold === undefined || typeof value.bold === 'boolean') ||
    !(value.italic === undefined || typeof value.italic === 'boolean') ||
    !(value.border === undefined || isHexColor(value.border)) ||
    !(value.textColor === undefined || isHexColor(value.textColor)) ||
    !(value.w === undefined || (isFiniteNumber(value.w) && value.w >= MIN_TEXTBOX_W && value.w <= MAX_TEXTBOX_W)) ||
    !(value.h === undefined || (isFiniteNumber(value.h) && value.h >= 0 && value.h <= MAX_TEXTBOX_H)) ||
    !(
      value.tailTip === undefined ||
      (isRecord(value.tailTip) &&
        isFiniteNumber(value.tailTip.x) &&
        isFiniteNumber(value.tailTip.y) &&
        Math.abs(value.tailTip.x) <= MAX_TAIL_TIP &&
        Math.abs(value.tailTip.y) <= MAX_TAIL_TIP)
    )
  ) {
    return null
  }
  return changeTextBoxStyle(undefined, {
    shape: value.shape,
    font: value.font,
    width: value.width,
    bold: value.bold,
    italic: value.italic,
    border: value.border,
    tail: value.tail,
    tailKind: value.tailKind,
    textColor: value.textColor,
    w: value.w,
    h: value.h,
    tailTip: isRecord(value.tailTip) ? { x: value.tailTip.x as number, y: value.tailTip.y as number } : undefined,
  }) ?? {}
}
