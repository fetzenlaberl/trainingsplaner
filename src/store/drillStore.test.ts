import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_PLAYER_SIZE,
  ITEM_TEMPLATES,
  KEEPER_LABEL,
  MAX_ITEM_SIZE,
  MIN_ITEM_SIZE,
  TEAM_COLORS,
} from '../items/palette'
import { MAX_ZONE_SIZE, MIN_ZONE_SIZE, ZONE_TEMPLATES } from '../items/zones'
import { emptyDrill } from '../model/serialize'
import type { Drill } from '../model/types'
import {
  COPY_OFFSET,
  currentDrill,
  currentScene,
  HISTORY_LIMIT,
  MIN_SCENE_DURATION_MS,
  FIRST_PLAYER_NUMBER,
  nextPlayerNumber,
  normalizeAngle,
  useDrillStore,
} from './drillStore'

const store = () => useDrillStore.getState()
const items = () => currentScene(store()).items
const lines = () => currentScene(store()).lines
const ORANGE = '#f97316'
const zoneTemplate = (key: string) => ZONE_TEMPLATES.find((t) => t.key === key)!
const RECT = zoneTemplate('zone-rect')
const ELLIPSE = zoneTemplate('zone-ellipse')
const TRIANGLE = zoneTemplate('zone-triangle')

beforeEach(() => store().newDrill())

describe('items', () => {
  it('adds an item at the given position in meters', () => {
    const id = store().addItem({ type: 'cone', color: ORANGE }, 20.5, 30)
    expect(items()).toEqual([
      { id, type: 'cone', x: 20.5, y: 30, rotation: 0, size: 1, shape: 'circle', color: ORANGE, label: '', name: '', highlight: false },
    ])
  })

  it('gives every item a unique id', () => {
    const a = store().addItem({ type: 'ball', color: '#fff' }, 0, 0)
    const b = store().addItem({ type: 'ball', color: '#fff' }, 0, 0)
    expect(a).not.toBe(b)
  })

  it('numbers players per team color', () => {
    store().addItem({ type: 'player', color: TEAM_COLORS.red }, 0, 0)
    store().addItem({ type: 'player', color: TEAM_COLORS.red }, 0, 0)
    store().addItem({ type: 'player', color: TEAM_COLORS.blue }, 0, 0)
    expect(items().map((i) => i.label)).toEqual(['2', '3', '2'])
  })

  it('keeps an explicit label', () => {
    store().addItem({ type: 'text', color: '#fff', label: 'Text' }, 0, 0)
    expect(items()[0].label).toBe('Text')
  })

  it('moves only the given item', () => {
    const a = store().addItem({ type: 'cone', color: ORANGE }, 1, 1)
    store().addItem({ type: 'cone', color: ORANGE }, 2, 2)
    store().moveItem(a, 10, 20)
    const [first, second] = items()
    expect([first.x, first.y]).toEqual([10, 20])
    expect([second.x, second.y]).toEqual([2, 2])
  })

  it('rotates and normalizes the angle', () => {
    const id = store().addItem({ type: 'player', color: TEAM_COLORS.red }, 0, 0)
    store().rotateItem(id, -15)
    expect(items()[0].rotation).toBe(345)
    store().rotateItem(id, 375)
    expect(items()[0].rotation).toBe(15)
  })
})

