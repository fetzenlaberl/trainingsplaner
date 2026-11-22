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

  it('come in eight poses in the sidebar and stand upright in 3D', () => {
    const poses = ITEM_TEMPLATES.filter((t) => t.item.type === 'figure').map((t) => t.item.pose)
    expect(poses).toEqual(['stand', 'front', 'run', 'sprint', 'pass', 'shoot', 'keeper', 'demand'])
    expect(isStanding('figure')).toBe(true)
  })

  it('saves flag poles, leaning poles on discs and the goal seen from the front', () => {
    const drill = emptyDrill()
    drill.scenes[0].items.push(
      { ...figure, id: 'p1', type: 'discPole', pose: undefined, lean: 'back' },
      { ...figure, id: 'p2', type: 'flagPole', pose: undefined },
      { ...figure, id: 'p3', type: 'goalFront', pose: undefined },
    )
    const items = parseDrill(serializeDrill(drill)).scenes[0].items
    expect(items.map((i) => i.type)).toEqual(['discPole', 'flagPole', 'goalFront'])
    expect(items[0].lean).toBe('back')
    expect(['discPole', 'flagPole', 'goalFront'].every((t) => isStanding(t as Item['type']))).toBe(true)
    const leans = ITEM_TEMPLATES.filter((t) => t.item.type === 'discPole').map((t) => t.item.lean)
    expect(leans).toEqual(['left', 'right', 'front', 'back'])
    const broken = emptyDrill()
    broken.scenes[0].items.push({ ...figure, type: 'discPole', lean: 'up' as never })
    expect(() => parseDrill(serializeDrill(broken))).toThrow()
  })
})
