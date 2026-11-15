import { beforeEach, describe, expect, it } from 'vitest'
import { TEAM_COLORS } from '../items/palette'
import { nextPlayerNumber, useDrillStore } from './drillStore'

describe('drillStore items', () => {
  beforeEach(() => useDrillStore.setState({ items: [] }))

  it('adds an item at the given position in meters', () => {
    const id = useDrillStore.getState().addItem({ type: 'cone', color: '#f97316' }, 20.5, 30)
    const [item] = useDrillStore.getState().items
    expect(item).toEqual({
      id,
      type: 'cone',
      x: 20.5,
      y: 30,
      rotation: 0,
      color: '#f97316',
      label: '',
    })
  })

  it('gives every item a unique id', () => {
    const { addItem } = useDrillStore.getState()
    const a = addItem({ type: 'ball', color: '#fff' }, 0, 0)
    const b = addItem({ type: 'ball', color: '#fff' }, 0, 0)
    expect(a).not.toBe(b)
  })

  it('numbers players per team color', () => {
    const { addItem } = useDrillStore.getState()
    addItem({ type: 'player', color: TEAM_COLORS.red }, 0, 0)
    addItem({ type: 'player', color: TEAM_COLORS.red }, 0, 0)
    addItem({ type: 'player', color: TEAM_COLORS.blue }, 0, 0)
    const labels = useDrillStore.getState().items.map((i) => i.label)
    expect(labels).toEqual(['1', '2', '1'])
  })

  it('keeps an explicit label', () => {
    useDrillStore.getState().addItem({ type: 'text', color: '#fff', label: 'Text' }, 0, 0)
    expect(useDrillStore.getState().items[0].label).toBe('Text')
  })

  it('moves only the given item', () => {
    const { addItem, moveItem } = useDrillStore.getState()
    const a = addItem({ type: 'cone', color: '#f97316' }, 1, 1)
    addItem({ type: 'cone', color: '#f97316' }, 2, 2)
    moveItem(a, 10, 20)
    const [first, second] = useDrillStore.getState().items
    expect([first.x, first.y]).toEqual([10, 20])
    expect([second.x, second.y]).toEqual([2, 2])
  })
})

describe('nextPlayerNumber', () => {
  it('continues after the highest number, ignoring other colors and non-numbers', () => {
    const base = { type: 'player' as const, x: 0, y: 0, rotation: 0 }
    const items = [
      { ...base, id: 'a', color: 'red', label: '7' },
      { ...base, id: 'b', color: 'red', label: 'TW' },
      { ...base, id: 'c', color: 'blue', label: '9' },
    ]
    expect(nextPlayerNumber(items, 'red')).toBe(8)
    expect(nextPlayerNumber(items, 'green')).toBe(1)
  })
})

describe('drillStore lines', () => {
  beforeEach(() => useDrillStore.setState({ lines: [] }))

  it('adds a straight line', () => {
    const id = useDrillStore
      .getState()
      .addLine('pass', { x: 1, y: 2 }, { x: 5, y: 6 }, '#ffffff')
    expect(useDrillStore.getState().lines).toEqual([
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
    const { addLine, setLineControl } = useDrillStore.getState()
    const id = addLine('run', { x: 0, y: 0 }, { x: 10, y: 0 }, '#ffffff')
    setLineControl(id, { x: 5, y: 4 })
    expect(useDrillStore.getState().lines[0].control).toEqual({ x: 5, y: 4 })
    setLineControl(id, null)
    expect(useDrillStore.getState().lines[0].control).toBeNull()
  })
})
