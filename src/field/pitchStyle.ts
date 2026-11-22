import { PITCH, type FieldArea } from './dimensions'
import type { Orientation } from './orientation'
import type { SurfaceTexture } from './surfaceTextures'

export type PitchColor =
  | 'grass'
  | 'grassFine'
  | 'grassCheck'
  | 'grassStadium'
  | 'grassPlain'
  | 'darkGreen'
  | 'lightGreen'
  | 'blue'
  | 'grey'
  | 'white'
  | 'black'
  | 'anthracite'
  | 'navy'
  | 'purple'
  | 'tartan'
  | 'sand'
  | 'redClay'
  | 'wood'
  | 'asphalt'
  | 'concrete'

/** Thickness of the pitch markings */
export type PitchLineWidth = 'extraThin' | 'thin' | 'normal' | 'thick' | 'extraThick'

export const PITCH_LINE_WIDTHS: { value: PitchLineWidth; label: string; factor: number }[] = [
  { value: 'extraThin', label: 'Extra dünn', factor: 0.35 },
  { value: 'thin', label: 'Dünn', factor: 0.55 },
  { value: 'normal', label: 'Normal', factor: 1 },
  { value: 'thick', label: 'Dick', factor: 1.8 },
  { value: 'extraThick', label: 'Extra dick', factor: 2.6 },
]

/** Colors for the pitch markings; null = usual color of the pitch (white, dark on the white pitch) */
export const PITCH_LINE_COLORS: { value: string | null; label: string }[] = [
  { value: null, label: 'Automatisch' },
  { value: '#ffffff', label: 'Weiß' },
  { value: '#fde047', label: 'Gelb' },
  { value: '#111827', label: 'Schwarz' },
  { value: '#e5e7eb', label: 'Hellgrau' },
  { value: '#dc2626', label: 'Rot' },
  { value: '#2563eb', label: 'Blau' },
  { value: '#f97316', label: 'Orange' },
  { value: '#22c55e', label: 'Grün' },
]

/** Mowing pattern; missing = the usual pattern of the chosen grass design */
export type Mowing =
  | 'across'
  | 'acrossNarrow'
  | 'acrossWide'
  | 'along'
  | 'alongNarrow'
  | 'alongWide'
  | 'check'
  | 'none'

export const MOWING_OPTIONS: { value: Mowing | null; label: string }[] = [
  { value: null, label: 'Wie Design' },
  { value: 'acrossNarrow', label: 'Querstreifen schmal' },
  { value: 'across', label: 'Querstreifen normal' },
  { value: 'acrossWide', label: 'Querstreifen breit' },
  { value: 'alongNarrow', label: 'Längsstreifen schmal' },
  { value: 'along', label: 'Längsstreifen normal' },
  { value: 'alongWide', label: 'Längsstreifen breit' },
  { value: 'check', label: 'Karo' },
  { value: 'none', label: 'Keine Streifen' },
]

/** Strength of the light ("sun"): lighter near the light, darker far away; missing = as the grass design */
export type Lighting = 'none' | 'soft' | 'medium' | 'strong'

export const LIGHTING_OPTIONS: { value: Lighting | null; label: string }[] = [
  { value: null, label: 'Wie Design' },
  { value: 'none', label: 'Kein Lichtverlauf' },
  { value: 'soft', label: 'Leicht' },
  { value: 'medium', label: 'Mittel' },
  { value: 'strong', label: 'Stark' },
]

/** Where the light comes from, as seen on screen (also in portrait); missing = centre */
export type LightSource =
  | 'center'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'topLeft'
  | 'topRight'
  | 'bottomLeft'
  | 'bottomRight'

export const LIGHT_SOURCES: { value: LightSource; label: string; x: number; y: number }[] = [
  { value: 'center', label: 'Mitte', x: 0, y: 0 },
  { value: 'left', label: 'Links', x: -1, y: 0 },
  { value: 'right', label: 'Rechts', x: 1, y: 0 },
  { value: 'top', label: 'Oben', x: 0, y: -1 },
  { value: 'bottom', label: 'Unten', x: 0, y: 1 },
  { value: 'topLeft', label: 'Ecke oben links', x: -1, y: -1 },
  { value: 'topRight', label: 'Ecke oben rechts', x: 1, y: -1 },
  { value: 'bottomLeft', label: 'Ecke unten links', x: -1, y: 1 },
  { value: 'bottomRight', label: 'Ecke unten rechts', x: 1, y: 1 },
]

