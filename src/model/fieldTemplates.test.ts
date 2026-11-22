import { describe, expect, it } from 'vitest'
import { getViewport } from '../field/dimensions'
import { areaForPlayers, customFieldScene, DEFAULT_FIELD_DRAW_OPTIONS, FIELD_VARIANTS, fieldVariantDrill, SIZE_FORMATS, sizeFormatDrill, Y_PASS_VARIANTS, yPassDrill } from './fieldTemplates'
import { parseDrill, serializeDrill } from './serialize'
import type { Drill } from './types'

const all: Drill[] = [
  ...SIZE_FORMATS.map(sizeFormatDrill),
  ...FIELD_VARIANTS.map((v) => fieldVariantDrill(v.key)),
  ...Y_PASS_VARIANTS.map((v) => yPassDrill(v.key)),
]

describe('field templates', () => {
  it('are valid drills that survive saving and loading', () => {
    for (const drill of all) expect(parseDrill(serializeDrill(drill))).toEqual(drill)
  })

  it('keep everything inside the visible area', () => {
    for (const drill of all) {
      const view = getViewport(drill.fieldType, drill.pitch.area)
      const scene = drill.scenes[0]
      const points = [...scene.items, ...scene.lines.flatMap((l) => l.points)]
      for (const p of points) {
        expect(p.x, drill.title).toBeGreaterThanOrEqual(view.x)
        expect(p.x, drill.title).toBeLessThanOrEqual(view.x + view.width)
        expect(p.y, drill.title).toBeGreaterThanOrEqual(view.y)
        expect(p.y, drill.title).toBeLessThanOrEqual(view.y + view.height)
      }
    }
  })

  it('draws the field sizes 1:1 to 9:9 with the right players and size', () => {
    expect(SIZE_FORMATS.map((f) => f.players)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    const drill = sizeFormatDrill(SIZE_FORMATS[1])
    expect(drill.pitch.area).toEqual({ length: 14, width: 18 })
    expect(drill.info.fieldSize).toBe('12–16 × 16–20 m')
    expect(drill.scenes[0].items.filter((i) => i.type === 'player')).toHaveLength(4)
    expect(drill.scenes[0].items.filter((i) => i.type === 'minigoal')).toHaveLength(2)
    expect(drill.scenes[0].items.some((i) => i.type === 'text' && i.label === '16–20 m')).toBe(true)
    const nine = sizeFormatDrill(SIZE_FORMATS[8])
    expect(nine.scenes[0].items.filter((i) => i.type === 'player')).toHaveLength(18)
  })

  it('builds the goal variants', () => {
    const goals = (key: Parameters<typeof fieldVariantDrill>[0]) =>
      fieldVariantDrill(key).scenes[0].items.filter((i) => i.type === 'minigoal' || i.type === 'goal').length
    expect(goals('standard')).toBe(2)
    expect(goals('fourGoals')).toBe(8)
    expect(goals('counterGoals')).toBe(6)
    expect(goals('cornerGoals')).toBe(4)
    expect(goals('cross')).toBe(4)
    expect(goals('open')).toBe(0)
    expect(fieldVariantDrill('open').scenes[0].zones[0].dashed).toBe(true)
  })

  it('draws in a dashed field with the usual players for the entered size', () => {
    const ten = customFieldScene({ length: 10, width: 10 }, 'landscape')
    expect(ten.format.players).toBe(1)
    expect(ten.zones[0].dashed).toBe(true)
    expect(ten.items.filter((i) => i.type === 'player')).toHaveLength(2)
    expect(ten.items.filter((i) => i.type === 'text').map((i) => i.label)).toEqual(['10 m', '10 m'])
    expect(customFieldScene({ length: 40, width: 50 }, 'portrait').format.players).toBe(8)
  })

  it('finds a field size for a player count', () => {
    // 4:4 and 5:5 are the usual sizes around 4.5 players per team.
    const nine = areaForPlayers(6, 3)
    const four = 22.5 * 27.5
    const five = 27.5 * 33
    expect(nine.length * nine.width).toBeGreaterThan(four)
    expect(nine.length * nine.width).toBeLessThan(five)
    expect(nine.length).toBeLessThan(nine.width)
    const two = areaForPlayers(1, 1)
    expect(two).toEqual({ length: 11, width: 11 })
    const big = areaForPlayers(11, 11)
    expect(big.length).toBeLessThanOrEqual(120)
    expect(big.length * big.width).toBeGreaterThan(44 * 57)
  })

  it('draws the chosen teams, outline style, fill and player shape', () => {
    const scene = customFieldScene({ length: 25, width: 30 }, 'landscape', {
      ...DEFAULT_FIELD_DRAW_OPTIONS,
      pattern: 'dotted',
      weight: 'thick',
      color: '#facc15',
      fill: '#2563eb',
      fillOpacity: 0.3,
      rounded: true,
      playerShape: 'triangle',
    }, [6, 3])
    const players = scene.items.filter((i) => i.type === 'player')
    expect(players.filter((p) => p.color === '#2563eb')).toHaveLength(6)
    expect(players.filter((p) => p.color === '#dc2626')).toHaveLength(3)
    expect(players.every((p) => p.shape === 'triangle' && p.facing === false)).toBe(true)
    expect(scene.zones[0]).toMatchObject({ pattern: 'dotted', weight: 'thick', color: '#facc15', fillColor: '#2563eb', fillOpacity: 0.3, rounded: true, dashed: true })
    const solid = customFieldScene({ length: 25, width: 30 }, 'landscape', { ...DEFAULT_FIELD_DRAW_OPTIONS, pattern: 'solid' }, [4, 0])
    expect(solid.zones[0].dashed).toBe(false)
    expect(solid.zones[0].fillOpacity).toBe(0)
    expect(solid.items.filter((i) => i.type === 'player')).toHaveLength(4)
  })

  it('adds corner cones, goals on any side, team colors and players without numbers', () => {
    const area = { length: 30, width: 20 }
    const look = {
      ...DEFAULT_FIELD_DRAW_OPTIONS,
      cones: true,
      coneColor: '#facc15',
      goals: { top: 1, bottom: 2, left: 3, right: 4 },
      numbers: false,
      teamColors: ['#22c55e', '#111827'] as [string, string],
    }
    const scene = customFieldScene(area, 'landscape', look, [2, 2])
    const cones = scene.items.filter((i) => i.type === 'cone')
    expect(cones).toHaveLength(4)
    expect(cones.every((c) => c.color === '#facc15')).toBe(true)
    const goals = scene.items.filter((i) => i.type === 'minigoal')
    expect(goals).toHaveLength(10)
    // Landscape: left = x 0, right = x length, top = y 0, bottom = y width (nets outside the lines).
    expect(goals.filter((g) => g.x < 0)).toHaveLength(3)
    expect(goals.filter((g) => g.x > area.length)).toHaveLength(4)
    expect(goals.filter((g) => g.y < 0)).toHaveLength(1)
    expect(goals.filter((g) => g.y > area.width)).toHaveLength(2)
    const players = scene.items.filter((i) => i.type === 'player')
    expect(players.every((p) => p.label === '')).toBe(true)
    expect(players.map((p) => p.color).sort()).toEqual(['#111827', '#111827', '#22c55e', '#22c55e'])
    // Portrait turns the view: the bottom of the screen is the field's start (x = 0).
    const portrait = customFieldScene(area, 'portrait', { ...look, goals: { top: 0, bottom: 2, left: 0, right: 0 }, goalType: 'goal' })
    const big = portrait.items.filter((i) => i.type === 'goal')
    expect(big).toHaveLength(2)
    expect(big.every((g) => g.x < 0 && g.rotation === 0)).toBe(true)
  })

  it('puts the corner cones on the curve of rounded corners', () => {
    const area = { length: 30, width: 20 }
    const look = { ...DEFAULT_FIELD_DRAW_OPTIONS, cones: true }
    const sharp = customFieldScene(area, 'landscape', look).items.filter((i) => i.type === 'cone')
    expect(sharp.map((c) => [c.x, c.y])).toContainEqual([0, 0])
    const round = customFieldScene(area, 'landscape', { ...look, rounded: true }).items.filter((i) => i.type === 'cone')
    // Radius 3 m (a sixth of the shorter side, at most 3 m): the cone lies r from the curve centre.
    const r = 3
    for (const c of round) {
      const cx = c.x < 15 ? r : 30 - r
      const cy = c.y < 10 ? r : 20 - r
      expect(Math.hypot(c.x - cx, c.y - cy)).toBeCloseTo(r)
    }
  })

  it('numbers the Y-pass steps 1–3 between A, B and C', () => {
    for (const v of Y_PASS_VARIANTS) {
      const scene = yPassDrill(v.key).scenes[0]
      const steps = scene.lines.map((l) => l.step).filter(Boolean)
      // The vertical Y offers two ways for step 3 (to C or D).
      expect(steps).toEqual(v.key === 'vertical' ? [1, 2, 3, 3] : [1, 2, 3])
      expect(scene.items.filter((i) => ['A', 'B', 'C'].includes(i.label))).toHaveLength(3)
    }
  })
})