describe('lines', () => {
  it('adds a straight line', () => {
    const id = store().addLine('pass', { x: 1, y: 2 }, { x: 5, y: 6 }, '#ffffff')
    expect(lines()).toEqual([
      {
        id,
        type: 'pass',
        points: [
          { x: 1, y: 2 },
          { x: 5, y: 6 },
        ],
        smooth: true,
        color: '#ffffff',
        pattern: 'solid',
        weight: 'medium',
        step: null,
      },
    ])
  })

  it('uses the usual pattern per line type unless a style is given', () => {
    store().addLine('run', { x: 0, y: 0 }, { x: 10, y: 0 }, '#fff')
    store().addLine('pass', { x: 0, y: 0 }, { x: 10, y: 0 }, '#fff', { pattern: 'dotted', weight: 'thin' })
    store().addLine('line', { x: 0, y: 0 }, { x: 10, y: 0 }, '#fff')
    expect(lines().map((l) => [l.type, l.pattern, l.weight])).toEqual([
      ['run', 'dashed', 'medium'],
      ['pass', 'dotted', 'thin'],
      ['line', 'solid', 'medium'],
    ])
  })

  it('numbers new lines on request and changes or removes step numbers', () => {
    store().addLine('pass', { x: 0, y: 0 }, { x: 10, y: 0 }, '#fff', { numbered: true })
    const second = store().addLine('run', { x: 0, y: 0 }, { x: 10, y: 0 }, '#fff', { numbered: true })
    store().addLine('line', { x: 0, y: 0 }, { x: 10, y: 0 }, '#fff')
    expect(lines().map((l) => l.step)).toEqual([1, 2, null])
    store().setLineStep(second, 5)
    expect(lines()[1].step).toBe(5)
    store().renumberLineSteps()
    expect(lines().map((l) => l.step)).toEqual([1, 2, null])
    store().setLineStep(second, null)
    expect(lines()[1].step).toBeNull()
    store().undo()
    expect(lines()[1].step).toBe(2)
  })

  it('changes pattern and weight of a line with undo', () => {
    const id = store().addLine('pass', { x: 0, y: 0 }, { x: 10, y: 0 }, '#fff')
    store().setLineStyle(id, { pattern: 'dashdot' })
    store().setLineStyle(id, { weight: 'thick' })
    expect([lines()[0].pattern, lines()[0].weight]).toEqual(['dashdot', 'thick'])
    store().undo()
    expect(lines()[0].weight).toBe('medium')
  })

  it('inserts bends between the waypoints, never before the start or after the end', () => {
    const id = store().addLine('run', { x: 0, y: 0 }, { x: 10, y: 0 }, '#ffffff')
    store().insertLinePoint(id, 1, { x: 5, y: 4 })
    store().insertLinePoint(id, 2, { x: 8, y: -2 })
    expect(lines()[0].points).toEqual([
      { x: 0, y: 0 },
      { x: 5, y: 4 },
      { x: 8, y: -2 },
      { x: 10, y: 0 },
    ])
    store().insertLinePoint(id, 0, { x: 99, y: 99 })
    store().insertLinePoint(id, 4, { x: 99, y: 99 })
    expect(lines()[0].points).toHaveLength(4)
  })

  it('removes single bends but keeps start and end, with undo', () => {
    const id = store().addLine('run', { x: 0, y: 0 }, { x: 10, y: 0 }, '#ffffff')
    store().insertLinePoint(id, 1, { x: 5, y: 4 })
    store().removeLinePoint(id, 0)
    store().removeLinePoint(id, 2)
    expect(lines()[0].points).toHaveLength(3)
    store().removeLinePoint(id, 1)
    expect(lines()[0].points).toHaveLength(2)
    store().undo()
    expect(lines()[0].points).toHaveLength(3)
  })

  it('clears all bends and switches between smooth and corners', () => {
    const id = store().addLine('run', { x: 0, y: 0 }, { x: 10, y: 0 }, '#ffffff')
    store().insertLinePoint(id, 1, { x: 3, y: 4 })
    store().insertLinePoint(id, 2, { x: 6, y: -4 })
    store().setLineSmooth(id, false)
    expect(lines()[0].smooth).toBe(false)
    store().clearLineBends(id)
    expect(lines()[0].points).toEqual([
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ])
  })

  it('moves a line including all bends', () => {
    const id = store().addLine('pass', { x: 0, y: 0 }, { x: 10, y: 0 }, '#ffffff')
    store().insertLinePoint(id, 1, { x: 5, y: 4 })
    store().moveLine(id, 2, 3)
    expect(lines()[0].points).toEqual([
      { x: 2, y: 3 },
      { x: 7, y: 7 },
      { x: 12, y: 3 },
    ])
  })

  it('moves a single end point', () => {
    const id = store().addLine('pass', { x: 0, y: 0 }, { x: 10, y: 0 }, '#ffffff')
    store().setLinePoint(id, 1, { x: 8, y: 8 })
    expect(lines()[0].points[1]).toEqual({ x: 8, y: 8 })
    expect(lines()[0].points[0]).toEqual({ x: 0, y: 0 })
  })
})

