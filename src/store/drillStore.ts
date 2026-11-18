import { create } from 'zustand'
import { nextSceneFrom } from '../animation/scenes'
import type { FieldType } from '../field/dimensions'
import type { GridType, PitchColor, PitchStyle } from '../field/pitchStyle'
import { clampItemSize, DEFAULT_PLAYER_SIZE, type NewItem } from '../items/palette'
import { clampZoneSize, DEFAULT_ZONE_COLOR, DEFAULT_ZONE_SIZE } from '../items/zones'
import { emptyDrill } from '../model/serialize'
import type { Category, Drill, Item, Line, LineType, PlayerShape, Point, Scene, Zone, ZoneShape } from '../model/types'

/** The undoable part of a drill, plus the scene that was shown (undo jumps back to it). */
export interface DrillContent {
  fieldType: FieldType
  pitch: PitchStyle
  scenes: Scene[]
  sceneIndex: number
}

export const HISTORY_LIMIT = 100
/** Offset (meters) of a copy relative to its original. */
export const COPY_OFFSET = 2
export const MIN_SCENE_DURATION_MS = 200
export const MAX_SCENE_DURATION_MS = 60_000

export interface DrillState extends DrillContent {
  title: string
  description: string
  category: Category | null
  selectedId: string | null
  past: DrillContent[]
  future: DrillContent[]

  // Title, description and category are not part of undo (every keystroke would be a step).
  setTitle: (title: string) => void
  setDescription: (description: string) => void
  setCategory: (category: Category | null) => void
  setFieldType: (fieldType: FieldType) => void
  setPitchColor: (color: PitchColor) => void
  setGrid: (grid: GridType) => void
  select: (id: string | null) => void

  selectScene: (index: number) => void
  /** Adds the follow-up scene after the current one (lines applied) and shows it. */
  addScene: () => void
  deleteScene: () => void
  setSceneDuration: (durationMs: number) => void

  // The following act on the current scene.
  /** Adds an item at the given position (meters) and returns its id. */
  addItem: (item: NewItem, x: number, y: number) => string
  moveItem: (id: string, x: number, y: number) => void
  rotateItem: (id: string, rotation: number) => void
  setItemSize: (id: string, size: number) => void
  setItemShape: (id: string, shape: PlayerShape) => void
  /** Gives every item of the current scene the same size. */
  setAllItemSizes: (size: number) => void
  /** Adds a straight line (meters) and returns its id. */
  addLine: (type: LineType, start: Point, end: Point, color: string) => string
  moveLine: (id: string, dx: number, dy: number) => void
  /** Removes a bend (not the start or end point). */
  removeLinePoint: (id: string, index: number) => void
  /** Removes all bends: only start and end remain. */
  clearLineBends: (id: string) => void
  setLineSmooth: (id: string, smooth: boolean) => void
  /** Adds a zone centered at the given position (meters) and returns its id. */
  addZone: (shape: ZoneShape, x: number, y: number) => string
  /** Changes a zone (position, size, rotation, color, outline) as one undo step. */
  updateZone: (id: string, change: Partial<Omit<Zone, 'id'>>) => void
  /** Inserts an offset copy of an item, line or zone, selects it and returns its id. */
  insertCopy: (element: Element) => string
  deleteElement: (id: string) => void

