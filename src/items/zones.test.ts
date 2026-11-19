import { describe, expect, it } from 'vitest'
import { baseCorners, ZONE_TEMPLATES, zoneCorners, zoneExtent, zoneGoalPositions } from './zones'

const rect = (width: number, height: number) => baseCorners('rect', width, height)

describe('baseCorners / zoneCorners / zoneExtent', () => {
  it('lists rectangle corners clockwise from top left', () => {
    expect(rect(30, 20)).toEqual([
      { x: -15, y: -10 },
      { x: 15, y: -10 },
      { x: 15, y: 10 },
      { x: -15, y: 10 },
    ])
  })

  it('starts a triangle at its tip', () => {
    expect(baseCorners('triangle', 20, 10)[0]).toEqual({ x: 0, y: -5 })
  })

  it('uses free corners when set and has none for ellipses', () => {
    const corners = [
      { x: 0, y: -8 },
      { x: 10, y: 0 },
      { x: 0, y: 8 },
      { x: -10, y: 0 },
    ]
    expect(zoneCorners({ shape: 'rect', width: 1, height: 1, corners })).toBe(corners)
    expect(zoneCorners({ shape: 'ellipse', width: 10, height: 10, corners: null })).toEqual([])
    expect(zoneExtent({ shape: 'rect', width: 1, height: 1, corners })).toEqual({ width: 20, height: 16 })
  })
})

describe('zoneGoalPositions', () => {
  it('has no goals for plain zones', () => {
    expect(zoneGoalPositions(rect(30, 20), 0)).toEqual([])
  })

  it('puts 2 goals on each short side of a wide field, opening inwards', () => {
    const goals = zoneGoalPositions(rect(30, 20), 4)
    expect(goals).toHaveLength(4)
    const left = goals.filter((g) => g.x === -15)
    const right = goals.filter((g) => g.x === 15)
    expect(left.map((g) => g.y)).toEqual([-5, 5])
    expect(left.every((g) => g.rotation === 0)).toBe(true)
    expect(right.every((g) => g.rotation === 180)).toBe(true)
  })

  it('puts 3 goals on each short side for 6 goals', () => {
    const goals = zoneGoalPositions(rect(40, 24), 6)
    const left = goals.filter((g) => g.x === -20).map((g) => g.y)
    expect(left).toHaveLength(3)
    expect(left[0]).toBeCloseTo(-8)
    expect(left[1]).toBeCloseTo(0)
    expect(left[2]).toBeCloseTo(8)
  })

  it('uses top and bottom as short sides of a tall field', () => {
    const goals = zoneGoalPositions(rect(20, 30), 4)
    expect(goals.every((g) => Math.abs(g.y) === 15)).toBe(true)
    expect(goals.filter((g) => g.y === -15).every((g) => g.rotation === 90)).toBe(true)
    expect(goals.filter((g) => g.y === 15).every((g) => g.rotation === 270)).toBe(true)
  })

  it('follows slanted sides of a trapezoid and still faces inwards', () => {
    // Short slanted sides on the left and right.
    const trapezoid = [
      { x: -12, y: -6 },
      { x: 12, y: -6 },
      { x: 16, y: 6 },
      { x: -16, y: 6 },
    ]
    const goals = zoneGoalPositions(trapezoid, 4)
    const left = goals.filter((g) => g.x < 0)
    expect(left).toHaveLength(2)
    // On the line from (-12, -6) to (-16, 6)
    expect(left[0]).toMatchObject({ x: -13, y: -3 })
    // Perpendicular to the side (-4, 12), pointing inwards: (12, 4) → about 18.4°
    expect(left[0].rotation).toBeCloseTo((Math.atan2(4, 12) * 180) / Math.PI)
  })

  it('needs exactly four corners', () => {
    expect(zoneGoalPositions(baseCorners('triangle', 10, 10), 4)).toEqual([])
  })
})

describe('ZONE_TEMPLATES', () => {
  it('offers small-sided fields with 4 and 6 goals', () => {
    expect(ZONE_TEMPLATES.filter((t) => t.goals > 0).map((t) => t.goals)).toEqual([4, 6])
  })

  it('offers rhombus and trapezoid with four corners', () => {
    for (const key of ['zone-rhombus', 'zone-trapezoid']) {
      expect(ZONE_TEMPLATES.find((t) => t.key === key)?.corners).toHaveLength(4)
    }
  })
})