describe('copy and delete', () => {
  it('copies an item with offset, new id and next player number, and selects it', () => {
    const id = store().addItem({ type: 'player', color: TEAM_COLORS.red }, 10, 10)
    const original = items()[0]
    const copyId = store().insertCopy(original)
    const copy = items()[1]
    expect(copyId).not.toBe(id)
    expect([copy.x, copy.y]).toEqual([10 + COPY_OFFSET, 10 + COPY_OFFSET])
    expect(copy.label).toBe('3')
    expect(store().selectedId).toBe(copyId)
  })

  it('labels the goalkeeper from the sidebar as TM and keeps it when copying', () => {
    const keeper = ITEM_TEMPLATES.find((t) => t.key === 'keeper')!
    store().addItem(keeper.item, 0, 0)
    store().insertCopy(items()[0])
    expect(items().map((i) => i.label)).toEqual([KEEPER_LABEL, KEEPER_LABEL])
  })

  it('keeps non-numeric labels when copying', () => {
    store().addItem({ type: 'player', color: TEAM_COLORS.keeper, label: 'TW' }, 0, 0)
    store().insertCopy(items()[0])
    expect(items()[1].label).toBe('TW')
  })

  it('copies a line with offset', () => {
    store().addLine('shot', { x: 0, y: 0 }, { x: 10, y: 0 }, '#ffffff')
    store().insertCopy(lines()[0])
    expect(lines()[1].points[0]).toEqual({ x: COPY_OFFSET, y: COPY_OFFSET })
    expect(lines()[1].id).not.toBe(lines()[0].id)
  })

  it('deletes items and lines and clears the selection', () => {
    const item = store().addItem({ type: 'ball', color: '#fff' }, 0, 0)
    const line = store().addLine('pass', { x: 0, y: 0 }, { x: 5, y: 0 }, '#fff')
    store().select(item)
    store().deleteElement(item)
    store().deleteElement(line)
    expect(items()).toEqual([])
    expect(lines()).toEqual([])
    expect(store().selectedId).toBeNull()
  })
})

describe('undo / redo', () => {
  it('undoes and redoes adding an item', () => {
    store().addItem({ type: 'ball', color: '#fff' }, 0, 0)
    store().undo()
    expect(items()).toEqual([])
    store().redo()
    expect(items()).toHaveLength(1)
  })

  it('undoes moves, rotations, deletions and field type changes step by step', () => {
    const id = store().addItem({ type: 'player', color: TEAM_COLORS.red }, 0, 0)
    store().moveItem(id, 5, 5)
    store().rotateItem(id, 90)
    store().setFieldType('half')
    store().deleteElement(id)

    store().undo()
    expect(items()).toHaveLength(1)
    store().undo()
    expect(store().fieldType).toBe('full')
    store().undo()
    expect(items()[0].rotation).toBe(0)
    store().undo()
    expect([items()[0].x, items()[0].y]).toEqual([0, 0])
  })

  it('clears the redo stack after a new change', () => {
    store().addItem({ type: 'ball', color: '#fff' }, 0, 0)
    store().undo()
    store().addItem({ type: 'cone', color: ORANGE }, 0, 0)
    expect(store().future).toEqual([])
    store().redo()
    expect(items().map((i) => i.type)).toEqual(['cone'])
  })

  it('records a live edit as one step via snapshot and pushHistory', () => {
    const id = store().addLine('pass', { x: 0, y: 0 }, { x: 10, y: 0 }, '#fff')
    const pastBefore = store().past.length
    const before = store().snapshot()
    store().insertLinePoint(id, 1, { x: 5, y: 1 })
    store().setLinePoint(id, 1, { x: 5, y: 2 })
    store().setLinePoint(id, 1, { x: 5, y: 3 })
    store().pushHistory(before)
    expect(store().past.length).toBe(pastBefore + 1)
    store().undo()
    expect(lines()[0].points).toHaveLength(2)
  })

  it('does not record a live edit that changed nothing', () => {
    const pastBefore = store().past.length
    store().pushHistory(store().snapshot())
    expect(store().past.length).toBe(pastBefore)
  })

  it('ignores setting the same field type', () => {
    store().setFieldType('full')
    expect(store().past).toEqual([])
  })

  it('drops the selection if the selected element disappears on undo', () => {
    const id = store().addItem({ type: 'ball', color: '#fff' }, 0, 0)
    store().select(id)
    store().undo()
    expect(store().selectedId).toBeNull()
  })

  it('limits the history length', () => {
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) store().addItem({ type: 'ball', color: '#fff' }, i, 0)
    expect(store().past.length).toBe(HISTORY_LIMIT)
  })

  it('does nothing when there is nothing to undo or redo', () => {
    store().undo()
    store().redo()
    expect(items()).toEqual([])
  })
})