  // Live edits (while dragging or typing) do not create history entries on their own.
  // Take a snapshot() before and call pushHistory(snapshot) when the edit is finished.
  setItemRotation: (id: string, rotation: number) => void
  setItemLabel: (id: string, label: string) => void
  setZoneLabel: (id: string, label: string) => void
  setLinePoint: (id: string, index: number, point: Point) => void
  /** Inserts a bend before waypoint `index` (live edit). */
  insertLinePoint: (id: string, index: number, point: Point) => void
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

/** Next free shirt number for players of the given color and shape (e.g. red triangles count separately). */
export function nextPlayerNumber(items: Item[], color: string, shape: PlayerShape = 'circle'): number {
  let max = 0
  for (const item of items) {
    if (item.type !== 'player' || item.color !== color || item.shape !== shape) continue
    const n = Number.parseInt(item.label, 10)
    if (!Number.isNaN(n) && n > max) max = n
  }
  return max + 1
}

/** Anything that can be selected on the pitch. */
export type Element = Item | Line | Zone

export function isLine(element: Element): element is Line {
  return 'points' in element
}

export function isZone(element: Element): element is Zone {
  return 'width' in element
}

export function currentScene(state: Pick<DrillContent, 'scenes' | 'sceneIndex'>): Scene {
  return state.scenes[state.sceneIndex]
}

export const selectItems = (state: DrillState) => currentScene(state).items
export const selectLines = (state: DrillState) => currentScene(state).lines
export const selectZones = (state: DrillState) => currentScene(state).zones

export function findElement(
  scene: Pick<Scene, 'items' | 'lines' | 'zones'>,
  id: string | null,
): Element | undefined {
  if (!id) return undefined
  return (
    scene.items.find((i) => i.id === id) ??
    scene.lines.find((l) => l.id === id) ??
    scene.zones.find((z) => z.id === id)
  )
}

/** Builds the drill (as saved to a file) from the current state. */
export function currentDrill(
  state: Pick<DrillState, 'title' | 'description' | 'category' | 'fieldType' | 'pitch' | 'scenes'>,
): Drill {
  return {
    title: state.title,
    description: state.description,
    category: state.category,
    fieldType: state.fieldType,
    pitch: state.pitch,
    scenes: state.scenes,
  }
}

export function normalizeAngle(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

function contentOf(state: DrillContent): DrillContent {
  return { fieldType: state.fieldType, pitch: state.pitch, scenes: state.scenes, sceneIndex: state.sceneIndex }
}

/** History fields for a state change that should be undoable. */
function recorded(state: DrillState, before: DrillContent = contentOf(state)) {
  return { past: [...state.past, before].slice(-HISTORY_LIMIT), future: [] as DrillContent[] }
}

/** Replaces the current scene with a changed copy. */
function editScene(state: DrillState, change: (scene: Scene) => Partial<Scene>): Scene[] {
  return state.scenes.map((scene, i) => (i === state.sceneIndex ? { ...scene, ...change(scene) } : scene))
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

/** State after undo/redo: keep the selection only if it still exists in the shown scene. */
function restore(content: DrillContent, selectedId: string | null) {
  const sceneIndex = Math.min(content.sceneIndex, content.scenes.length - 1)
  return {
    ...content,
    sceneIndex,
    selectedId: findElement(content.scenes[sceneIndex], selectedId) ? selectedId : null,
  }
}

function stateFromDrill(drill: Drill) {
  return {
    title: drill.title,
    description: drill.description,
    category: drill.category,
    fieldType: drill.fieldType,
    pitch: drill.pitch,
    scenes: drill.scenes.length > 0 ? drill.scenes : emptyDrill().scenes,
    sceneIndex: 0,
    selectedId: null,
    past: [],
    future: [],
  }
}

export const useDrillStore = create<DrillState>((set, get) => ({
  ...stateFromDrill(emptyDrill()),

  setTitle: (title) => set({ title }),
  setDescription: (description) => set({ description }),
  setCategory: (category) => set({ category }),
  setFieldType: (fieldType) =>
    set((s) => (s.fieldType === fieldType ? {} : { ...recorded(s), fieldType })),
  setPitchColor: (color) =>
    set((s) => (s.pitch.color === color ? {} : { ...recorded(s), pitch: { ...s.pitch, color } })),
  setGrid: (grid) =>
    set((s) => (s.pitch.grid === grid ? {} : { ...recorded(s), pitch: { ...s.pitch, grid } })),
  select: (selectedId) => set({ selectedId }),

  selectScene: (index) =>
    set((s) =>
      index < 0 || index >= s.scenes.length ? {} : { sceneIndex: index, selectedId: null },
    ),
  addScene: () =>
    set((s) => {
      const scenes = [...s.scenes]
      scenes.splice(s.sceneIndex + 1, 0, nextSceneFrom(currentScene(s)))
      return { ...recorded(s), scenes, sceneIndex: s.sceneIndex + 1, selectedId: null }
    }),
  deleteScene: () =>
    set((s) => {
      if (s.scenes.length <= 1) return {}
      const scenes = s.scenes.filter((_, i) => i !== s.sceneIndex)
      return {
        ...recorded(s),
        scenes,
        sceneIndex: Math.min(s.sceneIndex, scenes.length - 1),
        selectedId: null,
      }
    }),
  setSceneDuration: (durationMs) =>
    set((s) => {
      const clamped = Math.min(Math.max(durationMs, MIN_SCENE_DURATION_MS), MAX_SCENE_DURATION_MS)
      if (currentScene(s).durationMs === clamped) return {}
      return { ...recorded(s), scenes: editScene(s, () => ({ durationMs: clamped })) }
    }),

  addItem: (item, x, y) => {
    const s = get()
    const items = currentScene(s).items
    const label =
      item.label ??
      (item.type === 'player' ? String(nextPlayerNumber(items, item.color, item.shape ?? 'circle')) : '')
    const newItem: Item = {
      id: createId('item'),
      type: item.type,
      x,
      y,
      rotation: item.rotation ?? 0,
      size: clampItemSize(item.size ?? (item.type === 'player' ? DEFAULT_PLAYER_SIZE : 1)),
      shape: item.shape ?? 'circle',
      color: item.color,
      label,
    }
    set({ ...recorded(s), scenes: editScene(s, (scene) => ({ items: [...scene.items, newItem] })) })
    return newItem.id
  },
  moveItem: (id, x, y) =>
    set((s) => ({
      ...recorded(s),
      scenes: editScene(s, (scene) => ({ items: updateItem(scene.items, id, { x, y }) })),
    })),
  rotateItem: (id, rotation) =>
    set((s) => ({
      ...recorded(s),
      scenes: editScene(s, (scene) => ({
        items: updateItem(scene.items, id, { rotation: normalizeAngle(rotation) }),
      })),
    })),

  setItemSize: (id, size) =>
    set((s) => ({
      ...recorded(s),
      scenes: editScene(s, (scene) => ({
        items: updateItem(scene.items, id, { size: clampItemSize(size) }),
      })),
    })),
  setItemShape: (id, shape) =>
    set((s) => ({
      ...recorded(s),
      scenes: editScene(s, (scene) => ({ items: updateItem(scene.items, id, { shape }) })),
    })),
  setAllItemSizes: (size) =>
    set((s) => ({
      ...recorded(s),
      scenes: editScene(s, (scene) => ({
        items: scene.items.map((item) => ({ ...item, size: clampItemSize(size) })),
      })),
    })),

  addLine: (type, start, end, color) => {
    const line: Line = { id: createId('line'), type, points: [start, end], smooth: true, color }
    set((s) => ({
      ...recorded(s),
      scenes: editScene(s, (scene) => ({ lines: [...scene.lines, line] })),
    }))
    return line.id
  },
  moveLine: (id, dx, dy) =>
    set((s) => ({
      ...recorded(s),
      scenes: editScene(s, (scene) => ({
        lines: updateLine(scene.lines, id, (line) => ({
          ...line,
          points: line.points.map((p) => shift(p, dx, dy)),
        })),
      })),
    })),

  removeLinePoint: (id, index) =>
    set((s) => {
      const line = currentScene(s).lines.find((l) => l.id === id)
      if (!line || index <= 0 || index >= line.points.length - 1) return {}
      return {
        ...recorded(s),
        scenes: editScene(s, (scene) => ({
          lines: updateLine(scene.lines, id, (l) => ({ ...l, points: l.points.filter((_, i) => i !== index) })),
        })),
      }
    }),
  clearLineBends: (id) =>
    set((s) => {
      const line = currentScene(s).lines.find((l) => l.id === id)
      if (!line || line.points.length <= 2) return {}
      return {
        ...recorded(s),
        scenes: editScene(s, (scene) => ({
          lines: updateLine(scene.lines, id, (l) => ({ ...l, points: [l.points[0], l.points[l.points.length - 1]] })),
        })),
      }
    }),
  setLineSmooth: (id, smooth) =>
    set((s) => ({
      ...recorded(s),
      scenes: editScene(s, (scene) => ({
        lines: updateLine(scene.lines, id, (l) => ({ ...l, smooth })),
      })),
    })),

  addZone: (shape, x, y) => {
    const zone: Zone = {
      id: createId('zone'),
      shape,
      x,
      y,
      ...DEFAULT_ZONE_SIZE[shape],
      rotation: 0,
      color: DEFAULT_ZONE_COLOR,
      dashed: false,
      label: '',
    }
    set((s) => ({ ...recorded(s), scenes: editScene(s, (scene) => ({ zones: [...scene.zones, zone] })) }))
    return zone.id
  },
  updateZone: (id, change) =>
    set((s) => {
      const clamped = { ...change }
      if (clamped.width !== undefined) clamped.width = clampZoneSize(clamped.width)
      if (clamped.height !== undefined) clamped.height = clampZoneSize(clamped.height)
      if (clamped.rotation !== undefined) clamped.rotation = normalizeAngle(clamped.rotation)
      return {
        ...recorded(s),
        scenes: editScene(s, (scene) => ({
          zones: scene.zones.map((z) => (z.id === id ? { ...z, ...clamped } : z)),
        })),
      }
    }),

  insertCopy: (element) => {
    const s = get()
    if (isZone(element)) {
      const copy: Zone = { ...element, id: createId('zone'), x: element.x + COPY_OFFSET, y: element.y + COPY_OFFSET }
      set({
        ...recorded(s),
        scenes: editScene(s, (scene) => ({ zones: [...scene.zones, copy] })),
        selectedId: copy.id,
      })
      return copy.id
    }
    if (isLine(element)) {
      const copy: Line = {
        ...element,
        id: createId('line'),
        points: element.points.map((p) => shift(p, COPY_OFFSET, COPY_OFFSET)),
      }
      set({
        ...recorded(s),
        scenes: editScene(s, (scene) => ({ lines: [...scene.lines, copy] })),
        selectedId: copy.id,
      })
      return copy.id
    }
    const numbered = element.type === 'player' && /^\d+$/.test(element.label)
    const copy: Item = {
      ...element,
      id: createId('item'),
      x: element.x + COPY_OFFSET,
      y: element.y + COPY_OFFSET,
      label: numbered
        ? String(nextPlayerNumber(currentScene(s).items, element.color, element.shape))
        : element.label,
    }
    set({
      ...recorded(s),
      scenes: editScene(s, (scene) => ({ items: [...scene.items, copy] })),
      selectedId: copy.id,
    })
    return copy.id
  },
  deleteElement: (id) =>
    set((s) => {
      if (!findElement(currentScene(s), id)) return {}
      return {
        ...recorded(s),
        scenes: editScene(s, (scene) => ({
          items: scene.items.filter((i) => i.id !== id),
          lines: scene.lines.filter((l) => l.id !== id),
          zones: scene.zones.filter((z) => z.id !== id),
        })),
        selectedId: s.selectedId === id ? null : s.selectedId,
      }
    }),

  setItemRotation: (id, rotation) =>
    set((s) => ({
      scenes: editScene(s, (scene) => ({
        items: updateItem(scene.items, id, { rotation: normalizeAngle(rotation) }),
      })),
    })),
  setItemLabel: (id, label) =>
    set((s) => ({
      scenes: editScene(s, (scene) => ({ items: updateItem(scene.items, id, { label }) })),
    })),
  setZoneLabel: (id, label) =>
    set((s) => ({
      scenes: editScene(s, (scene) => ({
        zones: scene.zones.map((z) => (z.id === id ? { ...z, label } : z)),
      })),
    })),
  setLinePoint: (id, index, point) =>
    set((s) => ({
      scenes: editScene(s, (scene) => ({
        lines: updateLine(scene.lines, id, (line) => {
          const points = [...line.points]
          points[index] = point
          return { ...line, points }
        }),
      })),
    })),
  insertLinePoint: (id, index, point) =>
    set((s) => ({
      scenes: editScene(s, (scene) => ({
        lines: updateLine(scene.lines, id, (line) => {
          if (index <= 0 || index >= line.points.length) return line
          const points = [...line.points]
          points.splice(index, 0, point)
          return { ...line, points }
        }),
      })),
    })),
  snapshot: () => contentOf(get()),
  pushHistory: (before) =>
    set((s) => {
      const changed =
        before.fieldType !== s.fieldType || before.pitch !== s.pitch || before.scenes !== s.scenes
      return changed ? recorded(s, before) : {}
    }),

  undo: () =>
    set((s) => {
      const previous = s.past.at(-1)
      if (!previous) return {}
      return {
        ...restore(previous, s.selectedId),
        past: s.past.slice(0, -1),
        future: [contentOf(s), ...s.future],
      }
    }),
  redo: () =>
    set((s) => {
      const next = s.future[0]
      if (!next) return {}
      return {
        ...restore(next, s.selectedId),
        past: [...s.past, contentOf(s)].slice(-HISTORY_LIMIT),
        future: s.future.slice(1),
      }
    }),
  loadDrill: (drill) => set(stateFromDrill(drill)),
  newDrill: () => set(stateFromDrill(emptyDrill())),
}))
