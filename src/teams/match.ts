// Match reports of a team: header data, line-up (own squad only), events with minute
// and notes. Names and numbers are copied into the report so it stays complete when
// the squad changes later. No data about opponents' players.

import type { Team } from './team'

export type Venue = 'home' | 'away'

export type MatchEventKind = 'goal' | 'opponentGoal' | 'ownGoal' | 'yellow' | 'yellowRed' | 'red' | 'sub'

export interface MatchPlayer {
  /** Squad player id (may no longer exist in the squad) */
  playerId: string
  name: string
  number: string
  role: 'starter' | 'bench'
}

export interface MatchEvent {
  id: string
  /** Minute as text, e.g. "23" or "45+2"; empty = unknown */
  minute: string
  kind: MatchEventKind
  /** Scorer, booked player or player coming off; null for an opponent goal */
  playerId: string | null
  /** Assist (goal) or player coming on (substitution) */
  otherId: string | null
}

export interface Match {
  id: string
  teamId: string
  /** YYYY-MM-DD */
  date: string
  /** HH:MM or empty */
  time: string
  competition: string
  opponent: string
  venue: Venue
  /** Final score; null = count the goals in the events */
  goalsFor: number | null
  goalsAgainst: number | null
  /** Half-time score, null = not given */
  halfFor: number | null
  halfAgainst: number | null
  players: MatchPlayer[]
  events: MatchEvent[]
  notes: string
  createdAt: number
  updatedAt: number
}

export const EVENT_KINDS: { kind: MatchEventKind; label: string; symbol: string }[] = [
  { kind: 'goal', label: 'Tor', symbol: '⚽' },
  { kind: 'opponentGoal', label: 'Gegentor', symbol: '⚽' },
  { kind: 'ownGoal', label: 'Eigentor', symbol: '⚽' },
  { kind: 'yellow', label: 'Gelbe Karte', symbol: '🟨' },
  { kind: 'yellowRed', label: 'Gelb-Rot', symbol: '🟧' },
  { kind: 'red', label: 'Rote Karte', symbol: '🟥' },
  { kind: 'sub', label: 'Wechsel', symbol: '⇄' },
]

export const MAX_MATCH_NOTES = 4000