describe('load / new', () => {
  const drill: Drill = {
    title: 'Rondo 4 gegen 2',
    description: 'Aufwärmen',
    category: 'warmup',
    fieldType: 'penalty',
    pitch: { color: 'darkGreen', grid: 'thirds', orientation: 'portrait' },
    scenes: [
      {
        durationMs: 2000,
        items: [{ id: 'p1', type: 'player', x: 1, y: 2, rotation: 0, size: 1, shape: 'circle', color: '#dc2626', label: '1', name: '', highlight: false }],
        lines: [],
        zones: [],
      },
    ],
  }

  it('loads a drill, clears history and selection, and round-trips via currentDrill', () => {
    store().addItem({ type: 'ball', color: '#fff' }, 0, 0)
    store().loadDrill(drill)
    expect(store().past).toEqual([])
    expect(store().selectedId).toBeNull()
    expect(currentDrill(store())).toEqual(drill)
  })

  it('resets to an empty drill', () => {
    store().loadDrill(drill)
    store().newDrill()
    expect(currentDrill(store())).toEqual(emptyDrill())
  })
})

describe('title, description and category', () => {
  it('are saved with the drill but not recorded in the history', () => {
    store().setTitle('Rondo')
    store().setDescription('Zwei Kontakte')
    store().setCategory('passing')
    expect(store().past).toEqual([])
    const drill = currentDrill(store())
    expect([drill.title, drill.description, drill.category]).toEqual(['Rondo', 'Zwei Kontakte', 'passing'])
  })
})

describe('item size', () => {
  it('sets the size of one item, clamped to the allowed range, with undo', () => {
    const id = store().addItem({ type: 'player', color: TEAM_COLORS.red }, 0, 0)
    expect(items()[0].size).toBe(DEFAULT_PLAYER_SIZE)
    store().setItemSize(id, 2)
    expect(items()[0].size).toBe(2)
    store().setItemSize(id, 10)
    expect(items()[0].size).toBe(MAX_ITEM_SIZE)
    store().setItemSize(id, 0)
    expect(items()[0].size).toBe(MIN_ITEM_SIZE)
    store().undo()
    expect(items()[0].size).toBe(MAX_ITEM_SIZE)
  })

  it('applies one size to all items of the current scene only', () => {
    store().addItem({ type: 'player', color: TEAM_COLORS.red }, 0, 0)
    store().addItem({ type: 'cone', color: ORANGE }, 5, 5)
    store().addScene()
    store().setAllItemSizes(2)
    expect(items().map((i) => i.size)).toEqual([2, 2])
    expect(store().scenes[0].items.map((i) => i.size)).toEqual([DEFAULT_PLAYER_SIZE, 1])
  })

  it('starts players at 150 % and other items at 100 %', () => {
    store().addItem({ type: 'player', color: TEAM_COLORS.red }, 0, 0)
    store().addItem({ type: 'ball', color: '#fff' }, 0, 0)
    expect(items().map((i) => i.size)).toEqual([1.5, 1])
  })
})

