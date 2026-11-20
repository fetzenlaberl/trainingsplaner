import { PITCH } from '../field/dimensions'
import { basePosition, isKeeper, type Position, type TeamPlayer } from './team'

/**
 * One position of a formation: depth 0 = own goal line, 1 = halfway line;
 * width 0 = top touchline, 1 = bottom touchline (team playing towards +x).
 */
export interface FormationSlot {
  position: Position
  depth: number
  width: number
}

export type FormationGroup = 'defensive' | 'offensive'

export interface Formation {
  key: string
  name: string
  group: FormationGroup
  slots: FormationSlot[]
}

export const FORMATION_GROUPS: { key: FormationGroup; label: string }[] = [
  { key: 'defensive', label: 'Defensive Spielsysteme' },
  { key: 'offensive', label: 'Offensive Spielsysteme' },
]

const s = (position: Position, depth: number, width: number): FormationSlot => ({ position, depth, width })
const GK = s('TW', 0.06, 0.5)
const BACK_FOUR = [s('LV', 0.32, 0.12), s('IV', 0.27, 0.37), s('IV', 0.27, 0.63), s('RV', 0.32, 0.88)]
const BACK_THREE = [s('IV', 0.27, 0.25), s('IV', 0.25, 0.5), s('IV', 0.27, 0.75)]
const BACK_FIVE = [s('LV', 0.38, 0.08), s('IV', 0.27, 0.3), s('IV', 0.25, 0.5), s('IV', 0.27, 0.7), s('RV', 0.38, 0.92)]
const BACK_SIX = [
  s('LV', 0.33, 0.06),
  s('IV', 0.26, 0.24),
  s('IV', 0.24, 0.41),
  s('IV', 0.24, 0.59),
  s('IV', 0.26, 0.76),
  s('RV', 0.33, 0.94),
]
// Offensive systems defend higher up the pitch.
const HIGH_FOUR = [s('LV', 0.4, 0.1), s('IV', 0.33, 0.37), s('IV', 0.33, 0.63), s('RV', 0.4, 0.9)]
const HIGH_THREE = [s('IV', 0.33, 0.25), s('IV', 0.31, 0.5), s('IV', 0.33, 0.75)]
const HIGH_TWO = [s('IV', 0.32, 0.35), s('IV', 0.32, 0.65)]
const FRONT_THREE = [s('LA', 0.9, 0.12), s('ST', 0.95, 0.5), s('RA', 0.9, 0.88)]

const def = (name: string, slots: FormationSlot[]): Formation => ({ key: name, name, group: 'defensive', slots: [GK, ...slots] })
const off = (name: string, slots: FormationSlot[], key = name): Formation => ({ key, name, group: 'offensive', slots: [GK, ...slots] })

