import { create } from 'zustand'
import type { FieldType } from '../field/dimensions'
import type { NewItem } from '../items/palette'
import { DEFAULT_SCENE_DURATION_MS, emptyDrill } from '../model/serialize'
import type { Drill, Item, Line, LineType, Point } from '../model/types'

/** The undoable part of a drill. */
export interface DrillContent {
  fieldType: FieldType
  items: Item[]
  lines: Line[]
}

export const HISTORY_LIMIT = 100
/** Offset (meters) of a copy relative to its original. */
export const COPY_OFFSET = 2

interface DrillState extends DrillContent {
  title: string
  description: string
  selectedId: string | null
  past: DrillContent[]
  future: DrillContent[]

  setTitle: (title: string) => void
  setFieldType: (fieldType: FieldType) => void
  select: (id: string | null) => void
  /** Adds an item at the given position (meters) and returns its id. */
  addItem: (item: NewItem, x: number, y: number) => string
  moveItem: (id: string, x: number, y: number) => void
  rotateItem: (id: string, rotation: number) => void
  /** Adds a straight line (meters) and returns its id. */
  addLine: (type: LineType, start: Point, end: Point, color: string) => string
  moveLine: (id: string, dx: number, dy: number) => void
  /** Inserts an offset copy of an item or line, selects it and returns its id. */
  insertCopy: (element: Item | Line) => string
  deleteElement: (id: string) => void

  // Live edits (while dragging or typing) do not create history entries on their own.
  // Take a snapshot() before and call pushHistory(snapshot) when the edit is finished.
  setItemRotation: (id: string, rotation: number) => void
  setItemLabel: (id: string, label: string) => void
  setLinePoint: (id: string, index: 0 | 1, point: Point) => void
  /** Bends a line (control point) or straightens it again (null). */
  setLineControl: (id: string, control: Point | null) => void
  snapshot: () => DrillContent
  pushHistory: (before: DrillContent) => void

  undo: () => void
  redo: () => void
  loadDrill: (drill: Drill) => void
  newDrill: () => void
}

let idCounter = 0

