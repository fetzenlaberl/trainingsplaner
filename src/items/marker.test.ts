import { describe, expect, it } from 'vitest'
import { emptyDrill, parseDrill, serializeDrill } from '../model/serialize'
import { nextMarkerValue, useDrillStore } from '../store/drillStore'
import type { Item } from '../model/types'
import { ITEM_TEMPLATES, MARKER_LETTERS, MARKER_NUMBERS, NEXT_LETTER_LABEL, NEXT_NUMBER_LABEL, previewLabel, stepMarker } from './palette'

const marker = (id: string, label: string): Item => ({
  id,
  type: 'marker',
  x: 10,
  y: 10,
  rotation: 0,
  size: 1,
  shape: 'circle',
  color: '#ffffff',
  label,
  name: '',
  highlight: false,
})

describe('markers', () => {
  it('offer numbers 1–30 and letters A–Z', () => {
    expect(MARKER_NUMBERS).toHaveLength(30)
    expect(MARKER_NUMBERS[29]).toBe('30')
    expect(MARKER_LETTERS.join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
  })

  it('step through the values and wrap around', () => {
    expect(stepMarker('1', 1)).toBe('2')
    expect(stepMarker('30', 1)).toBe('1')
    expect(stepMarker('1', -1)).toBe('30')
    expect(stepMarker('Z', 1)).toBe('A')
    expect(stepMarker('A', -1)).toBe('Z')
  })

  it('take the first free value, and start again when all are used', () => {
    expect(nextMarkerValue([marker('a', '1'), marker('b', '3')], MARKER_NUMBERS)).toBe('2')
    expect(nextMarkerValue([marker('a', 'A')], MARKER_LETTERS)).toBe('B')
    const all = MARKER_LETTERS.map((l, i) => marker(`m${i}`, l))
    expect(nextMarkerValue(all, MARKER_LETTERS)).toBe('A')
  })

  it('get the next value when dropped from the sidebar', () => {
    useDrillStore.getState().newDrill()
    const template = ITEM_TEMPLATES.find((t) => t.key === 'marker-number')!.item
    const letters = ITEM_TEMPLATES.find((t) => t.key === 'marker-letter')!.item
    const { addItem } = useDrillStore.getState()
    addItem(template, 1, 1)
    addItem(template, 2, 2)
    addItem(letters, 3, 3)
    const { scenes, sceneIndex } = useDrillStore.getState()
    expect(scenes[sceneIndex].items.map((i) => i.label)).toEqual(['1', '2', 'A'])
    expect(previewLabel(NEXT_NUMBER_LABEL)).toBe('1')
    expect(previewLabel(NEXT_LETTER_LABEL)).toBe('A')
  })

  it('are saved', () => {
    const drill = emptyDrill()
    drill.scenes[0].items.push(marker('m', '17'))
    expect(parseDrill(serializeDrill(drill)).scenes[0].items[0]).toEqual(marker('m', '17'))
  })
})
