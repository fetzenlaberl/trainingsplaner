import { describe, expect, it } from 'vitest'
import { PITCH } from './dimensions'
import { displayColor, GRID_ORDER, gridLines, ON_WHITE_PITCH_COLOR, PITCH_COLORS } from './pitchStyle'

const verticalXs = (lines: number[][]) => lines.filter((l) => l[0] === l[2]).map((l) => l[0])
const horizontalYs = (lines: number[][]) => lines.filter((l) => l[1] === l[3]).map((l) => l[1])

describe('gridLines', () => {
  it('draws nothing without a grid', () => {
    expect(gridLines('none')).toEqual([])
  })

  it('splits the pitch into thirds', () => {
    expect(verticalXs(gridLines('thirds'))).toEqual([35, 70])
  })

  it('draws 5 lanes along the sides of penalty and goal areas', () => {
    const ys = horizontalYs(gridLines('lanes'))
    expect(ys).toHaveLength(4)
    expect(ys[0]).toBeCloseTo(34 - PITCH.penaltyAreaWidth / 2)
    expect(ys[1]).toBeCloseTo(34 - PITCH.goalAreaWidth / 2)
    expect(ys[3]).toBeCloseTo(34 + PITCH.penaltyAreaWidth / 2)
  })

  it('builds the positional grid with 20 zones', () => {
    const lines = gridLines('positional')
    expect(verticalXs(lines)).toEqual([16.5, 52.5, 88.5])
    // 4 lane lines → 5 lanes, 3 cross lines → 4 rows: 20 zones
    expect((horizontalYs(lines).length + 1) * (verticalXs(lines).length + 1)).toBe(20)
  })

  it('draws evenly spaced squares inside the pitch', () => {
    const lines = gridLines('squares10')
    expect(verticalXs(lines)).toEqual([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
    expect(horizontalYs(lines)).toEqual([10, 20, 30, 40, 50, 60])
  })

  it('keeps every line on the pitch', () => {
    for (const grid of GRID_ORDER) {
      for (const [x1, y1, x2, y2] of gridLines(grid)) {
        for (const x of [x1, x2]) expect(x >= 0 && x <= PITCH.length).toBe(true)
        for (const y of [y1, y2]) expect(y >= 0 && y <= PITCH.width).toBe(true)
      }
    }
  })
})

describe('displayColor', () => {
  it('draws white elements dark on the white pitch only', () => {
    expect(displayColor('#ffffff', 'white')).toBe(ON_WHITE_PITCH_COLOR)
    expect(displayColor('#FFFFFF', 'white')).toBe(ON_WHITE_PITCH_COLOR)
    expect(displayColor('#ffffff', 'grass')).toBe('#ffffff')
    expect(displayColor('#dc2626', 'white')).toBe('#dc2626')
  })

  it('uses dark field lines on the white pitch', () => {
    expect(PITCH_COLORS.white.line).not.toBe('#ffffff')
  })
})