/** Bright spot at the light, or only darker edges away from it (vignette); missing = spot */
export type LightKind = 'spot' | 'vignette'

export const LIGHT_KINDS: { value: LightKind; label: string }[] = [
  { value: 'spot', label: 'Heller Lichtfleck' },
  { value: 'vignette', label: 'Nur dunkler Rand' },
]

/** Own surface: two colors running into each other (replaces the design's base color) */
export type GradientDirection = 'leftRight' | 'topBottom' | 'diagonal' | 'radial'

export interface PitchGradient {
  from: string
  to: string
  direction: GradientDirection
}

export const GRADIENT_DIRECTIONS: { value: GradientDirection; label: string }[] = [
  { value: 'leftRight', label: 'Von links nach rechts' },
  { value: 'topBottom', label: 'Von oben nach unten' },
  { value: 'diagonal', label: 'Schräg (oben links → unten rechts)' },
  { value: 'radial', label: 'Von der Mitte nach außen' },
]

/** Color stops of the light overlay (transparent white → transparent black). */
export function lightingStops(lighting: Lighting, kind: LightKind): (number | string)[] {
  const strength = { none: 0, soft: 1, medium: 1.5, strong: 2 }[lighting]
  const glow = kind === 'spot' ? 0.12 * strength : 0
  const shade = 0.11 + 0.11 * strength
  return [0, `rgba(255,255,235,${glow.toFixed(3)})`, 0.5, 'rgba(255,255,255,0)', 1, `rgba(0,0,0,${shade.toFixed(3)})`]
}

/**
 * Turns a point given in screen terms (x, y from -1 to 1 across the visible area) into meters
 * on the pitch; `upright` is the rotation that turns the view back upright (90 in portrait).
 */
export function screenToField(
  viewport: { x: number; y: number; width: number; height: number },
  upright: number,
  sx: number,
  sy: number,
): { x: number; y: number } {
  const turned = upright % 180 !== 0
  const halfW = (turned ? viewport.height : viewport.width) / 2
  const halfH = (turned ? viewport.width : viewport.height) / 2
  const a = (upright * Math.PI) / 180
  const dx = sx * halfW
  const dy = sy * halfH
  const cos = Math.round(Math.cos(a) * 1e9) / 1e9
  const sin = Math.round(Math.sin(a) * 1e9) / 1e9
  return {
    x: viewport.x + viewport.width / 2 + dx * cos - dy * sin,
    y: viewport.y + viewport.height / 2 + dx * sin + dy * cos,
  }
}

/** Valid color like #1a2b3c */
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
}

/** Resolved mowing: stripe direction and how many stripes over the pitch length (across) or width (along). */
export function resolveMowing(style: PitchStyle): { kind: 'across' | 'along' | 'check' | 'none'; count: number } {
  const scheme = PITCH_COLORS[style.color]
  const mowing: Mowing =
    style.mowing ??
    (scheme.stripe === null
      ? 'none'
      : scheme.pattern === 'fineStripes'
        ? 'acrossNarrow'
        : scheme.pattern === 'check'
          ? 'check'
          : 'across')
  switch (mowing) {
    case 'acrossNarrow':
      return { kind: 'across', count: 28 }
    case 'across':
      return { kind: 'across', count: 14 }
    case 'acrossWide':
      return { kind: 'across', count: 8 }
    case 'alongNarrow':
      return { kind: 'along', count: 17 }
    case 'along':
      return { kind: 'along', count: 9 }
    case 'alongWide':
      return { kind: 'along', count: 5 }
    case 'check':
      return { kind: 'check', count: 14 }
    case 'none':
      return { kind: 'none', count: 0 }
  }
}

export function resolveLighting(style: PitchStyle): Lighting {
  return style.lighting ?? (PITCH_COLORS[style.color].lighting ? 'soft' : 'none')
}

