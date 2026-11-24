import { describe, expect, it } from 'vitest'
import { ITEM_TEMPLATES } from './palette'
import { matchesSearch, PALETTE_GROUPS, paletteGroup } from './paletteGroups'

describe('sidebar groups', () => {
  it('puts every object into one of the groups', () => {
    const keys = PALETTE_GROUPS.map((g) => g.key)
    for (const t of ITEM_TEMPLATES) expect(keys, t.name).toContain(paletteGroup(t))
    expect(paletteGroup(ITEM_TEMPLATES.find((t) => t.key === 'cone')!)).toBe('equipment')
    expect(paletteGroup(ITEM_TEMPLATES.find((t) => t.key === 'bubble')!)).toBe('text')
  })

  it('finds objects by every word, ignoring case and umlauts', () => {
    expect(matchesSearch('Hütchen', 'hut')).toBe(true)
    expect(matchesSearch('Großtor von vorne', 'tor vorne')).toBe(true)
    expect(matchesSearch('Großtor von vorne', 'tor hinten')).toBe(false)
    expect(matchesSearch('Spieler Rot', '  ')).toBe(true)
  })
})
