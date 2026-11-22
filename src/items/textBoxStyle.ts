// Look of text boxes and speech bubbles: shape, width, font, border and an optional tail
// (speech point or thought bubbles) pointing in one of eight directions.

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
}

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
  return TEXTBOX_WIDTHS.find((w) => w.value === style?.width)?.meters ?? 12
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
    !(value.border === undefined || isHexColor(value.border))
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
  }) ?? {}
}