let idCounter = 0
export function createId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${idCounter}`
}

function today(now: number): string {
  const d = new Date(now)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** New report: the squad's starting eleven as starters, everyone else on the bench. */
export function createMatch(team: Team, now: number): Match {
  return {
    id: createId('match'),
    teamId: team.id,
    date: today(now),
    time: '',
    competition: '',
    opponent: '',
    venue: 'home',
    goalsFor: null,
    goalsAgainst: null,
    halfFor: null,
    halfAgainst: null,
    players: team.players.map((p) => ({
      playerId: p.id,
      name: p.name,
      number: p.number,
      role: p.starter ? 'starter' : 'bench',
    })),
    events: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

export function createEvent(kind: MatchEventKind, minute = ''): MatchEvent {
  return { id: createId('event'), minute, kind, playerId: null, otherId: null }
}

/** Minute for sorting: "45+2" → 45.02; unknown minutes go last. */
export function minuteValue(minute: string): number {
  const match = /^\s*(\d{1,3})\s*(?:\+\s*(\d{1,2}))?\s*'?\s*$/.exec(minute)
  if (!match) return Number.POSITIVE_INFINITY
  return Number(match[1]) + (match[2] ? Number(match[2]) / 100 : 0)
}

export function sortedEvents(events: MatchEvent[]): MatchEvent[] {
  return [...events].sort((a, b) => minuteValue(a.minute) - minuteValue(b.minute))
}

/** Goals counted from the events (own goals count for the opponent). */
export function countedScore(events: MatchEvent[]): { for: number; against: number } {
  return {
    for: events.filter((e) => e.kind === 'goal').length,
    against: events.filter((e) => e.kind === 'opponentGoal' || e.kind === 'ownGoal').length,
  }
}

/** Final score: entered by hand, or counted from the events. */
export function matchScore(match: Pick<Match, 'goalsFor' | 'goalsAgainst' | 'events'>): { for: number; against: number } {
  const counted = countedScore(match.events)
  return { for: match.goalsFor ?? counted.for, against: match.goalsAgainst ?? counted.against }
}

/** S (win), U (draw) or N (loss) — the usual German short forms. */
export function matchOutcome(match: Pick<Match, 'goalsFor' | 'goalsAgainst' | 'events'>): 'S' | 'U' | 'N' {
  const s = matchScore(match)
  return s.for > s.against ? 'S' : s.for === s.against ? 'U' : 'N'
}

/** "Heim – Gast" from the team's view. */
export function matchTitle(match: Pick<Match, 'venue' | 'opponent'>, teamName: string): string {
  const opponent = match.opponent.trim() || 'Gegner'
  return match.venue === 'home' ? `${teamName} – ${opponent}` : `${opponent} – ${teamName}`
}

/** Score as shown from the home team's view ("2:1"). */
export function scoreText(match: Pick<Match, 'venue' | 'goalsFor' | 'goalsAgainst' | 'events'>): string {
  const s = matchScore(match)
  return match.venue === 'home' ? `${s.for}:${s.against}` : `${s.against}:${s.for}`
}

export function halfTimeText(match: Pick<Match, 'venue' | 'halfFor' | 'halfAgainst'>): string {
  if (match.halfFor === null || match.halfAgainst === null) return ''
  return match.venue === 'home' ? `${match.halfFor}:${match.halfAgainst}` : `${match.halfAgainst}:${match.halfFor}`
}

/** Newest first. */
export function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => (a.date === b.date ? b.time.localeCompare(a.time) : b.date.localeCompare(a.date)))
}

/** "7 Max M." style label of a report player. */
export function matchPlayerLabel(player: MatchPlayer | undefined): string {
  if (!player) return '–'
  return [player.number, player.name].filter(Boolean).join(' ') || 'Spieler'
}

/** Text of one event, e.g. "Tor: 9 Name (Vorlage: 7 Name)". */
export function eventText(event: MatchEvent, players: MatchPlayer[]): string {
  const who = (id: string | null) => matchPlayerLabel(players.find((p) => p.playerId === id))
  const label = EVENT_KINDS.find((k) => k.kind === event.kind)?.label ?? ''
  switch (event.kind) {
    case 'opponentGoal':
      return label
    case 'goal':
      return `${label}: ${who(event.playerId)}${event.otherId ? ` (Vorlage: ${who(event.otherId)})` : ''}`
    case 'sub':
      return `${label}: ${who(event.otherId)} für ${who(event.playerId)}`
    default:
      return `${label}: ${who(event.playerId)}`
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const KINDS = EVENT_KINDS.map((k) => k.kind)
const isScore = (v: unknown) => v === null || (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v < 100)
const isIdOrNull = (v: unknown) => v === null || typeof v === 'string'

/** Validates a match from the database or a backup; null if broken. */
export function matchFromData(value: unknown): Match | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.teamId !== 'string' ||
    typeof value.date !== 'string' ||
    typeof value.time !== 'string' ||
    typeof value.competition !== 'string' ||
    typeof value.opponent !== 'string' ||
    (value.venue !== 'home' && value.venue !== 'away') ||
    !isScore(value.goalsFor) ||
    !isScore(value.goalsAgainst) ||
    !isScore(value.halfFor) ||
    !isScore(value.halfAgainst) ||
    !Array.isArray(value.players) ||
    !Array.isArray(value.events) ||
    typeof value.notes !== 'string' ||
    typeof value.createdAt !== 'number' ||
    typeof value.updatedAt !== 'number'
  ) {
    return null
  }
  const players: MatchPlayer[] = []
  for (const p of value.players) {
    if (
      !isRecord(p) ||
      typeof p.playerId !== 'string' ||
      typeof p.name !== 'string' ||
      typeof p.number !== 'string' ||
      (p.role !== 'starter' && p.role !== 'bench')
    ) {
      return null
    }
    players.push({ playerId: p.playerId, name: p.name, number: p.number, role: p.role })
  }
  const events: MatchEvent[] = []
  for (const e of value.events) {
    if (
      !isRecord(e) ||
      typeof e.id !== 'string' ||
      typeof e.minute !== 'string' ||
      !KINDS.includes(e.kind as MatchEventKind) ||
      !isIdOrNull(e.playerId) ||
      !isIdOrNull(e.otherId)
    ) {
      return null
    }
    events.push({
      id: e.id,
      minute: e.minute,
      kind: e.kind as MatchEventKind,
      playerId: e.playerId as string | null,
      otherId: e.otherId as string | null,
    })
  }
  return {
    id: value.id,
    teamId: value.teamId,
    date: value.date,
    time: value.time,
    competition: value.competition,
    opponent: value.opponent,
    venue: value.venue,
    goalsFor: value.goalsFor as number | null,
    goalsAgainst: value.goalsAgainst as number | null,
    halfFor: value.halfFor as number | null,
    halfAgainst: value.halfAgainst as number | null,
    players,
    events,
    notes: value.notes.slice(0, MAX_MATCH_NOTES),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

/** "21.11.2026" */
export function dateText(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : date
}
