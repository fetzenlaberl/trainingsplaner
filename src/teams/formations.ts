import { PITCH } from '../field/dimensions'
import type { Position, TeamPlayer } from './team'

/**
 * One position of a formation: depth 0 = own goal line, 1 = halfway line;
 * width 0 = top touchline, 1 = bottom touchline (team playing towards +x).
 */
export interface FormationSlot {
  position: Position
  depth: number
  width: number
}

export interface Formation {
  key: string
  name: string
  slots: FormationSlot[]
}

const s = (position: Position, depth: number, width: number): FormationSlot => ({ position, depth, width })
const GK = s('TW', 0.06, 0.5)
const BACK_FOUR = [s('LV', 0.32, 0.12), s('IV', 0.27, 0.37), s('IV', 0.27, 0.63), s('RV', 0.32, 0.88)]
const BACK_THREE = [s('IV', 0.27, 0.25), s('IV', 0.25, 0.5), s('IV', 0.27, 0.75)]
const BACK_FIVE = [s('LV', 0.38, 0.08), s('IV', 0.27, 0.3), s('IV', 0.25, 0.5), s('IV', 0.27, 0.7), s('RV', 0.38, 0.92)]

export const FORMATIONS: Formation[] = [
  {
    key: '4-4-2',
    name: '4-4-2',
    slots: [GK, ...BACK_FOUR, s('LM', 0.6, 0.12), s('ZM', 0.55, 0.38), s('ZM', 0.55, 0.62), s('RM', 0.6, 0.88), s('ST', 0.9, 0.38), s('ST', 0.9, 0.62)],
  },
  {
    key: '4-3-3',
    name: '4-3-3',
    slots: [GK, ...BACK_FOUR, s('ZDM', 0.5, 0.5), s('ZM', 0.6, 0.3), s('ZM', 0.6, 0.7), s('LA', 0.88, 0.14), s('ST', 0.93, 0.5), s('RA', 0.88, 0.86)],
  },
  {
    key: '4-2-3-1',
    name: '4-2-3-1',
    slots: [GK, ...BACK_FOUR, s('ZDM', 0.5, 0.38), s('ZDM', 0.5, 0.62), s('LM', 0.74, 0.14), s('ZOM', 0.72, 0.5), s('RM', 0.74, 0.86), s('ST', 0.93, 0.5)],
  },
  {
    key: '4-1-4-1',
    name: '4-1-4-1',
    slots: [GK, ...BACK_FOUR, s('ZDM', 0.47, 0.5), s('LM', 0.68, 0.12), s('ZM', 0.65, 0.38), s('ZM', 0.65, 0.62), s('RM', 0.68, 0.88), s('ST', 0.93, 0.5)],
  },
  {
    key: '3-5-2',
    name: '3-5-2',
    slots: [GK, ...BACK_THREE, s('LM', 0.6, 0.08), s('ZDM', 0.5, 0.5), s('ZM', 0.6, 0.32), s('ZM', 0.6, 0.68), s('RM', 0.6, 0.92), s('ST', 0.9, 0.38), s('ST', 0.9, 0.62)],
  },
  {
    key: '3-4-3',
    name: '3-4-3',
    slots: [GK, ...BACK_THREE, s('LM', 0.58, 0.1), s('ZM', 0.55, 0.38), s('ZM', 0.55, 0.62), s('RM', 0.58, 0.9), s('LA', 0.88, 0.16), s('ST', 0.93, 0.5), s('RA', 0.88, 0.84)],
  },
  {
    key: '5-3-2',
    name: '5-3-2',
    slots: [GK, ...BACK_FIVE, s('ZM', 0.58, 0.28), s('ZDM', 0.52, 0.5), s('ZM', 0.58, 0.72), s('ST', 0.9, 0.38), s('ST', 0.9, 0.62)],
  },
]

export type Side = 'left' | 'right'

/** Field position (meters) of a slot for a team whose own goal is on the given side. */
export function slotPosition(
  slot: FormationSlot,
  side: Side,
  size: { length: number; width: number } = PITCH,
): { x: number; y: number; rotation: number } {
  // Stay inside the own half with a little room to the lines (less room on small fields).
  const scale = Math.min(1, size.width / PITCH.width)
  const goalRoom = 3 * scale
  const sideRoom = 5 * scale
  const depthMeters = goalRoom + slot.depth * (size.length / 2 - goalRoom - 2 * scale)
  const y = sideRoom + slot.width * (size.width - 2 * sideRoom)
  return side === 'left'
    ? { x: depthMeters, y, rotation: 0 }
    : { x: size.length - depthMeters, y: size.width - y, rotation: 180 }
}

/**
 * Assigns players to the slots of a formation. Starters are preferred over substitutes;
 * a player whose position matches a slot gets that slot first, the rest fill up in list order.
 * Slots without a player get null (they are shown as numbered generic players).
 */
export function assignLineup(players: TeamPlayer[], formation: Formation): (TeamPlayer | null)[] {
  const ordered = [...players.filter((p) => p.starter), ...players.filter((p) => !p.starter)]
  const remaining = [...ordered]
  const result: (TeamPlayer | null)[] = formation.slots.map(() => null)

  // First pass: exact position matches.
  formation.slots.forEach((slot, i) => {
    const index = remaining.findIndex((p) => p.position === slot.position)
    if (index >= 0) result[i] = remaining.splice(index, 1)[0]
  })
  // Second pass: fill remaining slots in list order, but never put a goalkeeper in the field.
  formation.slots.forEach((slot, i) => {
    if (result[i]) return
    const index = remaining.findIndex((p) => (slot.position === 'TW') === (p.position === 'TW') || p.position === null)
    if (index >= 0) result[i] = remaining.splice(index, 1)[0]
  })
  return result
}
