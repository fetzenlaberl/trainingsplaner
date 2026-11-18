import type { Item, ItemType, PlayerShape } from '../model/types'

export type NewItem = Pick<Item, 'type' | 'color'> &
  Partial<Pick<Item, 'label' | 'rotation' | 'size' | 'shape' | 'name' | 'highlight'>>

export const PLAYER_SHAPES: PlayerShape[] = ['circle', 'triangle', 'cross']

/** Players start larger so they are easy to see on the full field. */
export const DEFAULT_PLAYER_SIZE = 1.5

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

function player(color: string, shape: PlayerShape): NewItem {
  return { type: 'player', color, shape, size: DEFAULT_PLAYER_SIZE }
}

export const ITEM_TEMPLATES: ItemTemplate[] = [
  { key: 'player-red', name: 'Spieler Rot', item: player(TEAM_COLORS.red, 'circle') },
  { key: 'player-blue', name: 'Spieler Blau', item: player(TEAM_COLORS.blue, 'circle') },
  { key: 'keeper', name: 'Torwart', item: player(TEAM_COLORS.keeper, 'circle') },
  { key: 'triangle-red', name: 'Dreieck Rot', item: player(TEAM_COLORS.red, 'triangle') },
  { key: 'triangle-blue', name: 'Dreieck Blau', item: player(TEAM_COLORS.blue, 'triangle') },
  { key: 'cross-red', name: 'Kreuz Rot', item: player(TEAM_COLORS.red, 'cross') },
  { key: 'cross-blue', name: 'Kreuz Blau', item: player(TEAM_COLORS.blue, 'cross') },
  { key: 'ball', name: 'Ball', item: { type: 'ball', color: '#ffffff' } },
  { key: 'cone', name: 'Hütchen', item: { type: 'cone', color: '#f97316' } },
  { key: 'pole', name: 'Stange', item: { type: 'pole', color: '#facc15' } },
  { key: 'goal', name: 'Tor', item: { type: 'goal', color: '#ffffff' } },
  { key: 'text', name: 'Text', item: { type: 'text', color: '#ffffff', label: 'Text' } },
  { key: 'textbox', name: 'Textfeld', item: { type: 'textbox', color: '#fde047', label: 'Anweisung' } },
]

/** Approximate size of each item type in meters (used for previews and hit areas). */
export const ITEM_EXTENT: Record<ItemType, number> = {
  player: 3.4,
  ball: 1.2,
  cone: 1.1,
  pole: 0.7,
  goal: 5.4,
  text: 6,
  textbox: 12,
}

/** Item types where rotation is visible. */
export const ROTATABLE_TYPES: ItemType[] = ['player', 'goal', 'text', 'textbox']

/** Background colors for text boxes. */
export const TEXTBOX_COLORS: { value: string; name: string }[] = [
  { value: '#fde047', name: 'Gelb' },
  { value: '#ffffff', name: 'Weiß' },
  { value: '#dc2626', name: 'Rot' },
  { value: '#2563eb', name: 'Blau' },
  { value: '#16a34a', name: 'Grün' },
  { value: '#f97316', name: 'Orange' },
]
