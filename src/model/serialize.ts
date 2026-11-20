import { FIELD_TYPES, type FieldType } from '../field/dimensions'
import type { Orientation } from '../field/orientation'
import {
  DEFAULT_PITCH_STYLE,
  GRID_ORDER,
  MAX_CUSTOM_PARTS,
  MAX_CUSTOM_SIZE,
  type CustomGrid,
  LIGHTING_OPTIONS,
  MOWING_OPTIONS,
  type Lighting,
  type Mowing,
  PITCH_LINE_WIDTHS,
  type PitchLineWidth,
  PITCH_COLOR_ORDER,
  type GridType,
  type PitchColor,
  type PitchStyle,
} from '../field/pitchStyle'
import { clampItemSize, PLAYER_SHAPES } from '../items/palette'
import {
  clampFillOpacity,
  clampZoneSize,
  DEFAULT_ZONE_FILL_OPACITY,
  MAX_CORNERS,
  MAX_ZONE_SIZE,
  MIN_CORNERS,
  ZONE_GOAL_OPTIONS,
  ZONE_SHAPES,
} from '../items/zones'
import { legacyBendToPoints } from '../lines/geometry'
import { clampStep } from '../lines/steps'
import { drillInfoFromData, EMPTY_DRILL_INFO } from './drillInfo'
import { defaultPattern, LINE_PATTERNS, LINE_WEIGHTS, type LinePattern, type LineWeight } from '../lines/styles'
import type {
  Category,
  Drill,
  DrillArea,
  Item,
  ItemType,
  Line,
  LineType,
  PlayerShape,
  Point,
  Scene,
  Zone,
  ZoneGoals,
  ZoneShape,
} from './types'

export const FILE_FORMAT = 'trainingsplaner-drill'
// Version 2: lines with any number of waypoints (version 1 had start, end and one control point).
// Version 3: zones in scenes.
// Version 4: text boxes, player name tags and highlight, zone fill color and opacity.
// Version 5: equipment items (mini goal, slalom, dummy, wall, ladder) and zones with goals.
// Version 6: zones with free corners (rhombus, trapezoid, uneven shapes).
// Version 7: line patterns and weights, plain lines, zones with any number of corners.
// Version 8: numbered action steps on lines.
// Version 9: drill info (players, duration, field size, age group).
// Version 10: hurdle, ring, flag, marker disc and rebounder.
// Version 11: library area (training drill or tactics / line-up).
// Version 12: corner section fields (cornerLeft, cornerRight).
// Version 13: freehand lines (free, freeArrow).
// Version 14: more grids (zones without numbers, letter zones, own grid with sizes).
// Version 15: shirt-shaped players and coach items.
// Version 16: grass designs, pitch line width/color/rounded corners, ball designs, coordination grid.
// Version 17: mowing patterns, lighting, extra line weights.
export const FILE_VERSION = 17
export const DEFAULT_SCENE_DURATION_MS = 2000
export const DEFAULT_TITLE = 'Unbenannte Übung'

const ITEM_TYPES: ItemType[] = [
  'player',
  'ball',
  'cone',
  'goal',
  'minigoal',
  'pole',
  'slalom',
  'dummy',
  'wall',
  'ladder',
  'hurdle',
  'ring',
  'flag',
  'disc',
  'rebounder',
  'agility',
  'coach',
  'text',
  'textbox',
]
const LINE_TYPES: LineType[] = ['pass', 'run', 'dribble', 'shot', 'line', 'free', 'freeArrow']
export const CATEGORIES: Category[] = [
  'warmup',
  'technique',
  'passing',
  'shooting',
  'tactics',
  'game',
  'cooldown',
]

/** Thrown when a file cannot be loaded; the message is shown to the user. */
export class DrillFileError extends Error {}

export function emptyDrill(): Drill {
  return {
    title: DEFAULT_TITLE,
    description: '',
    category: null,
    area: 'drill',
    info: { ...EMPTY_DRILL_INFO },
    fieldType: 'full',
    pitch: { ...DEFAULT_PITCH_STYLE },
    scenes: [{ durationMs: DEFAULT_SCENE_DURATION_MS, items: [], lines: [], zones: [] }],
  }
}

export function serializeDrill(drill: Drill): string {
  return JSON.stringify({ format: FILE_FORMAT, version: FILE_VERSION, ...drill }, null, 2)
}

/** Parses and validates a saved drill. Throws DrillFileError with a German message. */
export function parseDrill(text: string): Drill {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new DrillFileError('Die Datei ist keine gültige JSON-Datei.')
  }
  if (!isRecord(data) || data.format !== FILE_FORMAT) {
    throw new DrillFileError('Die Datei ist keine Übung aus dem Trainingsplaner.')
  }
  if (typeof data.version !== 'number' || data.version > FILE_VERSION) {
    throw new DrillFileError('Die Datei stammt aus einer neueren Version des Trainingsplaners.')
  }
  return drillFromData(data)
}

