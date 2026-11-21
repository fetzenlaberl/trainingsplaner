import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetDbConnection } from '../storage/db'
import {
  countedScore,
  createEvent,
  createMatch,
  eventText,
  halfTimeText,
  matchFromData,
  matchOutcome,
  matchTitle,
  minuteValue,
  scoreText,
  sortedEvents,
  sortMatches,
  type Match,
} from './match'
import { deleteMatch, listMatches, putMatch } from './matchDb'
import { addPlayer, createTeam } from './team'

function team() {
  let t = createTeam(0, '#dc2626')
  for (let i = 0; i < 13; i++) t = addPlayer(t)
  t.players[0].name = 'Anton Adler'
  t.players[8].name = 'Ida Igel'
  return t
}

describe('createMatch', () => {
  it('takes the squad: starting eleven as starters, the rest on the bench', () => {
    const match = createMatch(team(), Date.UTC(2026, 10, 21, 12))
    expect(match.date).toBe('2026-11-21')
    expect(match.players.filter((p) => p.role === 'starter')).toHaveLength(11)
    expect(match.players.filter((p) => p.role === 'bench')).toHaveLength(2)
    expect(match.players[0]).toMatchObject({ name: 'Anton Adler', number: '1' })
  })
})

describe('score and events', () => {
  const t = team()
  const base = createMatch(t, 0)
  const goal = { ...createEvent('goal', '23'), playerId: t.players[8].id, otherId: t.players[0].id }
  const against = createEvent('opponentGoal', '45+2')
  const own = { ...createEvent('ownGoal', '80'), playerId: t.players[0].id }
  const match: Match = { ...base, opponent: 'FC Beispiel', events: [own, goal, against, { ...goal, id: 'g2', minute: '' }] }

  it('counts goals from the events, own goals for the opponent', () => {
    expect(countedScore(match.events)).toEqual({ for: 2, against: 2 })
    expect(matchOutcome(match)).toBe('U')
  })

  it('prefers a score entered by hand', () => {
    expect(matchOutcome({ ...match, goalsFor: 3, goalsAgainst: 1 })).toBe('S')
  })

  it('shows the score and title from the home team view', () => {
    const won = { ...match, goalsFor: 3, goalsAgainst: 1 }
    expect(scoreText(won)).toBe('3:1')
    expect(scoreText({ ...won, venue: 'away' })).toBe('1:3')
    expect(matchTitle({ ...won, venue: 'away' }, 'Wir')).toBe('FC Beispiel – Wir')
    expect(halfTimeText({ venue: 'away', halfFor: 1, halfAgainst: 0 })).toBe('0:1')
    expect(halfTimeText({ venue: 'home', halfFor: null, halfAgainst: 0 })).toBe('')
  })

  it('sorts events by minute, stoppage time after the minute, unknown last', () => {
    expect(minuteValue('45+2')).toBeCloseTo(45.02)
    expect(minuteValue('x')).toBe(Number.POSITIVE_INFINITY)
    expect(sortedEvents(match.events).map((e) => e.minute)).toEqual(['23', '45+2', '80', ''])
  })

  it('describes events with players', () => {
    expect(eventText(goal, match.players)).toBe('Tor: 9 Ida Igel (Vorlage: 1 Anton Adler)')
    expect(eventText(against, match.players)).toBe('Gegentor')
    const sub = { ...createEvent('sub', '60'), playerId: t.players[0].id, otherId: t.players[12].id }
    expect(eventText(sub, match.players)).toBe('Wechsel: 13 für 1 Anton Adler')
  })

  it('validates stored reports', () => {
    expect(matchFromData(JSON.parse(JSON.stringify(match)))).toEqual(match)
    expect(matchFromData({ ...match, venue: 'neutral' })).toBeNull()
    expect(matchFromData({ ...match, goalsFor: -1 })).toBeNull()
    expect(matchFromData({ ...match, events: [{ ...goal, kind: 'corner' }] })).toBeNull()
  })

  it('lists the newest match first', () => {
    const a = { ...match, id: 'a', date: '2026-09-01' }
    const b = { ...match, id: 'b', date: '2026-10-01' }
    expect(sortMatches([a, b]).map((m) => m.id)).toEqual(['b', 'a'])
  })
})

describe('matchDb', () => {
  beforeEach(async () => {
    resetDbConnection()
    await new Promise<void>((resolve) => {
      const request = indexedDB.deleteDatabase('trainingsplaner')
      request.onsuccess = () => resolve()
      request.onerror = () => resolve()
    })
  })

  it('stores, lists and deletes reports', async () => {
    const match = createMatch(team(), 0)
    await putMatch(match)
    expect(await listMatches()).toEqual([match])
    await deleteMatch(match.id)
    expect(await listMatches()).toEqual([])
  })
})
