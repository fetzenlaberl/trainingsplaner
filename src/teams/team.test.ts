import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDbConnection } from '../storage/db'
import { addPlayer, createTeam, movePlayer, playerLabel, teamFromData } from './team'
import { deleteTeam, listTeams, putTeam } from './teamDb'

describe('team helpers', () => {
  it('adds players with the next free number and fills the starting eleven first', () => {
    let team = createTeam(0, '#dc2626')
    for (let i = 0; i < 12; i++) team = addPlayer(team)
    expect(team.players.map((p) => p.number).slice(0, 3)).toEqual(['1', '2', '3'])
    expect(team.players.filter((p) => p.starter)).toHaveLength(11)
    expect(team.players[11].starter).toBe(false)
  })

  it('skips numbers that are already taken', () => {
    let team = addPlayer(createTeam(0, '#dc2626'))
    team = { ...team, players: [{ ...team.players[0], number: '2' }] }
    team = addPlayer(team)
    expect(team.players[1].number).toBe('1')
  })

  it('moves players and ignores moves past the ends', () => {
    let team = createTeam(0, '#dc2626')
    team = addPlayer(addPlayer(team))
    const [a, b] = team.players
    expect(movePlayer(team.players, 0, 1).map((p) => p.id)).toEqual([b.id, a.id])
    expect(movePlayer(team.players, 0, -1)).toBe(team.players)
  })

  it('builds a readable label', () => {
    expect(playerLabel({ number: '7', name: 'Müller' })).toBe('7 Müller')
    expect(playerLabel({ number: '', name: '' })).toBe('Spieler')
  })

  it('validates teams from backups', () => {
    const team = addPlayer(createTeam(0, '#dc2626'))
    expect(teamFromData(JSON.parse(JSON.stringify(team)))).toEqual(team)
    expect(teamFromData({ ...team, players: [{ ...team.players[0], position: 'Libero' }] })).toBeNull()
    expect(teamFromData({ ...team, name: 3 })).toBeNull()
  })
})

describe('teamDb', () => {
  beforeEach(async () => {
    resetDbConnection()
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('trainingsplaner')
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
      request.onblocked = () => resolve()
    })
  })

  it('stores, lists alphabetically and deletes teams', async () => {
    await putTeam({ ...createTeam(0, '#fff'), id: 'b', name: 'U13' })
    await putTeam({ ...createTeam(0, '#fff'), id: 'a', name: 'Kampfmannschaft' })
    expect((await listTeams()).map((t) => t.name)).toEqual(['Kampfmannschaft', 'U13'])
    await deleteTeam('a')
    expect((await listTeams()).map((t) => t.id)).toEqual(['b'])
  })
})