describe('zones', () => {
  const zones = () => currentScene(store()).zones

  it('adds a zone with default size, centered at the drop position', () => {
    const id = store().addZone(RECT, 30, 20)
    expect(zones()).toEqual([
      {
        id,
        shape: 'rect',
        x: 30,
        y: 20,
        width: 20,
        height: 15,
        rotation: 0,
        color: '#facc15',
        fillColor: '#facc15',
        fillOpacity: 0.22,
        dashed: false,
        label: '',
        goals: 0,
        corners: null,
      },
    ])
  })

  it('changes position, size, rotation and style as single undo steps', () => {
    const id = store().addZone(ELLIPSE, 30, 20)
    store().updateZone(id, { x: 40, width: 30, height: 12, rotation: -90 })
    store().updateZone(id, { color: '#2563eb', dashed: true })
    expect(zones()[0]).toMatchObject({ x: 40, width: 30, height: 12, rotation: 270, color: '#2563eb', dashed: true })
    store().undo()
    expect(zones()[0].dashed).toBe(false)
    store().undo()
    expect(zones()[0].width).toBe(18)
  })

  it('sets fill and outline separately and keeps the opacity in range', () => {
    const id = store().addZone(RECT, 30, 20)
    store().updateZone(id, { fillColor: '#2563eb', color: '#dc2626', fillOpacity: 0.5 })
    expect(zones()[0]).toMatchObject({ fillColor: '#2563eb', color: '#dc2626', fillOpacity: 0.5 })
    store().updateZone(id, { fillOpacity: 3 })
    expect(zones()[0].fillOpacity).toBe(0.8)
    store().setZoneLive(id, { fillOpacity: -1 })
    expect(zones()[0].fillOpacity).toBe(0)
  })

  it('creates rhombus and trapezoid from templates and resets the corners', () => {
    const id = store().addZone(zoneTemplate('zone-rhombus'), 50, 34)
    expect(zones()[0].corners).toHaveLength(4)
    store().addZone(zoneTemplate('zone-trapezoid'), 50, 34)
    expect(zones()[1].corners![0]).toEqual({ x: -7, y: -7 })
    store().updateZone(id, { corners: null })
    expect(zones()[0].corners).toBeNull()
  })

  it('moves a corner live, recorded as one step via pushHistory', () => {
    const id = store().addZone(RECT, 30, 20)
    const before = store().snapshot()
    store().setZoneLive(id, {
      corners: [
        { x: -5, y: -7.5 },
        { x: 10, y: -7.5 },
        { x: 10, y: 7.5 },
        { x: -10, y: 7.5 },
      ],
    })
    store().pushHistory(before)
    expect(zones()[0].corners![0]).toEqual({ x: -5, y: -7.5 })
    store().undo()
    expect(zones()[0].corners).toBeNull()
  })

  it('creates small-sided fields with built-in goals that can be changed', () => {
    const id = store().addZone(zoneTemplate('field-6'), 50, 34)
    expect(zones()[0]).toMatchObject({ shape: 'rect', goals: 6, width: 40, height: 25 })
    store().updateZone(id, { goals: 4 })
    expect(zones()[0].goals).toBe(4)
  })

  it('keeps zones within the allowed size', () => {
    const id = store().addZone(RECT, 30, 20)
    store().updateZone(id, { width: 0.1, height: 999 })
    expect([zones()[0].width, zones()[0].height]).toEqual([MIN_ZONE_SIZE, MAX_ZONE_SIZE])
  })

  it('copies, finds and deletes zones like other elements', () => {
    const id = store().addZone(TRIANGLE, 30, 20)
    const copyId = store().insertCopy(zones()[0])
    expect(zones()[1]).toMatchObject({ x: 30 + COPY_OFFSET, y: 20 + COPY_OFFSET, shape: 'triangle' })
    expect(store().selectedId).toBe(copyId)
    store().deleteElement(id)
    expect(zones().map((z) => z.id)).toEqual([copyId])
  })

  it('carries zones into a new scene', () => {
    store().addZone(RECT, 30, 20)
    store().addScene()
    expect(zones()).toHaveLength(1)
  })

  it('edits the label live, recorded as one step via pushHistory', () => {
    const id = store().addZone(RECT, 30, 20)
    const before = store().snapshot()
    store().setZoneLive(id, { label: 'Z' })
    store().setZoneLive(id, { label: 'Zone A' })
    store().pushHistory(before)
    expect(zones()[0].label).toBe('Zone A')
    store().undo()
    expect(zones()[0].label).toBe('')
  })
})

