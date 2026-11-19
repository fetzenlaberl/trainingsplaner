import { PITCH } from './dimensions'
import type { Orientation } from './orientation'

export type PitchColor = 'grass' | 'grassPlain' | 'darkGreen' | 'lightGreen' | 'blue' | 'grey' | 'white'

export type GridType =
  | 'none'
  | 'thirds'
  | 'lanes'
  | 'positional'
  | 'penalty'
  | 'penaltyFine'
  | 'squares5'
  | 'squares10'
  | 'squares15'

/** How the pitch is drawn; saved with the drill. */
export interface PitchStyle {
  color: PitchColor
  grid: GridType
  /** Shown lying (landscape) or upright (portrait); also used for exports */
  orientation: Orientation
}

export const DEFAULT_PITCH_STYLE: PitchStyle = { color: 'grass', grid: 'none', orientation: 'landscape' }

export const ORIENTATION_LABELS: Record<Orientation, string> = {
  landscape: 'Querformat',
  portrait: 'Hochformat',
}

interface ColorScheme {
  label: string
  base: string
  /** Mowing stripes, or null for a plain surface */
  stripe: string | null
  line: string
  grid: string
  goalFill: string
}

export const PITCH_COLORS: Record<PitchColor, ColorScheme> = {
  grass: {
    label: 'Rasengrün',
    base: '#2f7d32',
    stripe: '#388e3c',
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.6)',
    goalFill: 'rgba(255,255,255,0.25)',
  },
  grassPlain: {
    label: 'Rasengrün ohne Streifen',
    base: '#34843a',
    stripe: null,
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.6)',
    goalFill: 'rgba(255,255,255,0.25)',
  },
  darkGreen: {
    label: 'Dunkelgrün',
    base: '#1d5524',
    stripe: '#22612a',
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.55)',
    goalFill: 'rgba(255,255,255,0.25)',
  },
  lightGreen: {
    label: 'Hellgrün',
    base: '#4caf50',
    stripe: '#58b95c',
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.7)',
    goalFill: 'rgba(255,255,255,0.25)',
  },
  blue: {
    label: 'Blau',
    base: '#1f5aa6',
    stripe: '#2564b3',
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.6)',
    goalFill: 'rgba(255,255,255,0.25)',
  },
  grey: {
    label: 'Grau',
    base: '#5b6470',
    stripe: null,
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.55)',
    goalFill: 'rgba(255,255,255,0.25)',
  },
  white: {
    label: 'Weiß (druckfreundlich)',
    base: '#ffffff',
    stripe: null,
    line: '#374151',
    grid: 'rgba(55,65,81,0.45)',
    goalFill: 'rgba(55,65,81,0.08)',
  },
}

export const PITCH_COLOR_ORDER: PitchColor[] = [
  'grass',
  'grassPlain',
  'darkGreen',
  'lightGreen',
  'blue',
  'grey',
  'white',
]

export const GRID_LABELS: Record<GridType, string> = {
  none: 'Kein Raster',
  thirds: 'Drittel',
  lanes: 'Korridore (5 Längsstreifen)',
  positional: 'Positionsspiel-Raster (20 Zonen)',
  penalty: 'Strafraum-Raster (ca. 12 × 10 m)',
  penaltyFine: 'Strafraum-Raster fein (ca. 9 × 6,7 m)',
  squares5: 'Quadrate 5 × 5 m',
  squares10: 'Quadrate 10 × 10 m',
  squares15: 'Quadrate 15 × 15 m',
}

export const GRID_ORDER: GridType[] = [
  'none',
  'thirds',
  'lanes',
  'positional',
  'penalty',
  'penaltyFine',
  'squares5',
  'squares10',
  'squares15',
]

/**
 * Cell divisions of the penalty-area grids: the distance from the halfway line to the
 * penalty area line (36 m) and from the middle to the penalty area side (20.16 m) are split
 * into equal parts, so grid lines hit every penalty area line exactly.
 */
const PENALTY_GRID_PARTS: Record<'penalty' | 'penaltyFine', { length: number; width: number }> = {
  penalty: { length: 3, width: 2 },
  penaltyFine: { length: 4, width: 3 },
}

/** Lines at center ± k·step that lie strictly inside (0, max). */
function symmetricPositions(center: number, step: number, max: number): number[] {
  const positions = [center]
  for (let d = step; center - d > 1e-9; d += step) positions.push(center - d)
  for (let d = step; center + d < max - 1e-9; d += step) positions.push(center + d)
  return positions.sort((a, b) => a - b)
}

/** White elements would disappear on a white pitch; they are drawn in this color there. */
export const ON_WHITE_PITCH_COLOR = '#1f2937'

/** Color to draw a user-chosen color with on the given pitch. */
export function displayColor(color: string, pitchColor: PitchColor): string {
  return pitchColor === 'white' && color.toLowerCase() === '#ffffff' ? ON_WHITE_PITCH_COLOR : color
}

/**
 * Grid lines in meters ([x1, y1, x2, y2] each), relative to the full pitch.
 * Lanes follow the sides of the penalty and goal areas (wings, half-spaces, centre);
 * the positional grid adds cross lines at the penalty areas and the halfway line.
 */
export function gridLines(grid: GridType): number[][] {
  const { length, width, penaltyAreaDepth, penaltyAreaWidth, goalAreaWidth } = PITCH
  const mid = width / 2
  const horizontal = (y: number) => [0, y, length, y]
  const vertical = (x: number) => [x, 0, x, width]
  const lanes = [
    mid - penaltyAreaWidth / 2,
    mid - goalAreaWidth / 2,
    mid + goalAreaWidth / 2,
    mid + penaltyAreaWidth / 2,
  ].map(horizontal)

  switch (grid) {
    case 'none':
      return []
    case 'thirds':
      return [length / 3, (2 * length) / 3].map(vertical)
    case 'lanes':
      return lanes
    case 'positional':
      return [...lanes, ...[penaltyAreaDepth, length / 2, length - penaltyAreaDepth].map(vertical)]
    case 'penalty':
    case 'penaltyFine': {
      const parts = PENALTY_GRID_PARTS[grid]
      const stepX = (length / 2 - penaltyAreaDepth) / parts.length
      const stepY = penaltyAreaWidth / 2 / parts.width
      return [
        ...symmetricPositions(length / 2, stepX, length).map(vertical),
        ...symmetricPositions(mid, stepY, width).map(horizontal),
      ]
    }
    case 'squares5':
    case 'squares10':
    case 'squares15': {
      const step = Number(grid.slice('squares'.length))
      const lines: number[][] = []
      for (let x = step; x < length - 1e-9; x += step) lines.push(vertical(x))
      for (let y = step; y < width - 1e-9; y += step) lines.push(horizontal(y))
      return lines
    }
  }
}
