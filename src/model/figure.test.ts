import { describe, expect, it } from 'vitest'
import { ITEM_TEMPLATES } from '../items/palette'
import { isStanding } from '../perspective/upright'
import { emptyDrill, parseDrill, serializeDrill } from './serialize'
import type { Item } from './types'

const figure: Item = {
  id: 'f1',
  type: 'figure',
  x: 10,
  y: 20,
  rotation: 180,
  size: 1.6,
  shape: 'circle',
  color: '#2563eb',
  label: '7',
  name: 'Max',
  highlight: false,
  pose: 'shoot',
}

describe('player figures', () => {
  it('are saved with their pose', () => {
    const drill = emptyDrill()
    drill.scenes[0].items.push(figure)
    expect(parseDrill(serializeDrill(drill)).scenes[0].items[0]).toEqual(figure)
  })

  it('reject unknown poses', () => {
    const drill = emptyDrill()
    drill.scenes[0].items.push({ ...figure, pose: 'dance' as never })
    expect(() => parseDrill(serializeDrill(drill))).toThrow()
  })

  it('come in five poses in the sidebar and stand upright in 3D', () => {
    const poses = ITEM_TEMPLATES.filter((t) => t.item.type === 'figure').map((t) => t.item.pose)
    expect(poses).toEqual(['stand', 'run', 'shoot', 'keeper', 'demand'])
    expect(isStanding('figure')).toBe(true)
  })
})