/** Validates a drill object (without file header). Throws DrillFileError. */
export function drillFromData(data: unknown): Drill {
  if (
    !isRecord(data) ||

    typeof data.title !== 'string' ||
    typeof data.description !== 'string' ||
    !FIELD_TYPES.includes(data.fieldType as FieldType) ||
    !Array.isArray(data.scenes) ||
    data.scenes.length === 0 ||
    // Category was added later; older files have none.
    !(data.category === undefined || data.category === null || CATEGORIES.includes(data.category as Category))
  ) {
    throw corrupt()
  }
  const info = drillInfoFromData(data.info)
  if (!info) throw corrupt()
  // The area was added in version 11; older drills are training drills.
  if (!(data.area === undefined || data.area === 'drill' || data.area === 'tactic')) throw corrupt()
  return {
    title: data.title,
    description: data.description,
    area: (data.area as DrillArea | undefined) ?? 'drill',
    info,
    category: (data.category as Category | undefined) ?? null,
    fieldType: data.fieldType as FieldType,
    pitch: parsePitchStyle(data.pitch),
    scenes: data.scenes.map(parseScene),
  }
}

/** Turns a title into a safe file name (without extension). */
export function fileNameFromTitle(title: string): string {
  const cleaned = title
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\p{Cc}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || 'uebung'
}

function corrupt(): DrillFileError {
  return new DrillFileError('Die Datei ist beschädigt oder unvollständig.')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Pitch style was added later; older files get the default green pitch without grid. */
function parsePitchStyle(value: unknown): PitchStyle {
  if (value === undefined) return { ...DEFAULT_PITCH_STYLE }
  if (
    !isRecord(value) ||
    !PITCH_COLOR_ORDER.includes(value.color as PitchColor) ||
    !GRID_ORDER.includes(value.grid as GridType)
  ) {
    throw corrupt()
  }
  // Orientation was added later; older files are landscape.
  if (!(value.orientation === undefined || value.orientation === 'landscape' || value.orientation === 'portrait')) {
    throw corrupt()
  }
  const customGrid = value.customGrid === undefined ? undefined : parseCustomGrid(value.customGrid)
  // Line settings were added in version 16; missing values mean the usual lines.
  if (
    !(value.lineWidth === undefined || PITCH_LINE_WIDTHS.some((w) => w.value === value.lineWidth)) ||
    !(value.lineColor === undefined || typeof value.lineColor === 'string') ||
    !(value.roundedCorners === undefined || typeof value.roundedCorners === 'boolean') ||
    // Mowing and lighting were added in version 17.
    !(value.mowing === undefined || MOWING_OPTIONS.some((o) => o.value === value.mowing)) ||
    !(value.lighting === undefined || LIGHTING_OPTIONS.some((o) => o.value === value.lighting))
  ) {
    throw corrupt()
  }
  return {
    color: value.color as PitchColor,
    grid: value.grid as GridType,
    orientation: (value.orientation as Orientation | undefined) ?? 'landscape',
    ...(customGrid ? { customGrid } : {}),
    ...(value.lineWidth && value.lineWidth !== 'normal' ? { lineWidth: value.lineWidth as PitchLineWidth } : {}),
    ...(typeof value.lineColor === 'string' ? { lineColor: value.lineColor } : {}),
    ...(value.roundedCorners === true ? { roundedCorners: true } : {}),
    ...(typeof value.mowing === 'string' ? { mowing: value.mowing as Mowing } : {}),
    ...(typeof value.lighting === 'string' ? { lighting: value.lighting as Lighting } : {}),
  }
}

function parseCustomGrid(value: unknown): CustomGrid {
  const sizes = (list: unknown): number[] => {
    if (
      !Array.isArray(list) ||
      list.length === 0 ||
      list.length > MAX_CUSTOM_PARTS ||
      !list.every((n) => isNumber(n) && n > 0 && n <= MAX_CUSTOM_SIZE)
    ) {
      throw corrupt()
    }
    return list as number[]
  }
  if (!isRecord(value)) throw corrupt()
  return { columns: sizes(value.columns), rows: sizes(value.rows) }
}

function parsePoint(value: unknown): Point {
  if (!isRecord(value) || !isNumber(value.x) || !isNumber(value.y)) throw corrupt()
  return { x: value.x, y: value.y }
}

function parseItem(value: unknown): Item {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !ITEM_TYPES.includes(value.type as ItemType) ||
    !isNumber(value.x) ||
    !isNumber(value.y) ||
    !isNumber(value.rotation) ||
    // Size was added later; older files have none.
    !(value.size === undefined || isNumber(value.size)) ||
    // Shape was added later; older files only have circles.
    !(value.shape === undefined || PLAYER_SHAPES.includes(value.shape as PlayerShape)) ||
    typeof value.color !== 'string' ||
    typeof value.label !== 'string' ||
    // Name tag and highlight were added in version 4.
    !(value.name === undefined || typeof value.name === 'string') ||
    !(value.highlight === undefined || typeof value.highlight === 'boolean')
  ) {
    throw corrupt()
  }
  return {
    id: value.id,
    type: value.type as ItemType,
    x: value.x,
    y: value.y,
    rotation: value.rotation,
    size: value.size === undefined ? 1 : clampItemSize(value.size),
    shape: (value.shape as PlayerShape | undefined) ?? 'circle',
    color: value.color,
    label: value.label,
    name: (value.name as string | undefined) ?? '',
    highlight: (value.highlight as boolean | undefined) ?? false,
  }
}