/** Stripe color; designs without stripes get a slightly lighter shade of their base color. */
export function stripeColor(color: PitchColor): string {
  const scheme = PITCH_COLORS[color]
  if (scheme.stripe) return scheme.stripe
  const n = Number.parseInt(scheme.base.slice(1), 16)
  const channel = (shift: number) => {
    const v = (n >> shift) & 255
    // White surfaces get a faint grey shade, all others a lighter one.
    return Math.round(v > 240 ? v - 10 : v + (255 - v) * 0.08)
  }
  return `rgb(${channel(16)}, ${channel(8)}, ${channel(0)})`
}

/** Corner radius of the touch and goal lines when rounded (meters) */
export const ROUNDED_CORNER_RADIUS = 2.5

export type GridType =
  | 'none'
  | 'thirds'
  | 'lanes'
  | 'lanesCross'
  | 'positional'
  | 'zones20'
  | 'zones20Plain'
  | 'lettersLong'
  | 'lettersAcross'
  | 'letters3x2'
  | 'penalty'
  | 'penaltyFine'
  | 'squares5'
  | 'squares10'
  | 'squares15'
  | 'custom'

/** How the pitch is drawn; saved with the drill. */
export interface PitchStyle {
  color: PitchColor
  grid: GridType
  /** Shown lying (landscape) or upright (portrait); also used for exports */
  orientation: Orientation
  /** Own grid (grid "custom"): column widths along the length and row heights across, in meters */
  customGrid?: CustomGrid
  /** Thickness of the markings (missing = normal) */
  lineWidth?: PitchLineWidth
  /** Color of the markings (missing = usual color of the pitch) */
  lineColor?: string
  /** Rounded outer corners instead of corner arcs */
  roundedCorners?: boolean
  /** Dashed retreat lines 22 m in front of both goal lines (big pitch only) */
  retreatLines?: boolean
  /** Notes area below the pitch is shown */
  showNotes?: boolean
  /** Text of the notes below the pitch */
  notes?: string
  mowing?: Mowing
  lighting?: Lighting
  /** Where the light comes from (missing = centre) */
  lightSource?: LightSource
  /** Bright spot or only dark edges (missing = spot) */
  lightKind?: LightKind
  /** Own two-color surface instead of the design's base color */
  gradient?: PitchGradient
  /** Own labels for the grid zones (missing = as the grid comes) */
  gridLabelStyle?: GridLabelStyle
  /** Picture (id in Drill.images) shown instead of the grass */
  background?: string
  /** Opacity of the background picture, 0.1–1 (missing = 1) */
  backgroundOpacity?: number
  /** Own size of the empty field in meters (missing = as big as the big pitch) */
  area?: FieldArea
}

/** Zone labels chosen by the user: kind, place in the zone and size */
export type GridLabelKind = 'none' | 'numbers' | 'letters'
export type GridLabelPosition = 'corner' | 'center' | 'outside'
export type GridLabelSize = 'small' | 'medium' | 'large'

export interface GridLabelStyle {
  kind: GridLabelKind
  position: GridLabelPosition
  size: GridLabelSize
}

export const GRID_LABEL_KINDS: { value: GridLabelKind | null; label: string }[] = [
  { value: null, label: 'Wie Raster' },
  { value: 'none', label: 'Keine' },
  { value: 'numbers', label: 'Zahlen 1, 2, 3 …' },
  { value: 'letters', label: 'Buchstaben A, B, C …' },
]

export const GRID_LABEL_POSITIONS: { value: GridLabelPosition; label: string }[] = [
  { value: 'corner', label: 'Ecke oben links' },
  { value: 'center', label: 'Mitte der Zone' },
  { value: 'outside', label: 'Außen am Feldrand (bei Streifen)' },
]

export const GRID_LABEL_SIZES: { value: GridLabelSize; label: string }[] = [
  { value: 'small', label: 'Klein' },
  { value: 'medium', label: 'Mittel' },
  { value: 'large', label: 'Groß' },
]

export interface CustomGrid {
  columns: number[]
  rows: number[]
}

