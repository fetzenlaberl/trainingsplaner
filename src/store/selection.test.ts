import { describe, expect, it } from 'vitest'
import type { Item, Line, Zone } from '../model/types'
import { allElementIds, elementsInRect, rectFromPoints, toggleIds } from './selection'

const item = (id: string, x: number, y: number): Item => ({
  id,
  type: 'player',
  x,
  y,
  rotation: 0,
  size: 1,
  shape: 'circle',
  color: '#fff',
  label: '',
  name: '',
  highlight: false,
})

const line = (id: string, x1: number, x2: number, y: number): Line => ({
  id,
  type: 'pass',
  points: [
    { x: x1, y },
    { x: x2, y },
  ],
  smooth: false,
  color: '#fff',
  pattern: 'solid',
  weight: 'medium',
  step: null,
})

const zone = (id: string, x: number, y: number): Zone => ({
  id,
  shape: 'rect',
  x,
  y,
  width: 20,
  height: 10,
  rotation: 0,
  color: '#fff',
  fillColor: '#fff',
  fillOpacity: 0.2,
  dashed: false,
  label: '',
  goals: 0,
  corners: null,
})

const scene = {
  items: [item('inside', 10, 10), item('outside', 50, 50)],
  // Midpoints at (10, 20) and (40, 20)
  lines: [line('lineIn', 0, 20, 20), line('lineOut', 30, 50, 20)],
  zones: [zone('zoneIn', 15, 15), zone('zoneOut', 80, 15)],
}

describe('rectFromPoints', () => {
  it('works with corners in any order (e.g. a rotated portrait view)', () => {
    expect(
      rectFromPoints([
        { x: 30, y: 5 },
        { x: 10, y: 25 },
        { x: 20, y: 0 },
      ]),
    ).toEqual({ minX: 10, minY: 0, maxX: 30, maxY: 25 })
  })
})

describe('elementsInRect', () => {
  it('selects items and zones by their center and lines by their middle', () => {
    const ids = elementsInRect(scene, { minX: 0, minY: 0, maxX: 25, maxY: 25 })
    expect(ids.sort()).toEqual(['inside', 'lineIn', 'zoneIn'])
  })

  it('leaves out fixed elements', () => {
    const fixed = {
      items: [{ ...item('inside', 10, 10), locked: true }],
      lines: [{ ...line('lineIn', 0, 20, 20), locked: true }],
      zones: [{ ...zone('zoneIn', 15, 15), locked: true }, zone('free', 10, 10)],
    }
    expect(elementsInRect(fixed, { minX: 0, minY: 0, maxX: 25, maxY: 25 })).toEqual(['free'])
    expect(allElementIds(fixed)).toEqual(['free'])
  })

  it('selects nothing in an empty area', () => {
    expect(elementsInRect(scene, { minX: 90, minY: 60, maxX: 100, maxY: 68 })).toEqual([])
  })
})

describe('allElementIds / toggleIds', () => {
  it('lists every element of the scene', () => {
    expect(allElementIds(scene)).toHaveLength(6)
  })

  it('adds new ids and removes selected ones', () => {
    expect(toggleIds(['a', 'b'], ['b', 'c'])).toEqual(['a', 'c'])
  })
})