/** Reads the waypoints; converts the old format (start, end, control point) on the fly. */
function parseLinePath(value: Record<string, unknown>): Pick<Line, 'points' | 'smooth'> {
  const points = (value.points as unknown[]).map(parsePoint)
  if ('control' in value) {
    if (points.length !== 2) throw corrupt()
    const control = value.control === null ? null : parsePoint(value.control)
    return { points: legacyBendToPoints(points[0], points[1], control), smooth: true }
  }
  if (typeof value.smooth !== 'boolean') throw corrupt()
  return { points, smooth: value.smooth }
}

function parseLine(value: unknown): Line {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !LINE_TYPES.includes(value.type as LineType) ||
    !Array.isArray(value.points) ||
    value.points.length < 2 ||
    typeof value.color !== 'string' ||
    // Pattern and weight were added in version 7.
    !(value.pattern === undefined || LINE_PATTERNS.includes(value.pattern as LinePattern)) ||
    !(value.weight === undefined || LINE_WEIGHTS.includes(value.weight as LineWeight)) ||
    // Steps were added in version 8.
    !(value.step === undefined || value.step === null || isNumber(value.step))
  ) {
    throw corrupt()
  }
  const type = value.type as LineType
  return {
    id: value.id,
    type,
    ...parseLinePath(value),
    color: value.color,
    pattern: (value.pattern as LinePattern | undefined) ?? defaultPattern(type),
    weight: (value.weight as LineWeight | undefined) ?? 'medium',
    step: typeof value.step === 'number' ? clampStep(value.step) : null,
  }
}

function parseCorners(value: unknown, shape: ZoneShape): Point[] | null {
  if (value === undefined || value === null) return null
  const corners = (value as unknown[]).map(parsePoint)
  // Since version 7 the outline may have any number of corners (rectangles and triangles only).
  if (shape === 'ellipse' || corners.length < MIN_CORNERS || corners.length > MAX_CORNERS) throw corrupt()
  return corners.map((p) => ({
    x: Math.min(Math.max(p.x, -MAX_ZONE_SIZE), MAX_ZONE_SIZE),
    y: Math.min(Math.max(p.y, -MAX_ZONE_SIZE), MAX_ZONE_SIZE),
  }))
}

function parseZone(value: unknown): Zone {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !ZONE_SHAPES.includes(value.shape as ZoneShape) ||
    !isNumber(value.x) ||
    !isNumber(value.y) ||
    !isNumber(value.width) ||
    !isNumber(value.height) ||
    !isNumber(value.rotation) ||
    typeof value.color !== 'string' ||
    // Separate fill color and opacity were added in version 4.
    !(value.fillColor === undefined || typeof value.fillColor === 'string') ||
    !(value.fillOpacity === undefined || isNumber(value.fillOpacity)) ||
    typeof value.dashed !== 'boolean' ||
    // Built-in goals were added in version 5.
    !(value.goals === undefined || ZONE_GOAL_OPTIONS.includes(value.goals as ZoneGoals)) ||
    // Free corners were added in version 6.
    !(value.corners === undefined || value.corners === null || Array.isArray(value.corners)) ||
    typeof value.label !== 'string'
  ) {
    throw corrupt()
  }
  return {
    id: value.id,
    shape: value.shape as ZoneShape,
    x: value.x,
    y: value.y,
    width: clampZoneSize(value.width),
    height: clampZoneSize(value.height),
    rotation: value.rotation,
    color: value.color,
    fillColor: (value.fillColor as string | undefined) ?? value.color,
    fillOpacity:
      value.fillOpacity === undefined ? DEFAULT_ZONE_FILL_OPACITY : clampFillOpacity(value.fillOpacity as number),
    dashed: value.dashed,
    label: value.label,
    goals: (value.goals as ZoneGoals | undefined) ?? 0,
    corners: parseCorners(value.corners, value.shape as ZoneShape),
  }
}

function parseScene(value: unknown): Scene {
  if (
    !isRecord(value) ||
    !isNumber(value.durationMs) ||
    value.durationMs <= 0 ||
    !Array.isArray(value.items) ||
    !Array.isArray(value.lines) ||
    // Zones were added in version 3.
    !(value.zones === undefined || Array.isArray(value.zones))
  ) {
    throw corrupt()
  }
  const scene: Scene = {
    durationMs: value.durationMs,
    items: value.items.map(parseItem),
    lines: value.lines.map(parseLine),
    zones: ((value.zones as unknown[] | undefined) ?? []).map(parseZone),
  }
  const ids = [...scene.items, ...scene.lines, ...scene.zones].map((e) => e.id)
  if (new Set(ids).size !== ids.length) throw corrupt()
  return scene
}
