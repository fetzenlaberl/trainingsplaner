import { describe, expect, it } from 'vitest'
import { fieldVariantDrill } from '../model/fieldTemplates'
import { parseDrill, serializeDrill } from '../model/serialize'
import { parseBackup, serializeBackup } from '../library/library'
import { applyDesign, BUILT_IN_DESIGNS, copyDesign, designFromData, designFromDrill, markingColor, playerColorOrder, playerNameList, setPlayerNames } from './design'

const navy = BUILT_IN_DESIGNS.find((d) => d.id === 'design-builtin-navy')!
const whiteboard = BUILT_IN_DESIGNS.find((d) => d.id === 'design-builtin-whiteboard')!

describe('design templates', () => {
  it('come with five valid ready-made designs', () => {
    expect(BUILT_IN_DESIGNS).toHaveLength(5)
    for (const { builtIn, ...design } of BUILT_IN_DESIGNS) {
      expect(builtIn).toBe(true)
      expect(designFromData(design)).toEqual(design)
    }
  })

  it('orders player colors by how often they are used', () => {
    const drill = fieldVariantDrill('overload') // 5 blue, 3 red
    expect(playerColorOrder(drill)).toEqual(['#2563eb', '#dc2626'])
  })

  it('puts the look onto the whole drill and keeps positions', () => {
    const drill = fieldVariantDrill('possessionTransfer')
    const styled = applyDesign(drill, whiteboard)
    expect(styled.pitch.color).toBe('white')
    expect(styled.pitch.lineColor).toBeUndefined()
    expect(styled.pitch.orientation).toBe('portrait')
    const players = styled.scenes[0].items.filter((i) => i.type === 'player')
    // Five each: the first three colors map onto team A, team B and the neutrals.
    expect(new Set(players.map((p) => p.color))).toEqual(new Set(whiteboard.teams))
    expect(players.every((p) => p.symbol === 'flat')).toBe(true)
    const before = drill.scenes[0].items.map((i) => [i.x, i.y])
    expect(styled.scenes[0].items.map((i) => [i.x, i.y])).toEqual(before)
    // The unfilled field outline takes the marking color of the design.
    expect(styled.scenes[0].zones[0].color).toBe(markingColor(whiteboard.pitch))
    expect(parseDrill(serializeDrill(styled))).toEqual(styled)
  })

  it('styles drawn lines by type and markings in the pitch line color', () => {
    const drill = fieldVariantDrill('zones')
    const styled = applyDesign(drill, navy)
    const dividers = styled.scenes[0].lines.filter((l) => l.type === 'line')
    expect(dividers.length).toBeGreaterThan(0)
    expect(dividers.every((l) => l.color === navy.pitch.lineColor)).toBe(true)
  })

  it('takes a design from a drill and keeps it through a backup', () => {
    const styled = applyDesign(fieldVariantDrill('possessionTransfer'), navy)
    const design = designFromDrill(styled, BUILT_IN_DESIGNS[0], 'Mein Design', 'design-own', 5)
    expect(design.pitch).toEqual(navy.pitch)
    expect(design.builtIn).toBeUndefined()
    expect(designFromData(design)).toEqual(design)
    const copy = copyDesign(navy, 'design-copy', 7)
    expect(copy.builtIn).toBeUndefined()
    const backup = parseBackup(serializeBackup({ entries: [], sessions: [], teams: [], days: [], designs: [design, copy] }))
    expect(backup.designs).toEqual([design, copy])
  })

  it('shortens or removes name tags and colors the goals', () => {
    const drill = fieldVariantDrill('standard')
    const item = drill.scenes[0].items.find((i) => i.type === 'player')!
    item.name = 'Max Müller'
    const short = { ...navy, player: { ...navy.player, names: 'initials' as const }, goalColor: '#ff0000' }
    const styled = applyDesign(drill, short)
    expect(styled.scenes[0].items.find((i) => i.id === item.id)!.name).toBe('MM')
    expect(styled.scenes[0].items.filter((i) => i.type === 'goal').every((g) => g.color === '#ff0000')).toBe(true)
    // Initials stay initials when applied again; "none" removes the tag.
    expect(applyDesign(styled, short).scenes[0].items.find((i) => i.id === item.id)!.name).toBe('MM')
    const none = applyDesign(drill, { ...navy, player: { ...navy.player, names: 'none' } })
    expect(none.scenes[0].items.find((i) => i.id === item.id)!.name).toBe('')
    // Designs saved before name tags and goal color keep both as they are.
    const { goalColor: _g, ...old } = navy
    const parsed = designFromData({ ...old, player: { shape: 'circle', symbol: 'flat', size: null, facing: false } })
    expect(parsed?.goalColor).toBeNull()
    expect(parsed?.player.names).toBe('keep')
  })

  it('can set a plain pitch without stripes', () => {
    const plain = { ...BUILT_IN_DESIGNS[2], pitch: { ...BUILT_IN_DESIGNS[2].pitch, mowing: 'none' as const } }
    expect(designFromData(plain)?.pitch.mowing).toBe('none')
    expect(applyDesign(fieldVariantDrill('standard'), plain).pitch).toMatchObject({ color: 'black', mowing: 'none' })
  })

  it('keeps an own pitch color and a player size in percent', () => {
    const { builtIn: _b, ...base } = navy
    const own = {
      ...base,
      pitch: { ...navy.pitch, gradient: { from: '#123456', to: '#123456', direction: 'leftRight' as const } },
      player: { ...navy.player, size: 1.2 },
    }
    expect(designFromData(own)).toEqual(own)
    const styled = applyDesign(fieldVariantDrill('standard'), own)
    expect(styled.pitch.gradient?.from).toBe('#123456')
    expect(styled.scenes[0].items.filter((i) => i.type === 'player').every((p) => p.size === 1.2)).toBe(true)
  })

  it('can show players without numbers and edit their name tags', () => {
    const drill = fieldVariantDrill('standard')
    const plain = applyDesign(drill, { ...navy, player: { ...navy.player, numbers: 'none' } })
    expect(plain.scenes[0].items.filter((i) => i.type === 'player').every((p) => p.label === '')).toBe(true)
    // Older designs without the setting keep the numbers.
    const { numbers: _n, ...oldPlayer } = navy.player
    expect(designFromData({ ...navy, player: oldPlayer })?.player.numbers).toBe('keep')

    const list = playerNameList(drill)
    expect(list.length).toBe(drill.scenes[0].items.filter((i) => i.type === 'player').length)
    const [a, b] = list
    const named = setPlayerNames(drill, { [a.id]: '  Max Müller ', [b.id]: '' })
    const after = playerNameList(named)
    expect(after.find((p) => p.id === a.id)?.name).toBe('Max Müller')
    expect(after.find((p) => p.id === b.id)?.name).toBe('')
    expect(setPlayerNames(drill, {})).toBe(drill)
    expect(parseDrill(serializeDrill(named))).toEqual(named)
  })

  it('rejects broken designs', () => {
    expect(designFromData({ ...navy, teams: ['#fff'] })).toBeNull()
    expect(designFromData({ ...navy, pitch: { color: 'rainbow' } })).toBeNull()
    expect(designFromData(null)).toBeNull()
  })
})
