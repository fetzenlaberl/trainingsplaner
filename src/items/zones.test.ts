import { describe, expect, it } from 'vitest'
import { ZONE_TEMPLATES, zoneGoalPositions } from './zones'

describe('zoneGoalPositions', () => {
  it('has no goals for plain zones', () => {
    expect(zoneGoalPositions(30, 20, 0)).toEqual([])
  })

  it('puts 2 goals on each short side of a wide field, opening inwards', () => {
    const goals = zoneGoalPositions(30, 20, 4)
    expect(goals).toHaveLength(4)
    const left = goals.filter((g) => g.x === -15)
    const right = goals.filter((g) => g.x === 15)
    expect(left.map((g) => g.y)).toEqual([-5, 5])
    expect(left.every((g) => g.rotation === 0)).toBe(true)
    expect(right.every((g) => g.rotation === 180)).toBe(true)
  })

  it('puts 3 goals on each short side for 6 goals', () => {
    const goals = zoneGoalPositions(40, 24, 6)
    const left = goals.filter((g) => g.x === -20).map((g) => g.y)
    expect(left).toHaveLength(3)
    expect(left[0]).toBeCloseTo(-8)
    expect(left[1]).toBeCloseTo(0)
    expect(left[2]).toBeCloseTo(8)
  })

  it('uses top and bottom as short sides of a tall field', () => {
    const goals = zoneGoalPositions(20, 30, 4)
    expect(goals.every((g) => Math.abs(g.y) === 15)).toBe(true)
    expect(goals.filter((g) => g.y === -15).every((g) => g.rotation === 90)).toBe(true)
    expect(goals.filter((g) => g.y === 15).every((g) => g.rotation === 270)).toBe(true)
  })
})

describe('ZONE_TEMPLATES', () => {
  it('offers small-sided fields with 4 and 6 goals', () => {
    expect(ZONE_TEMPLATES.filter((t) => t.goals > 0).map((t) => t.goals)).toEqual([4, 6])
  })
})
