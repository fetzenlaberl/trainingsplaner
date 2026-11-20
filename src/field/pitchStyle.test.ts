import { describe, expect, it } from 'vitest'
import { PITCH } from './dimensions'
import { lightingStops, screenToField, DEFAULT_PITCH_STYLE, displayColor, GRID_ORDER, resolveLighting, resolveMowing, stripeColor, customGridLayout, gridLabels, gridLines, parseGridSizes, ON_WHITE_PITCH_COLOR, PITCH_COLORS } from './pitchStyle'

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

  it.each(['penalty', 'penaltyFine'] as const)('puts %s grid lines on every penalty area line', (grid) => {
    const lines = gridLines(grid)
    const xs = verticalXs(lines)
    const ys = horizontalYs(lines)
    const hits = (values: number[], target: number) => values.some((v) => Math.abs(v - target) < 1e-9)
    for (const x of [PITCH.penaltyAreaDepth, PITCH.length - PITCH.penaltyAreaDepth, PITCH.length / 2]) {
      expect(hits(xs, x)).toBe(true)
    }
    for (const y of [34 - PITCH.penaltyAreaWidth / 2, 34, 34 + PITCH.penaltyAreaWidth / 2]) {
      expect(hits(ys, y)).toBe(true)
    }
  })

  it('uses about 12 × 10 m cells for the penalty grid and 9 × 6.7 m for the fine one', () => {
    const xs = verticalXs(gridLines('penalty'))
    const ys = horizontalYs(gridLines('penalty'))
    expect(xs[1] - xs[0]).toBeCloseTo(12)
    expect(ys[1] - ys[0]).toBeCloseTo(10.08)
    const fineXs = verticalXs(gridLines('penaltyFine'))
    expect(fineXs[1] - fineXs[0]).toBeCloseTo(9)
  })

  it('offers the club grid without numbers', () => {
    expect(gridLines('zones20Plain')).toEqual(gridLines('zones20'))
    expect(gridLabels('zones20Plain')).toEqual([])
  })

  it('labels the letter grids A to F', () => {
    const long = gridLabels('lettersLong')
    expect(long.map((l) => l.text)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])
    // Strips along the length: same x, increasing y; 5 lines between them
    expect(new Set(long.map((l) => l.x)).size).toBe(1)
    expect(gridLines('lettersLong')).toHaveLength(5)
    const across = gridLabels('lettersAcross')
    expect(across[0].x).toBeLessThan(across[5].x)
    expect(new Set(across.map((l) => l.y)).size).toBe(1)
    const fields = gridLabels('letters3x2')
    // A B C in the upper row, D E F below
    expect(fields[0].y).toBe(fields[2].y)
    expect(fields[3].y).toBeGreaterThan(fields[0].y)
    expect(fields[3].x).toBeCloseTo(fields[0].x)
    expect(gridLines('letters3x2')).toHaveLength(3)
  })

  it('centres an own grid with the given column and row sizes', () => {
    const { lines, bounds } = customGridLayout({ columns: [20, 30, 20], rows: [10, 10] })
    expect(bounds).toEqual({ x: (PITCH.length - 70) / 2, y: (PITCH.width - 20) / 2, width: 70, height: 20 })
    // 4 column borders and 3 row borders including the outline
    expect(lines).toHaveLength(7)
    expect(verticalXs(lines).map((x) => x - bounds.x)).toEqual([0, 20, 50, 70])
  })

  it('reads grid sizes typed in different ways', () => {
    expect(parseGridSizes('20 30 20')).toEqual([20, 30, 20])
    expect(parseGridSizes('20, 30, 20')).toEqual([20, 30, 20])
    expect(parseGridSizes('20,30,20')).toEqual([20, 30, 20])
    expect(parseGridSizes('12,5; 10')).toEqual([12.5, 10])
    expect(parseGridSizes('')).toBeNull()
    expect(parseGridSizes('10 abc')).toBeNull()
    expect(parseGridSizes('0 10')).toBeNull()
  })

  it('puts letters outside the pitch and zone numbers into the cell corners', () => {
    expect(gridLabels('lettersLong').every((l) => l.x < 0)).toBe(true)
    expect(gridLabels('lettersAcross').every((l) => l.y < 0)).toBe(true)
    const fields = gridLabels('letters3x2')
    expect(fields.slice(0, 3).every((l) => l.y < 0)).toBe(true)
    expect(fields.slice(3).every((l) => l.y > PITCH.width)).toBe(true)
    const zones = gridLabels('zones20')
    expect(zones.every((l) => l.cell !== undefined)).toBe(true)
    expect(zones[0].cell).toMatchObject({ x1: 0, y1: 0 })
  })

  it('resolves mowing and lighting from the design unless chosen', () => {
    expect(resolveMowing({ ...DEFAULT_PITCH_STYLE })).toEqual({ kind: 'across', count: 14 })
    expect(resolveMowing({ ...DEFAULT_PITCH_STYLE, color: 'grassPlain' }).kind).toBe('none')
    expect(resolveMowing({ ...DEFAULT_PITCH_STYLE, color: 'grassPlain', mowing: 'alongWide' })).toEqual({ kind: 'along', count: 5 })
    expect(resolveMowing({ ...DEFAULT_PITCH_STYLE, color: 'grassCheck' }).kind).toBe('check')
    expect(resolveLighting({ ...DEFAULT_PITCH_STYLE, color: 'grassStadium' })).toBe('soft')
    expect(resolveLighting({ ...DEFAULT_PITCH_STYLE, lighting: 'strong' })).toBe('strong')
    // Designs without stripes still get a visible stripe shade
    expect(stripeColor('grey')).not.toBe(PITCH_COLORS.grey.base)
    expect(stripeColor('grass')).toBe(PITCH_COLORS.grass.stripe)
  })

  it('numbers the club grid 1 to 20 from the own goal', () => {
    const labels = gridLabels('zones20')
    expect(labels.map((l) => l.text)).toEqual(Array.from({ length: 20 }, (_, i) => String(i + 1)))
    const at = (n: number) => labels.find((l) => l.text === String(n))!
    // 2 and 19 in the penalty areas, 7 and 14 in the centre lane
    expect(at(2).x).toBeLessThan(PITCH.penaltyAreaDepth)
    expect(at(19).x).toBeGreaterThan(PITCH.length - PITCH.penaltyAreaDepth)
    expect(at(7).y).toBeCloseTo(34)
    expect(at(14).y).toBeCloseTo(34)
    // Left wing (small y): 1, 4, 5 in the own half, 11, 12 in the opponent half, 18 at the end
    for (const n of [1, 4, 5, 11, 12, 18]) expect(at(n).y).toBeLessThan(34 - PITCH.penaltyAreaWidth / 2)
    expect(at(4).x).toBeLessThan(at(5).x)
    expect(at(11).x).toBeLessThan(at(12).x)
  })

  it('has no zone numbers on other grids', () => {
    expect(gridLabels('positional')).toEqual([])
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

describe('screenToField', () => {
  const viewport = { x: -5, y: -5, width: 115, height: 78 }
  it('maps screen sides directly in landscape', () => {
    expect(screenToField(viewport, 0, 0, 0)).toEqual({ x: 52.5, y: 34 })
    expect(screenToField(viewport, 0, -1, 0)).toEqual({ x: -5, y: 34 })
    expect(screenToField(viewport, 0, 1, 1)).toEqual({ x: 110, y: 73 })
  })
  it('follows the turned view in portrait (screen top = far end of the pitch)', () => {
    // Portrait turns the view by -90°, so the screen's top shows the pitch's right end.
    expect(screenToField(viewport, 90, 0, -1)).toEqual({ x: 110, y: 34 })
    expect(screenToField(viewport, 90, -1, 0)).toEqual({ x: 52.5, y: -5 })
  })
})

describe('lightingStops', () => {
  it('gets darker with more strength and has no glow as vignette', () => {
    const soft = lightingStops('soft', 'spot')
    const strong = lightingStops('strong', 'spot')
    expect(soft[5]).not.toBe(strong[5])
    expect(lightingStops('strong', 'vignette')[1]).toBe('rgba(255,255,235,0.000)')
  })
})
