import { describe, expect, it } from 'vitest'
import { getViewport } from '../field/dimensions'
import { areaForPlayers, customFieldScene, DEFAULT_FIELD_DRAW_OPTIONS, FIELD_VARIANTS, fieldVariantDrill, SIZE_FORMATS, sizeFormatDrill, sizeOverviewDrill, Y_PASS_VARIANTS, yPassDrill } from './fieldTemplates'
import { EXTRA_GROUPS, EXTRA_TEMPLATES, extraTemplateDrill } from './extraTemplates'
import { parseDrill, serializeDrill } from './serialize'
import type { Drill } from './types'

const all: Drill[] = [
  ...SIZE_FORMATS.map(sizeFormatDrill),
  ...FIELD_VARIANTS.map((v) => fieldVariantDrill(v.key)),
  ...Y_PASS_VARIANTS.map((v) => yPassDrill(v.key)),
  sizeOverviewDrill(),
  ...EXTRA_TEMPLATES.map((t) => extraTemplateDrill(t.key)),
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

  it('builds the extra templates in every group with unique keys', () => {
    expect(new Set(EXTRA_TEMPLATES.map((t) => t.key)).size).toBe(EXTRA_TEMPLATES.length)
    for (const { group } of EXTRA_GROUPS) expect(EXTRA_TEMPLATES.some((t) => t.group === group)).toBe(true)
    const sixGoals = extraTemplateDrill('sixGoals').scenes[0].items
    expect(sixGoals.filter((i) => i.type === 'minigoal')).toHaveLength(6)
    expect(sixGoals.filter((i) => i.type === 'player')).toHaveLength(18)
    expect(extraTemplateDrill('plusOne').fieldType).toBe('half')
    expect(extraTemplateDrill('structure325').pitch.color).toBe('black')
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
    expect(goals('possessionTransfer')).toBe(4)
    const transfer = fieldVariantDrill('possessionTransfer')
    expect(transfer.fieldType).toBe('full')
    expect(transfer.pitch.orientation).toBe('portrait')
    expect(transfer.scenes[0].items.filter((i) => i.type === 'player')).toHaveLength(15)
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

  it('puts cones along the sides, bigger if chosen, and none where a goal stands', () => {
    const area = { length: 30, width: 20 }
    const look = { ...DEFAULT_FIELD_DRAW_OPTIONS, sideCones: 3 }
    const cones = (o: typeof look) => customFieldScene(area, 'landscape', o).items.filter((i) => i.type === 'cone')
    expect(cones(look)).toHaveLength(12)
    expect(cones({ ...look, cones: true })).toHaveLength(16)
    // A goal in the middle of the left side replaces the middle cone there.
    expect(cones({ ...look, goals: { top: 0, bottom: 0, left: 1, right: 0 } })).toHaveLength(11)
    const normal = cones({ ...look, coneSize: 'normal' })[0].size
    const large = cones({ ...look, coneSize: 'xlarge' })[0].size
    expect(large).toBeCloseTo(normal * 2.2)
  })

  it('fixes outline, size labels, cones and goals, but not players and ball', () => {
    const look = { ...DEFAULT_FIELD_DRAW_OPTIONS, cones: true, goals: { top: 1, bottom: 0, left: 0, right: 0 } }
    const scene = customFieldScene({ length: 30, width: 20 }, 'landscape', look)
    expect(scene.zones.every((z) => z.locked)).toBe(true)
    expect(scene.lines.every((l) => l.locked)).toBe(true)
    for (const item of scene.items) {
      expect(item.locked === true).toBe(!['player', 'ball'].includes(item.type))
    }
    const free = customFieldScene({ length: 30, width: 20 }, 'landscape', { ...look, lockField: false })
    expect([...free.items, ...free.lines, ...free.zones].some((e) => e.locked)).toBe(false)
  })

  it('draws the size labels at half opacity, full or not at all', () => {
    const area = { length: 30, width: 20 }
    const half = customFieldScene(area, 'landscape')
    const labels = half.items.filter((i) => i.type === 'text')
    expect(labels).toHaveLength(2)
    expect([...labels, ...half.lines].every((e) => e.alpha === 0.5)).toBe(true)
    expect(half.items.filter((i) => i.type === 'player').some((p) => p.alpha !== undefined)).toBe(false)
    const full = customFieldScene(area, 'landscape', { ...DEFAULT_FIELD_DRAW_OPTIONS, labelOpacity: 1 })
    expect(full.lines.some((l) => l.alpha !== undefined)).toBe(false)
    const none = customFieldScene(area, 'landscape', { ...DEFAULT_FIELD_DRAW_OPTIONS, labelOpacity: 0 })
    expect(none.items.filter((i) => i.type === 'text')).toHaveLength(0)
    expect(none.lines).toHaveLength(0)
  })

  it('templates use players without arrow, extra thin lines and faint size labels', () => {
    for (const drill of all) {
      const scene = drill.scenes[0]
      expect(scene.items.filter((i) => i.type === 'player').every((p) => p.facing === false), drill.title).toBe(true)
      expect(scene.lines.every((l) => l.weight === 'extraThin'), drill.title).toBe(true)
    }
    const sizes = sizeFormatDrill(SIZE_FORMATS[3]).scenes[0]
    const texts = sizes.items.filter((i) => i.type === 'text')
    expect(texts.length).toBeGreaterThan(0)
    expect(texts.every((t) => t.alpha === 0.5)).toBe(true)
  })

  it('keeps the facing arrow on drawn-in players when chosen, with any label opacity', () => {
    const area = { length: 30, width: 20 }
    const arrow = customFieldScene(area, 'landscape', { ...DEFAULT_FIELD_DRAW_OPTIONS, labelOpacity: 0.3 })
    expect(arrow.items.filter((i) => i.type === 'player').every((p) => p.facing === undefined)).toBe(true)
    expect(arrow.items.filter((i) => i.type === 'text').every((t) => t.alpha === 0.3)).toBe(true)
  })

  it('draws the players flat or as outline when chosen', () => {
    const area = { length: 30, width: 20 }
    const players = (playerSymbol: typeof DEFAULT_FIELD_DRAW_OPTIONS.playerSymbol) =>
      customFieldScene(area, 'landscape', { ...DEFAULT_FIELD_DRAW_OPTIONS, playerSymbol }).items.filter((i) => i.type === 'player')
    expect(players(null).every((p) => p.symbol === undefined)).toBe(true)
    expect(players('outline').every((p) => p.symbol === 'outline')).toBe(true)
    expect(players('flat').every((p) => p.symbol === 'flat')).toBe(true)
    const cones = customFieldScene(area, 'landscape', { ...DEFAULT_FIELD_DRAW_OPTIONS, cones: true, coneSymbol: 'outline' }).items.filter((i) => i.type === 'cone')
    expect(cones.length).toBe(4)
    expect(cones.every((c) => c.symbol === 'outline')).toBe(true)
  })

  it('divides the field with lines in the outline style', () => {
    const area = { length: 40, width: 30 }
    const lines = (division: typeof DEFAULT_FIELD_DRAW_OPTIONS.division) =>
      customFieldScene(area, 'landscape', { ...DEFAULT_FIELD_DRAW_OPTIONS, labelOpacity: 0, division }).lines
    expect(lines('none')).toHaveLength(0)
    expect(lines('half').map((l) => l.points[0].x)).toEqual([20])
    expect(lines('thirds').map((l) => Math.round(l.points[0].x * 10) / 10)).toEqual([13.3, 26.7])
    expect(lines('quarterStrips').map((l) => l.points[0].x)).toEqual([10, 20, 30])
    const quarters = lines('quarters')
    expect(quarters[1].points).toEqual([{ x: 0, y: 15 }, { x: 40, y: 15 }])
    expect(quarters.every((l) => l.type === 'line' && l.pattern === 'dashed' && l.locked)).toBe(true)
  })

  it('shows the fields 1:1 to 8:8 side by side on the overview sheet', () => {
    const scene = sizeOverviewDrill().scenes[0]
    expect(scene.zones).toHaveLength(8)
    expect(new Set(scene.zones.map((z) => z.id)).size).toBe(8)
    expect(scene.zones.some((z) => z.id.startsWith('zone-tpl-field-'))).toBe(false)
    const players = scene.items.filter((i) => i.type === 'player')
    expect(players).toHaveLength(2 * (1 + 2 + 3 + 4 + 5 + 6 + 7 + 8))
    expect(scene.items.filter((i) => i.type === 'minigoal')).toHaveLength(16)
    expect(scene.items.filter((i) => i.type === 'text').map((t) => t.label)).toContain('8:8')
    // Every field fits in its own box of the sheet.
    for (const zone of scene.zones) expect(Math.max(zone.width / 23, zone.height / 17)).toBeCloseTo(1)
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