describe('addItems', () => {
  it('adds several items as one undo step and numbers them one after another', () => {
    const red = TEAM_COLORS.red
    const ids = store().addItems([
      { item: { type: 'player', color: red }, x: 1, y: 1 },
      { item: { type: 'player', color: red }, x: 2, y: 2 },
      { item: { type: 'player', color: red, label: '10', name: 'Müller' }, x: 3, y: 3 },
    ])
    expect(ids).toHaveLength(3)
    expect(items().map((i) => i.label)).toEqual(['2', '3', '10'])
    expect(items()[2].name).toBe('Müller')
    store().undo()
    expect(items()).toEqual([])
  })
})

describe('name tags, highlight and text boxes', () => {
  it('starts players without name and highlight', () => {
    store().addItem({ type: 'player', color: TEAM_COLORS.red }, 0, 0)
    expect([items()[0].name, items()[0].highlight]).toEqual(['', false])
  })

  it('sets the name live (one undo step via pushHistory) and toggles the highlight with undo', () => {
    const id = store().addItem({ type: 'player', color: TEAM_COLORS.red }, 0, 0)
    const before = store().snapshot()
    store().setItemName(id, 'M')
    store().setItemName(id, 'Müller')
    store().pushHistory(before)
    store().setItemHighlight(id, true)
    expect([items()[0].name, items()[0].highlight]).toEqual(['Müller', true])
    store().undo()
    expect(items()[0].highlight).toBe(false)
    store().undo()
    expect(items()[0].name).toBe('')
  })

  it('changes the color of a player with undo and keeps its number', () => {
    const id = store().addItem({ type: 'player', color: TEAM_COLORS.red }, 0, 0)
    store().setItemColor(id, '#16a34a')
    expect([items()[0].color, items()[0].label]).toEqual(['#16a34a', '2'])
    store().undo()
    expect(items()[0].color).toBe(TEAM_COLORS.red)
  })

  it('creates text boxes with background color that can be changed', () => {
    const id = store().addItem({ type: 'textbox', color: '#fde047', label: 'Anweisung' }, 10, 10)
    store().setItemColor(id, '#2563eb')
    expect(items()[0]).toMatchObject({ type: 'textbox', color: '#2563eb', label: 'Anweisung', size: 1 })
  })
})

describe('pitch style', () => {
  it('changes pitch color and grid with undo', () => {
    store().setPitchColor('white')
    store().setGrid('positional')
    expect(store().pitch).toEqual({ color: 'white', grid: 'positional', orientation: 'landscape' })
    store().undo()
    expect(store().pitch.grid).toBe('none')
    store().undo()
    expect(store().pitch.color).toBe('grass')
  })

  it('switches between landscape and portrait with undo', () => {
    store().setOrientation('portrait')
    expect(store().pitch.orientation).toBe('portrait')
    store().undo()
    expect(store().pitch.orientation).toBe('landscape')
  })

  it('ignores setting the same value again', () => {
    store().setPitchColor('grass')
    store().setGrid('none')
    expect(store().past).toEqual([])
  })
})

describe('player shapes', () => {
  it('starts as a circle unless a shape is given', () => {
    store().addItem({ type: 'player', color: TEAM_COLORS.red }, 0, 0)
    store().addItem({ type: 'player', color: TEAM_COLORS.red, shape: 'triangle' }, 0, 0)
    expect(items().map((i) => i.shape)).toEqual(['circle', 'triangle'])
  })

  it('numbers each shape of a color separately', () => {
    const red = TEAM_COLORS.red
    store().addItem({ type: 'player', color: red }, 0, 0)
    store().addItem({ type: 'player', color: red }, 0, 0)
    store().addItem({ type: 'player', color: red, shape: 'triangle' }, 0, 0)
    store().addItem({ type: 'player', color: red, shape: 'cross' }, 0, 0)
    expect(items().map((i) => i.label)).toEqual(['2', '3', '2', '2'])
  })

  it('changes the shape with undo', () => {
    const id = store().addItem({ type: 'player', color: TEAM_COLORS.blue }, 0, 0)
    store().setItemShape(id, 'cross')
    expect(items()[0].shape).toBe('cross')
    store().undo()
    expect(items()[0].shape).toBe('circle')
  })
})

