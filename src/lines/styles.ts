import type { LineType } from '../model/types'

export type LinePattern = 'solid' | 'dashed' | 'dotted' | 'dashdot'
export type LineWeight = 'extraThin' | 'thin' | 'medium' | 'thick' | 'extraThick'

export const LINE_PATTERNS: LinePattern[] = ['solid', 'dashed', 'dotted', 'dashdot']
export const LINE_WEIGHTS: LineWeight[] = ['extraThin', 'thin', 'medium', 'thick', 'extraThick']

/** Colors for drawn lines */
export const LINE_COLORS: { value: string; name: string }[] = [
  { value: '#ffffff', name: 'Weiß' },
  { value: '#111827', name: 'Schwarz' },
  { value: '#facc15', name: 'Gelb' },
  { value: '#f97316', name: 'Orange' },
  { value: '#dc2626', name: 'Rot' },
  { value: '#ec4899', name: 'Pink' },
  { value: '#7c3aed', name: 'Lila' },
  { value: '#2563eb', name: 'Blau' },
  { value: '#06b6d4', name: 'Türkis' },
  { value: '#22c55e', name: 'Grün' },
]

export const LINE_PATTERN_LABELS: Record<LinePattern, string> = {
  solid: 'Durchgezogen',
  dashed: 'Gestrichelt',
  dotted: 'Punktiert',
  dashdot: 'Strich-Punkt',
}

export const LINE_WEIGHT_LABELS: Record<LineWeight, string> = {
  extraThin: 'Extra dünn',
  thin: 'Dünn',
  medium: 'Mittel',
  thick: 'Dick',
  extraThick: 'Extra dick',
}

/** Usual pattern of each line type (a run is traditionally dashed). */
export function defaultPattern(type: LineType): LinePattern {
  return type === 'run' ? 'dashed' : 'solid'
}

const WEIGHT_FACTOR: Record<LineWeight, number> = { extraThin: 0.35, thin: 0.6, medium: 1, thick: 1.7, extraThick: 2.6 }

export function weightFactor(weight: LineWeight): number {
  return WEIGHT_FACTOR[weight]
}

/** Lines without an arrowhead (plain markings). */
export function hasArrow(type: LineType): boolean {
  return type !== 'line' && type !== 'free'
}

/**
 * Konva dash array and line cap for a pattern, scaled to the stroke width.
 * Dots are zero-length dashes drawn with round caps.
 */
export function dashStyle(
  pattern: LinePattern,
  strokeWidth: number,
): { dash: number[] | undefined; lineCap: 'round' | 'butt' } {
  switch (pattern) {
    case 'solid':
      return { dash: undefined, lineCap: 'round' }
    case 'dashed':
      return { dash: [strokeWidth * 4, strokeWidth * 3], lineCap: 'butt' }
    case 'dotted':
      return { dash: [0.001, strokeWidth * 2.2], lineCap: 'round' }
    case 'dashdot':
      return { dash: [strokeWidth * 5, strokeWidth * 2.2, 0.001, strokeWidth * 2.2], lineCap: 'round' }
  }
}
