import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_ITEM_SIZE, MIN_ITEM_SIZE, TEAM_COLORS } from '../items/palette'
import { emptyDrill } from '../model/serialize'
import type { Drill } from '../model/types'
import {
  COPY_OFFSET,
  currentDrill,
  currentScene,
  HISTORY_LIMIT,
  MIN_SCENE_DURATION_MS,
  nextPlayerNumber,
  normalizeAngle,
  useDrillStore,
} from './drillStore'

const store = () => useDrillStore.getState()
const items = () => currentScene(store()).items
const lines = () => currentScene(store()).lines
const ORANGE = '#f97316'

beforeEach(() => store().newDrill())

describe('items', () => {
  it('adds an item at the given position in meters', () => {
    const id = store().addItem({ type: 'cone', color: ORANGE }, 20.5, 30)
    expect(items()).toEqual([
      { id, type: 'cone', x: 20.5, y: 30, rotation: 0, size: 1, color: ORANGE, label: '' },
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
    expect(items().map((i) => i.label)).toEqual(['1', '2', '1'])
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
        control: null,
        color: '#ffffff',
      },
    ])
  })

  it('bends and straightens a line', () => {
    const id = store().addLine('run', { x: 0, y: 0 }, { x: 10, y: 0 }, '#ffffff')
    store().setLineControl(id, { x: 5, y: 4 })
    expect(lines()[0].control).toEqual({ x: 5, y: 4 })
    store().setLineControl(id, null)
    expect(lines()[0].control).toBeNull()
  })

  it('moves a line including its control point', () => {
    const id = store().addLine('pass', { x: 0, y: 0 }, { x: 10, y: 0 }, '#ffffff')
    store().setLineControl(id, { x: 5, y: 4 })
    store().moveLine(id, 2, 3)
    const line = lines()[0]
    expect(line.points).toEqual([
      { x: 2, y: 3 },
      { x: 12, y: 3 },
    ])
    expect(line.control).toEqual({ x: 7, y: 7 })
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
    expect(copy.label).toBe('2')
    expect(store().selectedId).toBe(copyId)
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
    store().setLineControl(id, { x: 5, y: 1 })
    store().setLineControl(id, { x: 5, y: 2 })
    store().setLineControl(id, { x: 5, y: 3 })
    store().pushHistory(before)
    expect(store().past.length).toBe(pastBefore + 1)
    store().undo()
    expect(lines()[0].control).toBeNull()
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
    scenes: [
      {
        durationMs: 2000,
        items: [{ id: 'p1', type: 'player', x: 1, y: 2, rotation: 0, size: 1, color: '#dc2626', label: '1' }],
        lines: [],
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
    expect(items()[0].size).toBe(1)
    store().setItemSize(id, 1.5)
    expect(items()[0].size).toBe(1.5)
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
    expect(store().scenes[0].items.map((i) => i.size)).toEqual([1, 1])
  })
})

describe('helpers', () => {
  it('nextPlayerNumber continues after the highest number of that color', () => {
    const base = { type: 'player' as const, x: 0, y: 0, rotation: 0, size: 1 }
    const items = [
      { ...base, id: 'a', color: 'red', label: '7' },
      { ...base, id: 'b', color: 'red', label: 'TW' },
      { ...base, id: 'c', color: 'blue', label: '9' },
    ]
    expect(nextPlayerNumber(items, 'red')).toBe(8)
    expect(nextPlayerNumber(items, 'green')).toBe(1)
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
