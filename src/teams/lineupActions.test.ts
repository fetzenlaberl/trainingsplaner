import { describe, expect, it } from 'vitest'
import { itemForPlayer } from './lineupActions'
import type { Team } from './team'

const team: Team = { id: 't', name: 'Test', color: '#dc2626', createdAt: 0, updatedAt: 0, players: [] }
const player = { id: 'p', name: 'Max Muster', number: '7', position: null, starter: true }

describe('itemForPlayer', () => {
  it('keeps the circle with arrow by default', () => {
    const item = itemForPlayer(team, player)
    expect(item.shape).toBe('circle')
    expect(item.facing).toBeUndefined()
  })

  it('draws circle, triangle or shirt without arrow', () => {
    for (const look of ['circle', 'triangle', 'shirt'] as const) {
      expect(itemForPlayer(team, player, 'full', look)).toMatchObject({ shape: look, facing: false, label: '7' })
    }
  })
})
