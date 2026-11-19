import { describe, expect, it } from 'vitest'
import { PITCH } from '../field/dimensions'
import { assignLineup, FORMATIONS, slotPosition } from './formations'
import type { Position, TeamPlayer } from './team'

function player(id: string, position: Position | null, starter = true): TeamPlayer {
  return { id, name: id, number: id, position, starter }
}

describe('FORMATIONS', () => {
  it.each(FORMATIONS.map((f) => [f.name, f] as const))('%s has exactly 11 slots with one goalkeeper', (_name, formation) => {
    expect(formation.slots).toHaveLength(11)
    expect(formation.slots.filter((s) => s.position === 'TW')).toHaveLength(1)
  })

  it('names match the number of outfield players per line', () => {
    for (const formation of FORMATIONS) {
      const total = formation.name.split('-').reduce((sum, n) => sum + Number(n), 0)
      expect(total).toBe(10)
    }
  })
})

describe('slotPosition', () => {
  it('keeps every player in the own half', () => {
    for (const formation of FORMATIONS) {
      for (const slot of formation.slots) {
        const left = slotPosition(slot, 'left')
        const right = slotPosition(slot, 'right')
        expect(left.x).toBeGreaterThan(0)
        expect(left.x).toBeLessThan(PITCH.length / 2)
        expect(right.x).toBeGreaterThan(PITCH.length / 2)
        expect(left.y).toBeGreaterThan(0)
        expect(left.y).toBeLessThan(PITCH.width)
      }
    }
  })

  it('mirrors the right side and turns the players around', () => {
    const slot = FORMATIONS[0].slots[1]
    const left = slotPosition(slot, 'left')
    const right = slotPosition(slot, 'right')
    expect(left.x + right.x).toBeCloseTo(PITCH.length)
    expect(left.y + right.y).toBeCloseTo(PITCH.width)
    expect([left.rotation, right.rotation]).toEqual([0, 180])
  })
})

describe('assignLineup', () => {
  const formation = FORMATIONS.find((f) => f.key === '4-4-2')!

  it('puts players on matching positions first', () => {
    const lineup = assignLineup([player('stürmer', 'ST'), player('torwart', 'TW')], formation)
    expect(lineup[0]?.id).toBe('torwart')
    const strikerSlot = formation.slots.findIndex((s) => s.position === 'ST')
    expect(lineup[strikerSlot]?.id).toBe('stürmer')
  })

  it('prefers starters over substitutes', () => {
    const lineup = assignLineup([player('ersatz', 'ST', false), player('stamm', 'ST', true)], formation)
    const strikers = formation.slots.map((s, i) => (s.position === 'ST' ? lineup[i]?.id : null)).filter(Boolean)
    expect(strikers[0]).toBe('stamm')
  })

  it('fills open slots in list order without putting a goalkeeper in the field', () => {
    const lineup = assignLineup([player('a', null), player('ersatzTW', 'TW'), player('b', 'IV')], {
      ...formation,
      slots: formation.slots.slice(1, 4),
    })
    expect(lineup.map((p) => p?.id)).toEqual(['a', 'b', undefined])
  })

  it('leaves slots empty when there are not enough players', () => {
    const lineup = assignLineup([player('torwart', 'TW')], formation)
    expect(lineup.filter((p) => p === null)).toHaveLength(10)
  })

  it('uses every player at most once', () => {
    const players = Array.from({ length: 14 }, (_, i) => player(String(i), i === 0 ? 'TW' : 'ZM'))
    const ids = assignLineup(players, formation).map((p) => p?.id)
    expect(new Set(ids).size).toBe(11)
  })
})
