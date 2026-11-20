import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDbConnection } from '../storage/db'
import { addPlayer, basePosition, createTeam, isKeeper, movePlayer, nameForStyle, nameInitials, playerLabel, POSITIONS, purgeTrash, restorePlayer, teamFromData, trashPlayer } from './team'
import { deleteTeam, listTeams, putTeam } from './teamDb'

describe('player trash', () => {
  const full = () => {
    let team = createTeam(0, '#dc2626')
    for (let i = 0; i < 3; i++) team = addPlayer(team)
    return team
  }

  it('moves players into the trash and back', () => {
    const team = full()
    const [a, b] = team.players
    const trashed = trashPlayer(trashPlayer(team, a.id), b.id)
    expect(trashed.players).toHaveLength(1)
    expect(trashed.trash?.map((p) => p.id)).toEqual([b.id, a.id])
    const restored = restorePlayer(trashed, a.id)
    expect(restored.players.map((p) => p.id)).toEqual([team.players[2].id, a.id])
    expect(restored.trash?.map((p) => p.id)).toEqual([b.id])
  })

  it('deletes single players or the whole trash for good', () => {
    const team = full()
    const trashed = trashPlayer(trashPlayer(team, team.players[0].id), team.players[1].id)
    expect(purgeTrash(trashed, team.players[0].id).trash).toHaveLength(1)
    expect(purgeTrash(trashed).trash).toEqual([])
  })

  it('keeps the trash when loading and accepts teams without one', () => {
    const team = trashPlayer(full(), full().players[0].id)
    const withTrash = trashPlayer(team, team.players[0].id)
    expect(teamFromData(JSON.parse(JSON.stringify(withTrash)))).toEqual(withTrash)
    expect(teamFromData({ ...withTrash, trash: [{ id: 1 }] })).toBeNull()
    const { trash: _trash, ...plain } = withTrash
    expect(teamFromData(plain)?.trash).toBeUndefined()
  })
})

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

describe('name styles', () => {
  it('takes the first letters of first name and surname', () => {
    expect(nameInitials('Max Müller')).toBe('MM')
    expect(nameInitials('  anna   von berg ')).toBe('AVB')
    expect(nameInitials('')).toBe('')
  })

  it('formats the name tag', () => {
    expect(nameForStyle('Max Müller', 'full')).toBe('Max Müller')
    expect(nameForStyle('Max Müller', 'initials')).toBe('MM')
    expect(nameForStyle('Max Müller', 'none')).toBe('')
  })
})

describe('positions', () => {
  it('has unique stored codes and maps roles to basic positions', () => {
    const codes = POSITIONS.map((p) => p.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect(basePosition('RIV')).toBe('IV')
    expect(basePosition('ZOM10S')).toBe('ZOM')
    expect(basePosition('MS9')).toBe('ST')
    expect(isKeeper('TSP')).toBe(true)
    expect(isKeeper('ET')).toBe(true)
    expect(isKeeper('LOV')).toBe(false)
    expect(isKeeper(null)).toBe(false)
  })
})
