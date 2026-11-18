import type { Item, ItemType } from '../model/types'

export type NewItem = Pick<Item, 'type' | 'color'> & Partial<Pick<Item, 'label' | 'rotation' | 'size'>>

export const MIN_ITEM_SIZE = 0.5
export const MAX_ITEM_SIZE = 2.5
export const ITEM_SIZE_STEP = 0.25

/** Keeps a size factor in the allowed range (rounded to 2 decimals). */
export function clampItemSize(size: number): number {
  if (!Number.isFinite(size)) return 1
  return Math.round(Math.min(Math.max(size, MIN_ITEM_SIZE), MAX_ITEM_SIZE) * 100) / 100
}

export interface ItemTemplate {
  key: string
  /** Name shown in the sidebar */
  name: string
  item: NewItem
}

export const TEAM_COLORS = {
  red: '#dc2626',
  blue: '#2563eb',
  keeper: '#facc15',
} as const

export const ITEM_TEMPLATES: ItemTemplate[] = [
  { key: 'player-red', name: 'Spieler Rot', item: { type: 'player', color: TEAM_COLORS.red } },
  { key: 'player-blue', name: 'Spieler Blau', item: { type: 'player', color: TEAM_COLORS.blue } },
  { key: 'keeper', name: 'Torwart', item: { type: 'player', color: TEAM_COLORS.keeper } },
  { key: 'ball', name: 'Ball', item: { type: 'ball', color: '#ffffff' } },
  { key: 'cone', name: 'Hütchen', item: { type: 'cone', color: '#f97316' } },
  { key: 'pole', name: 'Stange', item: { type: 'pole', color: '#facc15' } },
  { key: 'goal', name: 'Tor', item: { type: 'goal', color: '#ffffff' } },
  { key: 'text', name: 'Text', item: { type: 'text', color: '#ffffff', label: 'Text' } },
]

/** Approximate size of each item type in meters (used for previews and hit areas). */
export const ITEM_EXTENT: Record<ItemType, number> = {
  player: 2.4,
  ball: 1.2,
  cone: 1.1,
  pole: 0.7,
  goal: 5.4,
  text: 6,
}

/** Item types where rotation is visible. */
export const ROTATABLE_TYPES: ItemType[] = ['player', 'goal', 'text']