export const DEFAULT_CUSTOM_GRID: CustomGrid = { columns: [20, 30, 20], rows: [15, 20, 15] }
export const MAX_CUSTOM_PARTS = 20
export const MAX_CUSTOM_SIZE = 150

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
  /** How the stripes are mown (default: wide stripes) */
  pattern?: 'stripes' | 'fineStripes' | 'check'
  /** Texture drawn on top (grass blades, planks, grain …) */
  texture?: SurfaceTexture
  /** Soft floodlight: lighter in the middle, darker at the edges */
  lighting?: boolean
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
  grassFine: {
    label: 'Rasen fein gemäht',
    base: '#2b7631',
    stripe: '#33833a',
    pattern: 'fineStripes',
    texture: 'grass',
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.6)',
    goalFill: 'rgba(255,255,255,0.25)',
  },
  grassCheck: {
    label: 'Rasen Karo-Muster',
    base: '#2d7a32',
    stripe: '#368a3c',
    pattern: 'check',
    texture: 'grass',
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.6)',
    goalFill: 'rgba(255,255,255,0.25)',
  },
  grassStadium: {
    label: 'Stadion (Flutlicht)',
    base: '#28702e',
    stripe: '#318037',
    texture: 'grass',
    lighting: true,
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
  black: {
    label: 'Schwarz',
    base: '#111214',
    stripe: '#1a1c1f',
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.5)',
    goalFill: 'rgba(255,255,255,0.2)',
  },
  anthracite: {
    label: 'Anthrazit',
    base: '#30353c',
    stripe: '#373d45',
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.55)',
    goalFill: 'rgba(255,255,255,0.22)',
  },
  navy: {
    label: 'Dunkelblau',
    base: '#152a4d',
    stripe: '#1a3360',
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.55)',
    goalFill: 'rgba(255,255,255,0.22)',
  },
  purple: {
    label: 'Violett',
    base: '#47286f',
    stripe: '#51307e',
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.55)',
    goalFill: 'rgba(255,255,255,0.22)',
  },
  tartan: {
    label: 'Rot (Tartan)',
    base: '#a23b2f',
    stripe: null,
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.6)',
    goalFill: 'rgba(255,255,255,0.25)',
  },
  sand: {
    label: 'Sand',
    base: '#cdb27e',
    stripe: '#d4ba88',
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.75)',
    goalFill: 'rgba(255,255,255,0.3)',
  },
  redClay: {
    label: 'Rote Erde (Tenne)',
    base: '#a4502f',
    stripe: null,
    texture: 'clay',
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.65)',
    goalFill: 'rgba(255,255,255,0.25)',
  },
  wood: {
    label: 'Holz (Hallenboden)',
    base: '#c99a5e',
    stripe: null,
    texture: 'wood',
    line: '#1e293b',
    grid: 'rgba(30,41,59,0.5)',
    goalFill: 'rgba(30,41,59,0.1)',
  },
  asphalt: {
    label: 'Asphalt',
    base: '#404347',
    stripe: null,
    texture: 'asphalt',
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.55)',
    goalFill: 'rgba(255,255,255,0.22)',
  },
  concrete: {
    label: 'Beton',
    base: '#9b9d9a',
    stripe: null,
    texture: 'concrete',
    line: '#ffffff',
    grid: 'rgba(255,255,255,0.75)',
    goalFill: 'rgba(255,255,255,0.3)',
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
  'grassFine',
  'grassCheck',
  'grassStadium',
  'grassPlain',
  'darkGreen',
  'lightGreen',
  'blue',
  'navy',
  'purple',
  'tartan',
  'sand',
  'redClay',
  'wood',
  'asphalt',
  'concrete',
  'grey',
  'anthracite',
  'black',
  'white',
]

export const GRID_LABELS: Record<GridType, string> = {
  none: 'Kein Raster',
  thirds: 'Drittel',
  lanes: 'Korridore (5 Längsstreifen)',
  lanesCross: 'Korridore mit Querlinien',
  positional: 'Positionsspiel-Raster (20 Zonen)',
  zones20: 'Zonenraster 1–20 (nummeriert)',
  zones20Plain: 'Zonenraster 20 Zonen (ohne Nummern)',
  lettersLong: 'Zonen A–F: 6 Längsstreifen',
  lettersAcross: 'Zonen A–F: 6 Querstreifen',
  letters3x2: 'Zonen A–F: 3 × 2 Felder',
  penalty: 'Strafraum-Raster (ca. 12 × 10 m)',
  penaltyFine: 'Strafraum-Raster fein (ca. 9 × 6,7 m)',
  squares5: 'Quadrate 5 × 5 m (ab Mitte)',
  squares10: 'Quadrate 10 × 10 m (ab Mitte)',
  squares15: 'Quadrate 15 × 15 m (ab Mitte)',
  custom: 'Eigenes Raster …',
}

