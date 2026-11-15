import { create } from 'zustand'
import type { FieldType } from '../field/dimensions'
import type { NewItem } from '../items/palette'
import type { Item } from '../model/types'

interface DrillState {
  fieldType: FieldType
  items: Item[]
  setFieldType: (fieldType: FieldType) => void
  /** Adds an item at the given position (meters) and returns its id. */
  addItem: (item: NewItem, x: number, y: number) => string
  moveItem: (id: string, x: number, y: number) => void
}

let idCounter = 0

function createId(): string {
  idCounter += 1
  return `item-${Date.now().toString(36)}-${idCounter}`
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
  setFieldType: (fieldType) => set({ fieldType }),
  addItem: (item, x, y) => {
    const { items } = get()
    const label =
      item.label ?? (item.type === 'player' ? String(nextPlayerNumber(items, item.color)) : '')
    const newItem: Item = {
      id: createId(),
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
}))
