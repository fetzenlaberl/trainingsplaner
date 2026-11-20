import type { Item, ItemType, PlayerShape } from '../model/types'

export type NewItem = Pick<Item, 'type' | 'color'> &
  Partial<Pick<Item, 'label' | 'rotation' | 'size' | 'shape' | 'name' | 'highlight' | 'facing'>>

export const PLAYER_SHAPES: PlayerShape[] = ['circle', 'triangle', 'cross', 'shirt']

/** Players start larger so they are easy to see on the full field. */
export const DEFAULT_PLAYER_SIZE = 1.5

/** The goalkeeper is labeled instead of numbered. */
export const KEEPER_LABEL = 'TM'

/** Placeholder label: the new player gets the next free letter (A, B, C …) instead of a number. */
export const NEXT_LETTER_LABEL = '#next-letter#'

/** Coaches: Trainer, Co-Trainer, Konditionstrainer, Tormanntrainer. */
export const COACH_ROLES: { label: string; name: string }[] = [
  { label: 'TR', name: 'Trainer' },
  { label: 'CO', name: 'Co-Trainer' },
  { label: 'KT', name: 'Konditionstrainer' },
  { label: 'TT', name: 'Tormanntrainer' },
]
export const COACH_COLOR = '#111827'

/** Ball designs; "training" is a white ball with colored segments. */
export const TRAINING_BALL = 'training'
export const BALL_STYLES: { value: string; name: string; swatch?: string }[] = [
  { value: '#ffffff', name: 'Klassisch' },
  { value: '#facc15', name: 'Gelb' },
  { value: '#f97316', name: 'Orange (Winterball)' },
  { value: '#ec4899', name: 'Pink' },
  {
    value: TRAINING_BALL,
    name: 'Trainingsball',
    swatch: 'conic-gradient(#2563eb 0 33%, #facc15 0 66%, #dc2626 0)',
  },
]

/** Coordination grid: squares per side (stored in the label) and side of one square in meters */
export const AGILITY_SQUARE = 1.2

/** Width of an imported picture on the pitch at size 1 (meters) */
export const IMAGE_BASE_WIDTH = 20

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

/** Colors for teams and players (bibs come in many colors). */
export const PLAYER_COLORS: { value: string; name: string }[] = [
  { value: '#dc2626', name: 'Rot' },
  { value: '#2563eb', name: 'Blau' },
  { value: '#facc15', name: 'Gelb' },
  { value: '#16a34a', name: 'Grün' },
  { value: '#f97316', name: 'Orange' },
  { value: '#7c3aed', name: 'Lila' },
  { value: '#ec4899', name: 'Pink' },
  { value: '#06b6d4', name: 'Türkis' },
  { value: '#ffffff', name: 'Weiß' },
  { value: '#111827', name: 'Schwarz' },
]

export const TEAM_COLORS = {
  red: '#dc2626',
  blue: '#2563eb',
  keeper: '#facc15',
} as const

/** Names of the plain symbols (no number, no arrow) */
const BARE_NAMES = { circle: 'Kreis', cross: 'Kreuz', triangle: 'Dreieck' } as const

/** Shirts without number */
const SHIRT_PLAIN_COLORS = [
  { key: 'red', name: 'Rot', color: TEAM_COLORS.red },
  { key: 'blue', name: 'Blau', color: TEAM_COLORS.blue },
  { key: 'yellow', name: 'Gelb', color: '#facc15' },
  { key: 'green', name: 'Grün', color: '#16a34a' },
]

function player(color: string, shape: PlayerShape): NewItem {
  return { type: 'player', color, shape, size: DEFAULT_PLAYER_SIZE }
}