type FieldSize = { length: number; width: number }
const BIG_PITCH: FieldSize = { length: PITCH.length, width: PITCH.width }

/** Square grids are drawn in real meters on the field, starting from its centre lines. */
export function isSquareGrid(grid: GridType): boolean {
  return grid === 'squares5' || grid === 'squares10' || grid === 'squares15'
}

export const GRID_ORDER: GridType[] = [
  'none',
  'thirds',
  'lanes',
  'lanesCross',
  'positional',
  'zones20',
  'zones20Plain',
  'lettersLong',
  'lettersAcross',
  'letters3x2',
  'penalty',
  'penaltyFine',
  'squares5',
  'squares10',
  'squares15',
  'custom',
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
 * Club zone grid (as on common tactic sheets): numbered 1–20 from the own goal.
 * Wings run along the penalty area sides; between penalty area and halfway line each wing
 * is split in the middle, and the centre has three lanes along the goal area sides.
 */
function zones20Layout() {
  const { length, width, penaltyAreaDepth, penaltyAreaWidth, goalAreaWidth } = PITCH
  const mid = width / 2
  const wingTop = mid - penaltyAreaWidth / 2
  const wingBottom = mid + penaltyAreaWidth / 2
  const laneTop = mid - goalAreaWidth / 2
  const laneBottom = mid + goalAreaWidth / 2
  const ownBox = penaltyAreaDepth
  const oppBox = length - penaltyAreaDepth
  const half = length / 2
  const ownWingSplit = (ownBox + half) / 2
  const oppWingSplit = (half + oppBox) / 2

  const lines: number[][] = [
    // Penalty area lines and halfway line across the whole width
    [ownBox, 0, ownBox, width],
    [half, 0, half, width],
    [oppBox, 0, oppBox, width],
    // Wing borders along the whole length
    [0, wingTop, length, wingTop],
    [0, wingBottom, length, wingBottom],
    // Centre lanes between the penalty areas
    [ownBox, laneTop, oppBox, laneTop],
    [ownBox, laneBottom, oppBox, laneBottom],
    // Wing splits in each half
    [ownWingSplit, 0, ownWingSplit, wingTop],
    [ownWingSplit, wingBottom, ownWingSplit, width],
    [oppWingSplit, 0, oppWingSplit, wingTop],
    [oppWingSplit, wingBottom, oppWingSplit, width],
  ]

  const zone = (n: number, x1: number, x2: number, y1: number, y2: number) => ({
    number: n,
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2,
    cell: { x1, y1, x2, y2 },
  })
  const labels = [
    zone(1, 0, ownBox, 0, wingTop),
    zone(2, 0, ownBox, wingTop, wingBottom),
    zone(3, 0, ownBox, wingBottom, width),
    zone(4, ownBox, ownWingSplit, 0, wingTop),
    zone(5, ownWingSplit, half, 0, wingTop),
    zone(6, ownBox, half, wingTop, laneTop),
    zone(7, ownBox, half, laneTop, laneBottom),
    zone(8, ownBox, half, laneBottom, wingBottom),
    zone(9, ownBox, ownWingSplit, wingBottom, width),
    zone(10, ownWingSplit, half, wingBottom, width),
    zone(11, half, oppWingSplit, 0, wingTop),
    zone(12, oppWingSplit, oppBox, 0, wingTop),
    zone(13, half, oppBox, wingTop, laneTop),
    zone(14, half, oppBox, laneTop, laneBottom),
    zone(15, half, oppBox, laneBottom, wingBottom),
    zone(16, half, oppWingSplit, wingBottom, width),
    zone(17, oppWingSplit, oppBox, wingBottom, width),
    zone(18, oppBox, length, 0, wingTop),
    zone(19, oppBox, length, wingTop, wingBottom),
    zone(20, oppBox, length, wingBottom, width),
  ]
  return { lines, labels }
}

export interface GridLabel {
  text: string
  x: number
  y: number
  /** Font size in meters (missing = usual size) */
  size?: number
  /** Grid cell of the label: then it is drawn small in the cell's top left corner (as seen on screen) */
  cell?: { x1: number; y1: number; x2: number; y2: number }
}

/** Distance of the letters outside the pitch lines (meters), inside the grass margin */
const OUTSIDE_LABEL_DISTANCE = 2.2

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

/** Letter zones: 6 strips along the length (lanes from touchline to touchline), 6 across (from goal to goal) or 3 × 2 fields. */
function letterLayout(grid: 'lettersLong' | 'lettersAcross' | 'letters3x2') {
  const { length, width } = PITCH
  const lines: number[][] = []
  const labels: GridLabel[] = []
  if (grid === 'lettersLong') {
    const step = width / 6
    for (let i = 1; i < 6; i++) lines.push([0, i * step, length, i * step])
    // Letters outside the pitch, behind the left goal line next to each strip
    LETTERS.forEach((text, i) => labels.push({ text, x: -OUTSIDE_LABEL_DISTANCE, y: (i + 0.5) * step }))
  } else if (grid === 'lettersAcross') {
    const step = length / 6
    for (let i = 1; i < 6; i++) lines.push([i * step, 0, i * step, width])
    // Letters outside the pitch, above the top touchline
    LETTERS.forEach((text, i) => labels.push({ text, x: (i + 0.5) * step, y: -OUTSIDE_LABEL_DISTANCE }))
  } else {
    const stepX = length / 3
    for (let i = 1; i < 3; i++) lines.push([i * stepX, 0, i * stepX, width])
    lines.push([0, width / 2, length, width / 2])
    // A B C in the upper row, D E F in the lower one
    // A B C outside above the top touchline, D E F below the bottom one
    LETTERS.forEach((text, i) =>
      labels.push({
        text,
        x: ((i % 3) + 0.5) * stepX,
        y: i < 3 ? -OUTSIDE_LABEL_DISTANCE : width + OUTSIDE_LABEL_DISTANCE,
      }),
    )
  }
  return { lines, labels }
}

/** Own grid: the given columns and rows, centred on the pitch, with its outer border. */
export function customGridLayout(grid: CustomGrid): { lines: number[][]; bounds: { x: number; y: number; width: number; height: number } } {
  const totalX = grid.columns.reduce((a, b) => a + b, 0)
  const totalY = grid.rows.reduce((a, b) => a + b, 0)
  const x0 = (PITCH.length - totalX) / 2
  const y0 = (PITCH.width - totalY) / 2
  const lines: number[][] = []
  let x = x0
  for (let i = 0; i <= grid.columns.length; i++) {
    lines.push([x, y0, x, y0 + totalY])
    x += grid.columns[i] ?? 0
  }
  let y = y0
  for (let i = 0; i <= grid.rows.length; i++) {
    lines.push([x0, y, x0 + totalX, y])
    y += grid.rows[i] ?? 0
  }
  return { lines, bounds: { x: x0, y: y0, width: totalX, height: totalY } }
}

/** Parses "20 30 20", "20, 30, 20" or "12,5; 10" into sizes in meters; null if invalid. */
export function parseGridSizes(text: string): number[] | null {
  const parts = text
    .trim()
    .split(/\s*;\s*|\s+|,\s+/)
    .flatMap((part) => ((part.match(/,/g) ?? []).length > 1 ? part.split(',') : [part]))
    .filter((part) => part !== '')
  if (parts.length === 0 || parts.length > MAX_CUSTOM_PARTS) return null
  const sizes = parts.map((part) => Number(part.replace(',', '.')))
  return sizes.every((n) => Number.isFinite(n) && n > 0 && n <= MAX_CUSTOM_SIZE) ? sizes : null
}

/** Zone labels to show for a grid (numbers of the club grid, letters of the letter grids). */
export function gridLabels(grid: GridType): GridLabel[] {
  if (grid === 'zones20')
    return zones20Layout().labels.map((l) => ({ text: String(l.number), x: l.x, y: l.y, cell: l.cell }))
  if (grid === 'lettersLong' || grid === 'lettersAcross' || grid === 'letters3x2') return letterLayout(grid).labels
  return []
}

type Cell = { x1: number; y1: number; x2: number; y2: number }

/**
 * Zones of a grid as rectangles. Grids made of lines across the whole pitch (or the own grid's
 * area) give every crossing cell; the club grid has its own zones in its own order.
 */
export function gridCells(
  grid: GridType,
  custom: CustomGrid = DEFAULT_CUSTOM_GRID,
  size: FieldSize = BIG_PITCH,
): { cells: Cell[]; fixedOrder: boolean } {
  if (grid === 'none') return { cells: [], fixedOrder: false }
  if (grid === 'zones20' || grid === 'zones20Plain') return { cells: zones20Layout().labels.map((l) => l.cell), fixedOrder: true }
  const bounds =
    grid === 'custom'
      ? customGridLayout(custom).bounds
      : isSquareGrid(grid)
        ? { x: 0, y: 0, width: size.length, height: size.width }
        : { x: 0, y: 0, width: PITCH.length, height: PITCH.width }
  const x0 = bounds.x
  const x1 = bounds.x + bounds.width
  const y0 = bounds.y
  const y1 = bounds.y + bounds.height
  const inside = (v: number, a: number, b: number) => v > a + 1e-6 && v < b - 1e-6
  const lines = gridLines(grid, custom, size)
  const xs = [...new Set(lines.filter((l) => l[0] === l[2] && inside(l[0], x0, x1)).map((l) => l[0]))]
  const ys = [...new Set(lines.filter((l) => l[1] === l[3] && inside(l[1], y0, y1)).map((l) => l[1]))]
  const columns = [x0, ...xs.sort((a, b) => a - b), x1]
  const rows = [y0, ...ys.sort((a, b) => a - b), y1]
  const cells: Cell[] = []
  for (let r = 0; r < rows.length - 1; r++) {
    for (let c = 0; c < columns.length - 1; c++) {
      cells.push({ x1: columns[c], y1: rows[r], x2: columns[c + 1], y2: rows[r + 1] })
    }
  }
  return { cells, fixedOrder: false }
}

/** 1 → A, 26 → Z, 27 → AA … */
export function letterName(n: number): string {
  let name = ''
  let rest = n
  while (rest > 0) {
    const digit = (rest - 1) % 26
    name = String.fromCharCode(65 + digit) + name
    rest = Math.floor((rest - 1) / 26)
  }
  return name
}

const LABEL_SIZES: Record<GridLabelSize, { corner: number; center: number }> = {
  small: { corner: 1.6, center: 2.2 },
  medium: { corner: 2.2, center: 3.2 },
  large: { corner: 3.2, center: 4.6 },
}

/**
 * Zone labels for the pitch. Without own settings the grid's usual labels; with them every zone
 * gets a number or letter, counted row by row from the top left as seen on screen
 * (`upright` = 90 in portrait); the club grid keeps its own numbering.
 */
export function pitchGridLabels(style: PitchStyle, upright = 0, size: FieldSize = BIG_PITCH): GridLabel[] {
  const own = style.gridLabelStyle
  if (!own) return gridLabels(style.grid)
  if (own.kind === 'none') return []
  const { cells, fixedOrder } = gridCells(style.grid, style.customGrid, size)
  if (cells.length === 0) return []
  // Screen frame: in portrait the screen's x runs along the pitch width and its y against the length.
  const portrait = upright % 180 !== 0
  const toScreen = (x: number, y: number) => (portrait ? { x: y, y: -x } : { x, y })
  const fromScreen = (x: number, y: number) => (portrait ? { x: -y, y: x } : { x, y })
  const screenCells = cells.map((cell) => {
    const a = toScreen(cell.x1, cell.y1)
    const b = toScreen(cell.x2, cell.y2)
    return { cell, left: Math.min(a.x, b.x), right: Math.max(a.x, b.x), top: Math.min(a.y, b.y), bottom: Math.max(a.y, b.y) }
  })
  const ordered = fixedOrder
    ? screenCells
    : [...screenCells].sort((p, q) => (Math.abs(p.top - q.top) > 1e-6 ? p.top - q.top : p.left - q.left))
  const sizes = LABEL_SIZES[own.size]
  const text = (n: number) => (own.kind === 'letters' ? letterName(n) : String(n))
  // Outside only for strips: one row (labels above) or one column (labels to the left) on screen.
  const oneRow = new Set(ordered.map((c) => c.top.toFixed(3))).size === 1
  const oneColumn = new Set(ordered.map((c) => c.left.toFixed(3))).size === 1
  const position = own.position === 'outside' && !oneRow && !oneColumn ? 'corner' : own.position
  return ordered.map((c, i) => {
    const label = text(i + 1)
    const centerX = (c.cell.x1 + c.cell.x2) / 2
    const centerY = (c.cell.y1 + c.cell.y2) / 2
    if (position === 'corner') return { text: label, x: centerX, y: centerY, cell: c.cell, size: sizes.corner }
    if (position === 'center') return { text: label, x: centerX, y: centerY, size: sizes.center }
    const distance = OUTSIDE_LABEL_DISTANCE + (sizes.center - LABEL_SIZES.medium.center) / 2
    const at = oneColumn
      ? fromScreen(c.left - distance, (c.top + c.bottom) / 2)
      : fromScreen((c.left + c.right) / 2, c.top - distance)
    return { text: label, x: at.x, y: at.y, size: sizes.center }
  })
}

/**
 * Grids are laid out on the big pitch; on a smaller field they are stretched to its size
 * (the own grid keeps its sizes in meters and is only centred). Text shrinks with the field.
 */
export function fitGridToField(
  grid: GridType,
  size: { length: number; width: number },
): { point: (x: number, y: number) => { x: number; y: number }; textScale: number } {
  const sx = size.length / PITCH.length
  const sy = size.width / PITCH.width
  const textScale = Math.sqrt(sx * sy)
  if (sx === 1 && sy === 1) return { point: (x, y) => ({ x, y }), textScale: 1 }
  // Squares are laid out on the field itself (real meters), see gridLines.
  if (isSquareGrid(grid)) return { point: (x, y) => ({ x, y }), textScale }
  if (grid === 'custom') {
    const dx = (size.length - PITCH.length) / 2
    const dy = (size.width - PITCH.width) / 2
    return { point: (x, y) => ({ x: x + dx, y: y + dy }), textScale }
  }
  return { point: (x, y) => ({ x: x * sx, y: y * sy }), textScale }
}

/** Moves a grid label onto a smaller field (see fitGridToField). */
export function fitGridLabel(label: GridLabel, fit: ReturnType<typeof fitGridToField>, usualSize: number): GridLabel {
  const at = fit.point(label.x, label.y)
  const result: GridLabel = { ...label, x: at.x, y: at.y }
  if (fit.textScale !== 1) result.size = (label.size ?? usualSize) * fit.textScale
  if (label.cell) {
    const a = fit.point(label.cell.x1, label.cell.y1)
    const b = fit.point(label.cell.x2, label.cell.y2)
    result.cell = { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
  }
  return result
}

/**
 * Grid lines in meters ([x1, y1, x2, y2] each), relative to the full pitch.
 * Lanes follow the sides of the penalty and goal areas (wings, half-spaces, centre);
 * the positional grid adds cross lines at the penalty areas and the halfway line;
 * lanes with cross lines add one cross line in the middle of each half.
 */
export function gridLines(grid: GridType, custom: CustomGrid = DEFAULT_CUSTOM_GRID, size: FieldSize = BIG_PITCH): number[][] {
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
    case 'lanesCross':
      // Cross lines halfway between the penalty areas and the halfway line.
      return [...lanes, ...[(penaltyAreaDepth + length / 2) / 2, length - (penaltyAreaDepth + length / 2) / 2].map(vertical)]
    case 'positional':
      return [...lanes, ...[penaltyAreaDepth, length / 2, length - penaltyAreaDepth].map(vertical)]
    case 'zones20':
    case 'zones20Plain':
      return zones20Layout().lines
    case 'lettersLong':
    case 'lettersAcross':
    case 'letters3x2':
      return letterLayout(grid).lines
    case 'custom':
      return customGridLayout(custom).lines
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
      // Real squares on the field itself, lined up from its centre lines (halfway line and
      // the middle axis lengthwise), so both halves look the same.
      const step = Number(grid.slice('squares'.length))
      return [
        ...symmetricPositions(size.length / 2, step, size.length).map((x) => [x, 0, x, size.width]),
        ...symmetricPositions(size.width / 2, step, size.width).map((y) => [0, y, size.length, y]),
      ]
    }
  }
}

/** Distance of the retreat lines from the goal lines (meters) */
export const RETREAT_LINE_DISTANCE = 22

/** Longest notes text below the pitch */
export const MAX_NOTES_LENGTH = 2000