export const FORMATIONS: Formation[] = [
  // Defensive systems
  def('4-4-2', [...BACK_FOUR, s('LM', 0.6, 0.12), s('ZM', 0.55, 0.38), s('ZM', 0.55, 0.62), s('RM', 0.6, 0.88), s('ST', 0.9, 0.38), s('ST', 0.9, 0.62)]),
  def('4-4-1-1', [...BACK_FOUR, s('LM', 0.57, 0.12), s('ZM', 0.53, 0.38), s('ZM', 0.53, 0.62), s('RM', 0.57, 0.88), s('ZOM', 0.75, 0.5), s('ST', 0.93, 0.5)]),
  def('4-1-4-1', [...BACK_FOUR, s('ZDM', 0.47, 0.5), s('LM', 0.68, 0.12), s('ZM', 0.65, 0.38), s('ZM', 0.65, 0.62), s('RM', 0.68, 0.88), s('ST', 0.93, 0.5)]),
  def('4-5-1', [...BACK_FOUR, s('LM', 0.6, 0.1), s('ZM', 0.56, 0.3), s('ZDM', 0.5, 0.5), s('ZM', 0.56, 0.7), s('RM', 0.6, 0.9), s('ST', 0.9, 0.5)]),
  def('4-3-3', [...BACK_FOUR, s('ZDM', 0.5, 0.5), s('ZM', 0.6, 0.3), s('ZM', 0.6, 0.7), s('LA', 0.88, 0.14), s('ST', 0.93, 0.5), s('RA', 0.88, 0.86)]),
  def('4-2-3-1', [...BACK_FOUR, s('ZDM', 0.5, 0.38), s('ZDM', 0.5, 0.62), s('LM', 0.74, 0.14), s('ZOM', 0.72, 0.5), s('RM', 0.74, 0.86), s('ST', 0.93, 0.5)]),
  def('4-2-2-2', [...BACK_FOUR, s('ZDM', 0.5, 0.38), s('ZDM', 0.5, 0.62), s('ZOM', 0.72, 0.22), s('ZOM', 0.72, 0.78), s('ST', 0.92, 0.38), s('ST', 0.92, 0.62)]),
  def('4-3-2-1', [...BACK_FOUR, s('ZM', 0.55, 0.25), s('ZDM', 0.5, 0.5), s('ZM', 0.55, 0.75), s('ZOM', 0.75, 0.35), s('ZOM', 0.75, 0.65), s('ST', 0.93, 0.5)]),
  {
    ...def('4-4-2 Raute', [...BACK_FOUR, s('ZDM', 0.47, 0.5), s('LM', 0.6, 0.18), s('RM', 0.6, 0.82), s('ZOM', 0.74, 0.5), s('ST', 0.92, 0.38), s('ST', 0.92, 0.62)]),
    key: '4-4-2-raute',
  },
  def('5-4-1', [...BACK_FIVE, s('LM', 0.6, 0.12), s('ZM', 0.55, 0.38), s('ZM', 0.55, 0.62), s('RM', 0.6, 0.88), s('ST', 0.9, 0.5)]),
  def('5-3-2', [...BACK_FIVE, s('ZM', 0.58, 0.28), s('ZDM', 0.52, 0.5), s('ZM', 0.58, 0.72), s('ST', 0.9, 0.38), s('ST', 0.9, 0.62)]),
  def('5-2-3', [...BACK_FIVE, s('ZM', 0.55, 0.38), s('ZM', 0.55, 0.62), s('LA', 0.86, 0.16), s('ST', 0.92, 0.5), s('RA', 0.86, 0.84)]),
  def('5-2-1-2', [...BACK_FIVE, s('ZM', 0.52, 0.35), s('ZM', 0.52, 0.65), s('ZOM', 0.72, 0.5), s('ST', 0.92, 0.38), s('ST', 0.92, 0.62)]),
  def('5-1-3-1', [...BACK_FIVE, s('ZDM', 0.48, 0.5), s('LM', 0.68, 0.2), s('ZOM', 0.7, 0.5), s('RM', 0.68, 0.8), s('ST', 0.92, 0.5)]),
  def('3-4-3', [...BACK_THREE, s('LM', 0.58, 0.1), s('ZM', 0.55, 0.38), s('ZM', 0.55, 0.62), s('RM', 0.58, 0.9), s('LA', 0.88, 0.16), s('ST', 0.93, 0.5), s('RA', 0.88, 0.84)]),
  def('3-5-2', [...BACK_THREE, s('LM', 0.6, 0.08), s('ZDM', 0.5, 0.5), s('ZM', 0.6, 0.32), s('ZM', 0.6, 0.68), s('RM', 0.6, 0.92), s('ST', 0.9, 0.38), s('ST', 0.9, 0.62)]),
  def('3-4-1-2', [...BACK_THREE, s('LM', 0.58, 0.1), s('ZM', 0.52, 0.38), s('ZM', 0.52, 0.62), s('RM', 0.58, 0.9), s('ZOM', 0.74, 0.5), s('ST', 0.92, 0.38), s('ST', 0.92, 0.62)]),
  def('3-3-3-1', [...BACK_THREE, s('ZM', 0.47, 0.28), s('ZDM', 0.44, 0.5), s('ZM', 0.47, 0.72), s('LA', 0.72, 0.15), s('ZOM', 0.72, 0.5), s('RA', 0.72, 0.85), s('ST', 0.93, 0.5)]),
  def('6-3-1', [...BACK_SIX, s('ZM', 0.58, 0.28), s('ZDM', 0.54, 0.5), s('ZM', 0.58, 0.72), s('ST', 0.9, 0.5)]),
  def('6-2-2', [...BACK_SIX, s('ZM', 0.55, 0.38), s('ZM', 0.55, 0.62), s('ST', 0.9, 0.38), s('ST', 0.9, 0.62)]),

  // Offensive systems
  off('2-3-5', [...HIGH_TWO, s('LM', 0.56, 0.2), s('ZM', 0.53, 0.5), s('RM', 0.56, 0.8), s('LA', 0.9, 0.08), s('ZOM', 0.86, 0.3), s('ST', 0.95, 0.5), s('ZOM', 0.86, 0.7), s('RA', 0.9, 0.92)]),
  off('3-2-5', [...HIGH_THREE, s('ZM', 0.55, 0.38), s('ZM', 0.55, 0.62), s('LA', 0.92, 0.1), s('ZOM', 0.8, 0.33), s('ST', 0.95, 0.5), s('ZOM', 0.8, 0.67), s('RA', 0.92, 0.9)]),
  off('3-1-6', [...HIGH_THREE, s('ZDM', 0.54, 0.5), s('LA', 0.9, 0.08), s('ZOM', 0.8, 0.3), s('ZOM', 0.8, 0.7), s('RA', 0.9, 0.92), s('ST', 0.95, 0.38), s('ST', 0.95, 0.62)]),
  off('2-4-4', [...HIGH_TWO, s('LM', 0.6, 0.1), s('ZM', 0.55, 0.37), s('ZM', 0.55, 0.63), s('RM', 0.6, 0.9), s('LA', 0.9, 0.15), s('ST', 0.95, 0.38), s('ST', 0.95, 0.62), s('RA', 0.9, 0.85)]),
  off('3-3-4', [...HIGH_THREE, s('ZM', 0.58, 0.25), s('ZDM', 0.52, 0.5), s('ZM', 0.58, 0.75), s('LA', 0.9, 0.12), s('ST', 0.95, 0.38), s('ST', 0.95, 0.62), s('RA', 0.9, 0.88)]),
  off('3-4-3', [...HIGH_THREE, s('LM', 0.65, 0.08), s('ZM', 0.58, 0.38), s('ZM', 0.58, 0.62), s('RM', 0.65, 0.92), ...FRONT_THREE], '3-4-3-offensiv'),
  off('2-3-2-3', [...HIGH_TWO, s('LM', 0.56, 0.1), s('ZDM', 0.5, 0.5), s('RM', 0.56, 0.9), s('ZOM', 0.72, 0.35), s('ZOM', 0.72, 0.65), ...FRONT_THREE]),
  off('3-2-2-3', [...HIGH_THREE, s('ZDM', 0.5, 0.38), s('ZDM', 0.5, 0.62), s('ZOM', 0.72, 0.32), s('ZOM', 0.72, 0.68), ...FRONT_THREE]),
  off('2-2-6', [...HIGH_TWO, s('ZDM', 0.52, 0.38), s('ZDM', 0.52, 0.62), s('LA', 0.86, 0.08), s('ZOM', 0.78, 0.3), s('ZOM', 0.78, 0.7), s('RA', 0.86, 0.92), s('ST', 0.95, 0.38), s('ST', 0.95, 0.62)]),
  off('2-1-7', [...HIGH_TWO, s('ZDM', 0.52, 0.5), s('LM', 0.72, 0.1), s('ZOM', 0.75, 0.37), s('ZOM', 0.75, 0.63), s('RM', 0.72, 0.9), s('LA', 0.93, 0.2), s('ST', 0.96, 0.5), s('RA', 0.93, 0.8)]),
  off('4-2-4', [...HIGH_FOUR, s('ZM', 0.58, 0.38), s('ZM', 0.58, 0.62), s('LA', 0.9, 0.12), s('ST', 0.95, 0.38), s('ST', 0.95, 0.62), s('RA', 0.9, 0.88)]),
  off('4-1-5', [...HIGH_FOUR, s('ZDM', 0.54, 0.5), s('LA', 0.9, 0.1), s('ZOM', 0.8, 0.3), s('ST', 0.95, 0.5), s('ZOM', 0.8, 0.7), s('RA', 0.9, 0.9)]),
  off('3-1-4-2', [...HIGH_THREE, s('ZDM', 0.48, 0.5), s('LM', 0.67, 0.1), s('ZM', 0.64, 0.37), s('ZM', 0.64, 0.63), s('RM', 0.67, 0.9), s('ST', 0.94, 0.38), s('ST', 0.94, 0.62)]),
  off('3-2-4-1', [...HIGH_THREE, s('ZDM', 0.48, 0.38), s('ZDM', 0.48, 0.62), s('LA', 0.76, 0.1), s('ZOM', 0.72, 0.37), s('ZOM', 0.72, 0.63), s('RA', 0.76, 0.9), s('ST', 0.95, 0.5)]),
  off('2-4-1-3', [...HIGH_TWO, s('LM', 0.56, 0.1), s('ZM', 0.52, 0.37), s('ZM', 0.52, 0.63), s('RM', 0.56, 0.9), s('ZOM', 0.74, 0.5), ...FRONT_THREE]),
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

  // First pass: exact position matches, then roles of that position (a "6er" for ZDM).
  for (const matches of [
    (p: TeamPlayer, slot: FormationSlot) => p.position === slot.position,
    (p: TeamPlayer, slot: FormationSlot) => basePosition(p.position) === slot.position,
  ]) {
    formation.slots.forEach((slot, i) => {
      if (result[i]) return
      const index = remaining.findIndex((p) => matches(p, slot))
      if (index >= 0) result[i] = remaining.splice(index, 1)[0]
    })
  }
  // Second pass: fill remaining slots in list order, but never put a goalkeeper in the field.
  formation.slots.forEach((slot, i) => {
    if (result[i]) return
    const index = remaining.findIndex((p) => (slot.position === 'TW') === isKeeper(p.position) || p.position === null)
    if (index >= 0) result[i] = remaining.splice(index, 1)[0]
  })
  return result
}
