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
      const total = formation.name.split('-').reduce((sum, n) => sum + Number.parseInt(n, 10), 0)
      expect(total).toBe(10)
    }
  })

  it('has unique keys', () => {
    expect(new Set(FORMATIONS.map((f) => f.key)).size).toBe(FORMATIONS.length)
  })

  it('offers the defensive and offensive systems in their groups', () => {
    const names = (group: string) => FORMATIONS.filter((f) => f.group === group).map((f) => f.name)
    expect(names('defensive')).toEqual([
      '4-4-2', '4-4-1-1', '4-1-4-1', '4-5-1', '4-3-3', '4-2-3-1', '4-2-2-2', '4-3-2-1', '4-4-2 Raute', '5-4-1',
      '5-3-2', '5-2-3', '5-2-1-2', '5-1-3-1', '3-4-3', '3-5-2', '3-4-1-2', '3-3-3-1', '6-3-1', '6-2-2',
    ])
    expect(names('offensive')).toEqual([
      '2-3-5', '3-2-5', '3-1-6', '2-4-4', '3-3-4', '3-4-3', '2-3-2-3', '3-2-2-3', '2-2-6', '2-1-7', '4-2-4',
      '4-1-5', '3-1-4-2', '3-2-4-1', '2-4-1-3',
    ])
  })

  it('puts the lines in the order of the name (from the own goal forward)', () => {
    for (const formation of FORMATIONS) {
      const counts = formation.name.split('-').map((n) => Number.parseInt(n, 10))
      const field = formation.slots.filter((s) => s.position !== 'TW').map((s) => s.depth).sort((a, b) => a - b)
      let at = 0
      const lineDepths = counts.map((count) => {
        const line = field.slice(at, at + count)
        at += count
        return line
      })
      // Every player of a line stands behind every player of the next line.
      for (let i = 0; i + 1 < lineDepths.length; i++) {
        expect(Math.max(...lineDepths[i]), formation.name).toBeLessThanOrEqual(Math.min(...lineDepths[i + 1]))
      }
    }
  })

  it('places offensive systems higher than defensive ones on average', () => {
    const average = (group: string) => {
      const depths = FORMATIONS.filter((f) => f.group === group).flatMap((f) => f.slots.map((s) => s.depth))
      return depths.reduce((a, b) => a + b, 0) / depths.length
    }
    expect(average('offensive')).toBeGreaterThan(average('defensive'))
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

describe('roles of a position', () => {
  it('puts a 6er on the ZDM slot and never a substitute keeper in the field', () => {
    const formation = FORMATIONS[0]
    const players = [
      player('et', 'ET'),
      player('six', 'ZDM6'),
      ...Array.from({ length: 12 }, (_, i) => player(`f${i}`, null)),
      player('tw', 'TW'),
    ]
    const lineup = assignLineup(players, formation)
    const keeperSlot = formation.slots.findIndex((s) => s.position === 'TW')
    expect(lineup[keeperSlot]?.id).toBe('tw')
    const zdm = formation.slots.findIndex((s) => s.position === 'ZDM')
    if (zdm >= 0) expect(lineup[zdm]?.id).toBe('six')
    expect(lineup.some((p) => p?.id === 'et')).toBe(false)
  })
})