function createId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${idCounter}`
}

/** Next free shirt number for players of the given color. */
export function nextPlayerNumber(items: Item[], color: string): number {
  let max = 0
  for (const item of items) {
    if (item.type !== 'player' || item.color !== color) continue
    const n = Number.parseInt(item.label, 10)
    if (!Number.isNaN(n) && n > max) max = n
  }
  return max + 1
}

export function isLine(element: Item | Line): element is Line {
  return 'points' in element
}

export function findElement(state: DrillContent, id: string | null): Item | Line | undefined {
  if (!id) return undefined
  return state.items.find((i) => i.id === id) ?? state.lines.find((l) => l.id === id)
}

/** Builds the drill (as saved to a file) from the current state. */
export function currentDrill(state: DrillContent & { title: string; description: string }): Drill {
  return {
    title: state.title,
    description: state.description,
    fieldType: state.fieldType,
    scenes: [{ durationMs: DEFAULT_SCENE_DURATION_MS, items: state.items, lines: state.lines }],
  }
}

export function normalizeAngle(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

function contentOf(state: DrillContent): DrillContent {
  return { fieldType: state.fieldType, items: state.items, lines: state.lines }
}

/** History fields for a state change that should be undoable. */
function recorded(state: DrillState, before: DrillContent = contentOf(state)) {
  return { past: [...state.past, before].slice(-HISTORY_LIMIT), future: [] as DrillContent[] }
}

function updateItem(items: Item[], id: string, change: Partial<Item>): Item[] {
  return items.map((item) => (item.id === id ? { ...item, ...change } : item))
}

function updateLine(lines: Line[], id: string, update: (line: Line) => Line): Line[] {
  return lines.map((line) => (line.id === id ? update(line) : line))
}

function shift(p: Point, dx: number, dy: number): Point {
  return { x: p.x + dx, y: p.y + dy }
}

function stateFromDrill(drill: Drill) {
  const scene = drill.scenes[0]
  return {
    title: drill.title,
    description: drill.description,
    fieldType: drill.fieldType,
    items: scene?.items ?? [],
    lines: scene?.lines ?? [],
    selectedId: null,
    past: [],
    future: [],
  }
}

export const useDrillStore = create<DrillState>((set, get) => ({
  ...stateFromDrill(emptyDrill()),

  setTitle: (title) => set({ title }),
  setFieldType: (fieldType) =>
    set((s) => (s.fieldType === fieldType ? {} : { ...recorded(s), fieldType })),
  select: (selectedId) => set({ selectedId }),

  addItem: (item, x, y) => {
    const { items } = get()
    const label =
      item.label ?? (item.type === 'player' ? String(nextPlayerNumber(items, item.color)) : '')
    const newItem: Item = {
      id: createId('item'),
      type: item.type,
      x,
      y,
      rotation: item.rotation ?? 0,
      color: item.color,
      label,
    }
    set((s) => ({ ...recorded(s), items: [...s.items, newItem] }))
    return newItem.id
  },
  moveItem: (id, x, y) =>
    set((s) => ({ ...recorded(s), items: updateItem(s.items, id, { x, y }) })),
  rotateItem: (id, rotation) =>
    set((s) => ({
      ...recorded(s),
      items: updateItem(s.items, id, { rotation: normalizeAngle(rotation) }),
    })),

  addLine: (type, start, end, color) => {
    const line: Line = { id: createId('line'), type, points: [start, end], control: null, color }
    set((s) => ({ ...recorded(s), lines: [...s.lines, line] }))
    return line.id
  },
  moveLine: (id, dx, dy) =>
    set((s) => ({
      ...recorded(s),
      lines: updateLine(s.lines, id, (line) => ({
        ...line,
        points: [shift(line.points[0], dx, dy), shift(line.points[1], dx, dy)],
        control: line.control && shift(line.control, dx, dy),
      })),
    })),

  insertCopy: (element) => {
    const s = get()
    if (isLine(element)) {
      const copy: Line = {
        ...element,
        id: createId('line'),
        points: [
          shift(element.points[0], COPY_OFFSET, COPY_OFFSET),
          shift(element.points[1], COPY_OFFSET, COPY_OFFSET),
        ],
        control: element.control && shift(element.control, COPY_OFFSET, COPY_OFFSET),
      }
      set({ ...recorded(s), lines: [...s.lines, copy], selectedId: copy.id })
      return copy.id
    }
    const numbered = element.type === 'player' && /^\d+$/.test(element.label)
    const copy: Item = {
      ...element,
      id: createId('item'),
      x: element.x + COPY_OFFSET,
      y: element.y + COPY_OFFSET,
      label: numbered ? String(nextPlayerNumber(s.items, element.color)) : element.label,
    }
    set({ ...recorded(s), items: [...s.items, copy], selectedId: copy.id })
    return copy.id
  },
  deleteElement: (id) =>
    set((s) => {
      if (!findElement(s, id)) return {}
      return {
        ...recorded(s),
        items: s.items.filter((i) => i.id !== id),
        lines: s.lines.filter((l) => l.id !== id),
        selectedId: s.selectedId === id ? null : s.selectedId,
      }
    }),

  setItemRotation: (id, rotation) =>
    set((s) => ({ items: updateItem(s.items, id, { rotation: normalizeAngle(rotation) }) })),
  setItemLabel: (id, label) => set((s) => ({ items: updateItem(s.items, id, { label }) })),
  setLinePoint: (id, index, point) =>
    set((s) => ({
      lines: updateLine(s.lines, id, (line) => {
        const points: [Point, Point] = [...line.points]
        points[index] = point
        return { ...line, points }
      }),
    })),
  setLineControl: (id, control) =>
    set((s) => ({ lines: updateLine(s.lines, id, (line) => ({ ...line, control })) })),
  snapshot: () => contentOf(get()),
  pushHistory: (before) =>
    set((s) => {
      const changed =
        before.fieldType !== s.fieldType || before.items !== s.items || before.lines !== s.lines
      return changed ? recorded(s, before) : {}
    }),

  undo: () =>
    set((s) => {
      const previous = s.past.at(-1)
      if (!previous) return {}
      return {
        ...previous,
        past: s.past.slice(0, -1),
        future: [contentOf(s), ...s.future],
        selectedId: findElement(previous, s.selectedId) ? s.selectedId : null,
      }
    }),
  redo: () =>
    set((s) => {
      const next = s.future[0]
      if (!next) return {}
      return {
        ...next,
        past: [...s.past, contentOf(s)].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
        selectedId: findElement(next, s.selectedId) ? s.selectedId : null,
      }
    }),
  loadDrill: (drill) => set(stateFromDrill(drill)),
  newDrill: () => set(stateFromDrill(emptyDrill())),
}))
