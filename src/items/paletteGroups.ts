// Groups of the sidebar: players, coaches, ball and goals, equipment, figures, markers,
// text and zones – so the long list of objects is easy to scan and can be folded.

import type { ItemType } from '../model/types'
import type { ItemTemplate } from './palette'

export type PaletteGroup = 'players' | 'coaches' | 'goals' | 'equipment' | 'figures' | 'markers' | 'text' | 'zones'

export const PALETTE_GROUPS: { key: PaletteGroup; name: string }[] = [
  { key: 'players', name: 'Spieler' },
  { key: 'coaches', name: 'Trainer' },
  { key: 'goals', name: 'Ball und Tore' },
  { key: 'equipment', name: 'Hütchen und Material' },
  { key: 'figures', name: 'Figuren und Dummys' },
  { key: 'markers', name: 'Marken' },
  { key: 'text', name: 'Text und Wappen' },
  { key: 'zones', name: 'Zonen' },
]

/** Groups open on a new device. */
export const DEFAULT_OPEN_GROUPS: PaletteGroup[] = ['players', 'goals', 'equipment']

const GROUP_OF_TYPE: Record<ItemType, PaletteGroup> = {
  player: 'players',
  coach: 'coaches',
  ball: 'goals',
  goal: 'goals',
  minigoal: 'goals',
  goalFront: 'goals',
  minigoalFront: 'goals',
  cone: 'equipment',
  pole: 'equipment',
  slalom: 'equipment',
  flagPole: 'equipment',
  discPole: 'equipment',
  flag: 'equipment',
  disc: 'equipment',
  ring: 'equipment',
  hurdle: 'equipment',
  ladder: 'equipment',
  agility: 'equipment',
  rebounder: 'equipment',
  wall: 'figures',
  dummy: 'figures',
  poleDummy: 'figures',
  figureDummy: 'figures',
  figure: 'figures',
  marker: 'markers',
  text: 'text',
  textbox: 'text',
  crest: 'text',
  image: 'text',
}

export function paletteGroup(template: ItemTemplate): PaletteGroup {
  return GROUP_OF_TYPE[template.item.type]
}

/** Search in the sidebar: every word must appear in the name (case and umlauts loosely). */
export function matchesSearch(name: string, query: string): boolean {
  const norm = (t: string) => t.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
  const text = norm(name)
  return norm(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word))
}