describe('helpers', () => {
  it('nextPlayerNumber continues after the highest number of that color', () => {
    const base = {
      type: 'player' as const,
      x: 0,
      y: 0,
      rotation: 0,
      size: 1,
      shape: 'circle' as const,
      name: '',
      highlight: false,
    }
    const items = [
      { ...base, id: 'a', color: 'red', label: '7' },
      { ...base, id: 'b', color: 'red', label: 'TW' },
      { ...base, id: 'c', color: 'blue', label: '9' },
    ]
    expect(nextPlayerNumber(items, 'red')).toBe(8)
    expect(nextPlayerNumber(items, 'green')).toBe(FIRST_PLAYER_NUMBER)
  })

  it('normalizeAngle keeps angles in [0, 360)', () => {
    expect(normalizeAngle(360)).toBe(0)
    expect(normalizeAngle(-90)).toBe(270)
    expect(normalizeAngle(725)).toBe(5)
  })
})

describe('scenes', () => {
  it('starts with one scene', () => {
    expect(store().scenes).toHaveLength(1)
    expect(store().sceneIndex).toBe(0)
  })

  it('adds a follow-up scene with the same items and no lines, and shows it', () => {
    const player = store().addItem({ type: 'player', color: TEAM_COLORS.red }, 10, 10)
    store().addLine('run', { x: 10, y: 10 }, { x: 30, y: 10 }, '#fff')
    store().addScene()
    expect(store().scenes).toHaveLength(2)
    expect(store().sceneIndex).toBe(1)
    expect(lines()).toEqual([])
    expect(items()[0].id).toBe(player)
    expect([items()[0].x, items()[0].y]).toEqual([30, 10])
  })

  it('edits only the current scene', () => {
    const id = store().addItem({ type: 'cone', color: ORANGE }, 5, 5)
    store().addScene()
    store().moveItem(id, 20, 20)
    store().selectScene(0)
    expect([items()[0].x, items()[0].y]).toEqual([5, 5])
  })

  it('inserts a new scene directly after the current one', () => {
    store().addScene()
    store().addScene()
    store().selectScene(0)
    store().addItem({ type: 'ball', color: '#fff' }, 0, 0)
    store().addScene()
    expect(store().sceneIndex).toBe(1)
    expect(store().scenes).toHaveLength(4)
    expect(items()).toHaveLength(1)
    expect(store().scenes[2].items).toHaveLength(0)
  })

  it('deletes the current scene but never the last remaining one', () => {
    store().addScene()
    store().deleteScene()
    expect(store().scenes).toHaveLength(1)
    expect(store().sceneIndex).toBe(0)
    store().deleteScene()
    expect(store().scenes).toHaveLength(1)
  })

  it('clamps the scene duration', () => {
    store().setSceneDuration(3000)
    expect(currentScene(store()).durationMs).toBe(3000)
    store().setSceneDuration(5)
    expect(currentScene(store()).durationMs).toBe(MIN_SCENE_DURATION_MS)
  })

  it('ignores invalid scene indexes', () => {
    store().selectScene(5)
    expect(store().sceneIndex).toBe(0)
  })

  it('undoes adding and deleting scenes', () => {
    store().addScene()
    store().undo()
    expect(store().scenes).toHaveLength(1)
    expect(store().sceneIndex).toBe(0)
    store().redo()
    expect(store().scenes).toHaveLength(2)
    store().deleteScene()
    store().undo()
    expect(store().scenes).toHaveLength(2)
  })

  it('jumps back to the edited scene on undo', () => {
    const id = store().addItem({ type: 'cone', color: ORANGE }, 5, 5)
    store().addScene()
    store().moveItem(id, 20, 20)
    store().selectScene(0)
    store().undo()
    expect(store().sceneIndex).toBe(1)
    expect([items()[0].x, items()[0].y]).toEqual([5, 5])
  })

  it('loads and saves all scenes', () => {
    store().addItem({ type: 'ball', color: '#fff' }, 1, 1)
    store().addScene()
    store().addScene()
    const drill = currentDrill(store())
    store().newDrill()
    store().loadDrill(drill)
    expect(store().scenes).toHaveLength(3)
    expect(store().sceneIndex).toBe(0)
  })
})
