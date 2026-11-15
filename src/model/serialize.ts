import { FIELD_TYPES, type FieldType } from '../field/dimensions'
import type { Category, Drill, Item, ItemType, Line, LineType, Point, Scene } from './types'

export const FILE_FORMAT = 'trainingsplaner-drill'
export const FILE_VERSION = 1
export const DEFAULT_SCENE_DURATION_MS = 2000
export const DEFAULT_TITLE = 'Unbenannte Übung'

const ITEM_TYPES: ItemType[] = ['player', 'ball', 'cone', 'goal', 'pole', 'text']
const LINE_TYPES: LineType[] = ['pass', 'run', 'dribble', 'shot']
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
    fieldType: 'full',
    scenes: [{ durationMs: DEFAULT_SCENE_DURATION_MS, items: [], lines: [] }],
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
  return {
    title: data.title,
    description: data.description,
    category: (data.category as Category | undefined) ?? null,
    fieldType: data.fieldType as FieldType,
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
    typeof value.color !== 'string' ||
    typeof value.label !== 'string'
  ) {
    throw corrupt()
  }
  return {
    id: value.id,
    type: value.type as ItemType,
    x: value.x,
    y: value.y,
    rotation: value.rotation,
    color: value.color,
    label: value.label,
  }
}

function parseLine(value: unknown): Line {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !LINE_TYPES.includes(value.type as LineType) ||
    !Array.isArray(value.points) ||
    value.points.length !== 2 ||
    typeof value.color !== 'string'
  ) {
    throw corrupt()
  }
  return {
    id: value.id,
    type: value.type as LineType,
    points: [parsePoint(value.points[0]), parsePoint(value.points[1])],
    control: value.control === null ? null : parsePoint(value.control),
    color: value.color,
  }
}

function parseScene(value: unknown): Scene {
  if (
    !isRecord(value) ||
    !isNumber(value.durationMs) ||
    value.durationMs <= 0 ||
    !Array.isArray(value.items) ||
    !Array.isArray(value.lines)
  ) {
    throw corrupt()
  }
  const scene: Scene = {
    durationMs: value.durationMs,
    items: value.items.map(parseItem),
    lines: value.lines.map(parseLine),
  }
  const ids = [...scene.items, ...scene.lines].map((e) => e.id)
  if (new Set(ids).size !== ids.length) throw corrupt()
  return scene
}
