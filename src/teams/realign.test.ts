import { describe, expect, it } from 'vitest'
import { PITCH } from '../field/dimensions'
import { KEEPER_LABEL, TEAM_COLORS } from '../items/palette'
import type { Item } from '../model/types'
import { FORMATIONS, slotPosition } from './formations'
import { realignLineup, teamItemIds } from './realign'
import type { Position, Team } from './team'

const RED = '#dc2626'
const BLUE = '#2563eb'

const item = (id: string, color: string, label: string, name = '', x = 10, y = 10): Item => ({
  id,
  type: 'player',
  x,
  y,
  rotation: 0,
  size: 1.5,
  shape: 'circle',
  color,
  label,
  name,
  highlight: false,
})

const positions: Position[] = ['TW', 'IV', 'IV', 'LV', 'RV', 'ZDM6', 'ZM', 'LM', 'RM', 'ST', 'ST']
const team: Team = {
  id: 't',
  name: 'Test',
  color: RED,
  createdAt: 0,
  updatedAt: 0,
  players: positions.map((position, i) => ({
    id: `p${i + 1}`,
    name: `Spieler ${String.fromCharCode(65 + i)}`,
    number: position === 'TW' ? '' : String(i + 1),
    position,
    starter: true,
  })),
}
const formation = (key: string) => FORMATIONS.find((f) => f.key === key)!
const size = { length: PITCH.length, width: PITCH.width }

describe('realignLineup', () => {
  const pitchItems: Item[] = [
    item('k', TEAM_COLORS.keeper, KEEPER_LABEL, 'Spieler A', 5, 34),
    ...team.players.slice(1).map((p) => item(`i${p.id}`, RED, p.number, p.name, 40, 30)),
    item('opp', BLUE, '9', '', 60, 30),
    item('oppKeeper', TEAM_COLORS.keeper, KEEPER_LABEL, '', 100, 34),
    { ...item('ball', '#ffffff', ''), type: 'ball' },
  ]

  it('moves only the own players onto the new formation', () => {
    const moves = realignLineup(team, formation('3-5-2'), 'left', size, pitchItems)
    expect(moves).toHaveLength(11)
    const ids = moves.map((m) => m.id)
    expect(ids).not.toContain('opp')
    expect(ids).not.toContain('oppKeeper')
    expect(ids).not.toContain('ball')
  })

  it('keeps the keeper in goal and puts roles on their basic position', () => {
    const target = formation('4-2-3-1')
    const moves = realignLineup(team, target, 'left', size, pitchItems)
    const keeperSlot = target.slots.findIndex((s) => s.position === 'TW')
    const keeperPlace = slotPosition(target.slots[keeperSlot], 'left', size)
    expect(moves.find((m) => m.id === 'k')).toMatchObject({ x: keeperPlace.x, y: keeperPlace.y })
    // The 6er (number 6) goes to a ZDM place.
    const six = moves.find((m) => m.id === 'ip6')!
    const zdmPlaces = target.slots.filter((s) => s.position === 'ZDM').map((s) => slotPosition(s, 'left', size))
    expect(zdmPlaces.some((p) => p.x === six.x && p.y === six.y)).toBe(true)
  })

  it('also moves players in the team color that are not in the squad', () => {
    const generic = [item('g1', RED, '1'), item('g2', RED, '2'), item('gk', TEAM_COLORS.keeper, KEEPER_LABEL, '', 4, 34)]
    const moves = realignLineup({ ...team, players: [] }, formation('4-4-2'), 'left', size, generic)
    expect(moves.map((m) => m.id).sort()).toEqual(['g1', 'g2', 'gk'])
  })

  it('faces the other way for a team playing from the right', () => {
    const moves = realignLineup(team, formation('4-4-2'), 'right', size, pitchItems)
    expect(moves.every((m) => m.rotation === 180)).toBe(true)
  })

  it('finds nothing without the team on the pitch', () => {
    expect(realignLineup(team, formation('4-4-2'), 'left', size, [item('opp', BLUE, '9')])).toEqual([])
  })
})

describe('teamItemIds', () => {
  it('finds the team on the pitch but not the other team or its keeper', () => {
    const items: Item[] = [
      item('k', TEAM_COLORS.keeper, KEEPER_LABEL, '', 5, 34),
      item('a', RED, '7', 'Spieler H', 40, 30),
      item('generic', RED, '20', '', 30, 20),
      item('opp', BLUE, '9', '', 60, 30),
      item('oppKeeper', TEAM_COLORS.keeper, KEEPER_LABEL, '', 100, 34),
    ]
    expect(teamItemIds(team, 'left', size, items)).toEqual(['k', 'a', 'generic'])
  })
})
