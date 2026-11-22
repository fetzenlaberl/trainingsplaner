import { beforeEach, describe, expect, it } from 'vitest'
import { ITEM_TEMPLATES } from './palette'
import { noteOrigin, rememberStyle, resetRememberedStyles, withRememberedStyle } from './rememberedStyle'
import type { Item } from '../model/types'

const template = (key: string) => ITEM_TEMPLATES.find((t) => t.key === key)!
const item = (type: Item['type'], id = 'i1'): Item => ({
  id,
  type,
  x: 0,
  y: 0,
  rotation: 0,
  size: 1,
  shape: 'circle',
  color: '#000000',
  label: '',
  name: '',
  highlight: false,
})

describe('remembered object style', () => {
  beforeEach(() => resetRememberedStyles())

  it('starts the next object of the same entry with the chosen color and size', () => {
    expect(withRememberedStyle(template('cone'))).toEqual(template('cone').item)
    rememberStyle(item('cone'), { color: '#2563eb' })
    rememberStyle(item('cone'), { size: 2 })
    expect(withRememberedStyle(template('cone'))).toMatchObject({ color: '#2563eb', size: 2 })
  })

  it('keeps the team color of players and only carries over their size', () => {
    noteOrigin('p1', 'player-red')
    rememberStyle(item('player', 'p1'), { color: '#22c55e', size: 2.5 })
    expect(withRememberedStyle(template('player-red'))).toMatchObject({ color: template('player-red').item.color, size: 2.5 })
    expect(withRememberedStyle(template('player-blue')).size).toBe(template('player-blue').item.size)
  })

  it('keeps the symbol look (border, flat, outline) for all player entries until changed', () => {
    rememberStyle(item('player', 'p2'), { symbol: 'outline' })
    expect(withRememberedStyle(template('player-blue')).symbol).toBe('outline')
    expect(withRememberedStyle(template('keeper')).symbol).toBe('outline')
    expect(withRememberedStyle(template('cone')).symbol).toBeUndefined()
    rememberStyle(item('coach', 'c1'), { symbol: 'flat' })
    const coaches = ITEM_TEMPLATES.filter((t) => t.item.type === 'coach').map((t) => withRememberedStyle(t).symbol)
    expect(coaches.length).toBeGreaterThan(1)
    expect(coaches.every((s) => s === 'flat')).toBe(true)
    expect(withRememberedStyle(template('player-blue')).symbol).toBe('outline')
    rememberStyle(item('player', 'p2'), { symbol: null })
    expect(withRememberedStyle(template('player-blue')).symbol).toBeUndefined()
  })

  it('keeps the look of cones for the next cone', () => {
    rememberStyle(item('cone'), { symbol: 'flat' })
    expect(withRememberedStyle(template('cone')).symbol).toBe('flat')
    rememberStyle(item('ring'), { symbol: 'outline' })
    expect(withRememberedStyle(template('ring')).symbol).toBe('outline')
    expect(withRememberedStyle(template('disc')).symbol).toBeUndefined()
    noteOrigin('mk', 'marker-letter')
    rememberStyle(item('marker', 'mk'), { symbol: 'flat' })
    expect(withRememberedStyle(template('marker-letter')).symbol).toBe('flat')
    expect(withRememberedStyle(template('marker-number')).symbol).toBeUndefined()
    expect(withRememberedStyle(template('player-red')).symbol).toBeUndefined()
  })

  it('remembers per entry when a type has several entries, by where the object came from', () => {
    rememberStyle(item('discPole', 'x'), { color: '#dc2626' })
    expect(withRememberedStyle(template('disc-pole-left')).color).toBe(template('disc-pole-left').item.color)
    noteOrigin('d1', 'disc-pole-left')
    rememberStyle(item('discPole', 'd1'), { color: '#dc2626' })
    expect(withRememberedStyle(template('disc-pole-left')).color).toBe('#dc2626')
    expect(withRememberedStyle(template('disc-pole-right')).color).toBe(template('disc-pole-right').item.color)
  })
})
