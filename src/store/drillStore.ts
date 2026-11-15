import { create } from 'zustand'
import type { FieldType } from '../field/dimensions'
import type { NewItem } from '../items/palette'
import type { Item, Line, LineType, Point } from '../model/types'

interface DrillState {
  fieldType: FieldType
  items: Item[]
  lines: Line[]
  setFieldType: (fieldType: FieldType) => void
  /** Adds an item at the given position (meters) and returns its id. */
  addItem: (item: NewItem, x: number, y: number) => string
  moveItem: (id: string, x: number, y: number) => void
  /** Adds a straight line (meters) and returns its id. */
  addLine: (type: LineType, start: Point, end: Point, color: string) => string
  /** Bends a line (control point) or straightens it again (null). */
  setLineControl: (id: string, control: Point | null) => void
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

export const useDrillStore = create<DrillState>((set, get) => ({
  fieldType: 'full',
  items: [],
  lines: [],
  setFieldType: (fieldType) => set({ fieldType }),
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
    set({ items: [...items, newItem] })
    return newItem.id
  },
  moveItem: (id, x, y) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, x, y } : item)),
    })),
  addLine: (type, start, end, color) => {
    const line: Line = {
      id: createId('line'),
      type,
      points: [start, end],
      control: null,
      color,
    }
    set((state) => ({ lines: [...state.lines, line] }))
    return line.id
  },
  setLineControl: (id, control) =>
    set((state) => ({
      lines: state.lines.map((line) => (line.id === id ? { ...line, control } : line)),
    })),
}))