export const ITEM_TEMPLATES: ItemTemplate[] = [
  { key: 'player-red', name: 'Spieler Rot', item: player(TEAM_COLORS.red, 'circle') },
  { key: 'player-blue', name: 'Spieler Blau', item: player(TEAM_COLORS.blue, 'circle') },
  { key: 'keeper', name: 'Torwart', item: { ...player(TEAM_COLORS.keeper, 'circle'), label: KEEPER_LABEL } },
  { key: 'triangle-red', name: 'Dreieck Rot', item: player(TEAM_COLORS.red, 'triangle') },
  { key: 'triangle-blue', name: 'Dreieck Blau', item: player(TEAM_COLORS.blue, 'triangle') },
  { key: 'cross-red', name: 'Kreuz Rot', item: player(TEAM_COLORS.red, 'cross') },
  { key: 'cross-blue', name: 'Kreuz Blau', item: player(TEAM_COLORS.blue, 'cross') },
  { key: 'shirt-red', name: 'Trikot Rot', item: player(TEAM_COLORS.red, 'shirt') },
  { key: 'shirt-blue', name: 'Trikot Blau', item: player(TEAM_COLORS.blue, 'shirt') },
  ...SHIRT_PLAIN_COLORS.map(({ key, name, color }) => ({
    key: `shirt-plain-${key}`,
    name: `Trikot ${name} ohne Nummer`,
    item: { ...player(color, 'shirt'), label: '' },
  })),
  { key: 'plain-red', name: 'Ohne Nummer Rot', item: { ...player(TEAM_COLORS.red, 'circle'), label: '' } },
  { key: 'plain-blue', name: 'Ohne Nummer Blau', item: { ...player(TEAM_COLORS.blue, 'circle'), label: '' } },
  ...(['circle', 'cross', 'triangle'] as const).flatMap((shape) =>
    (['red', 'blue'] as const).map((team) => ({
      key: `bare-${shape}-${team}`,
      name: `${BARE_NAMES[shape]} ${team === 'red' ? 'Rot' : 'Blau'} schlicht`,
      item: { ...player(TEAM_COLORS[team], shape), label: '', facing: false },
    })),
  ),
  { key: 'letter-red', name: 'Buchstabe Rot', item: { ...player(TEAM_COLORS.red, 'circle'), label: NEXT_LETTER_LABEL } },
  { key: 'letter-blue', name: 'Buchstabe Blau', item: { ...player(TEAM_COLORS.blue, 'circle'), label: NEXT_LETTER_LABEL } },
  ...COACH_ROLES.map((role) => ({
    key: `coach-${role.label}`,
    name: role.name,
    item: { type: 'coach' as const, color: COACH_COLOR, label: role.label, size: DEFAULT_PLAYER_SIZE },
  })),
  { key: 'ball', name: 'Ball', item: { type: 'ball', color: '#ffffff' } },
  { key: 'ball-training', name: 'Trainingsball', item: { type: 'ball', color: TRAINING_BALL } },
  { key: 'cone', name: 'Hütchen', item: { type: 'cone', color: '#f97316' } },
  { key: 'pole', name: 'Stange', item: { type: 'pole', color: '#facc15' } },
  { key: 'goal', name: 'Tor', item: { type: 'goal', color: '#ffffff' } },
  { key: 'minigoal', name: 'Minitor', item: { type: 'minigoal', color: '#ffffff' } },
  { key: 'slalom', name: 'Stangenreihe', item: { type: 'slalom', color: '#facc15' } },
  { key: 'dummy', name: 'Dummy', item: { type: 'dummy', color: '#2563eb' } },
  { key: 'pole-dummy', name: 'Stangendummy', item: { type: 'poleDummy', color: '#f97316', size: 1.6 } },
  { key: 'figure-dummy', name: 'Figurendummy', item: { type: 'figureDummy', color: '#2563eb', size: 1.6 } },
  { key: 'wall', name: 'Freistoßmauer', item: { type: 'wall', color: '#2563eb' } },
  { key: 'ladder', name: 'Koordinationsleiter', item: { type: 'ladder', color: '#facc15' } },
  { key: 'agility-3', name: 'Koordinationsraster 3×3', item: { type: 'agility', color: '#facc15', label: '3' } },
  { key: 'agility-4', name: 'Koordinationsraster 4×4', item: { type: 'agility', color: '#f97316', label: '4' } },
  { key: 'hurdle', name: 'Hürde', item: { type: 'hurdle', color: '#f97316' } },
  { key: 'ring', name: 'Ring', item: { type: 'ring', color: '#facc15' } },
  { key: 'flag', name: 'Fahne', item: { type: 'flag', color: '#dc2626' } },
  { key: 'disc', name: 'Markierungsteller', item: { type: 'disc', color: '#facc15' } },
  { key: 'rebounder', name: 'Rebounder', item: { type: 'rebounder', color: '#111827' } },
  { key: 'text', name: 'Text', item: { type: 'text', color: '#ffffff', label: 'Text' } },
  { key: 'textbox', name: 'Textfeld', item: { type: 'textbox', color: '#fde047', label: 'Anweisung' } },
  // Empty crest: the picture is chosen right after dropping it (picture id in the label).
  { key: 'crest', name: 'Wappen', item: { type: 'crest', color: '#ffffff', label: '' } },
]

/** Approximate size of each item type in meters (used for previews and hit areas). */
export const ITEM_EXTENT: Record<ItemType, number> = {
  player: 3.4,
  ball: 1.2,
  cone: 1.1,
  pole: 0.7,
  goal: 5.4,
  minigoal: 1.6,
  slalom: 6.6,
  dummy: 1,
  poleDummy: 2.8,
  figureDummy: 2.8,
  wall: 2.6,
  ladder: 4.2,
  hurdle: 1.2,
  ring: 0.9,
  flag: 1.1,
  disc: 0.6,
  rebounder: 1.4,
  agility: 5.2,
  coach: 3,
  image: 20,
  crest: 8,
  text: 6,
  textbox: 12,
}

/** Item types whose color can be chosen freely in the selection bar. */
export const COLORABLE_TYPES: ItemType[] = [
  'player',
  'cone',
  'pole',
  'slalom',
  'dummy',
  'poleDummy',
  'figureDummy',
  'wall',
  'ladder',
  'hurdle',
  'ring',
  'flag',
  'disc',
  'agility',
  'coach',
  'text',
]

/** Item types where rotation is visible. */
export const ROTATABLE_TYPES: ItemType[] = [
  'player',
  'goal',
  'minigoal',
  'slalom',
  'dummy',
  'wall',
  'ladder',
  'hurdle',
  'flag',
  'rebounder',
  'agility',
  'image',
  'crest',
  'text',
  'textbox',
]

/** Background colors for text boxes. */
export const TEXTBOX_COLORS: { value: string; name: string }[] = [
  { value: '#fde047', name: 'Gelb' },
  { value: '#ffffff', name: 'Weiß' },
  { value: '#dc2626', name: 'Rot' },
  { value: '#2563eb', name: 'Blau' },
  { value: '#16a34a', name: 'Grün' },
  { value: '#f97316', name: 'Orange' },
]

/** Crest pictures fit into a square of this size (meters) at size 1 */
export const CREST_SIZE = 8
