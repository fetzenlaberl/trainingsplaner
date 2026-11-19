// Squads (teams with players) and their validation for backups.

export type Position =
  | 'TW'
  | 'IV'
  | 'LV'
  | 'RV'
  | 'ZDM'
  | 'ZM'
  | 'LM'
  | 'RM'
  | 'ZOM'
  | 'LA'
  | 'RA'
  | 'ST'

export const POSITIONS: { code: Position; name: string }[] = [
  { code: 'TW', name: 'Torwart' },
  { code: 'IV', name: 'Innenverteidiger' },
  { code: 'LV', name: 'Linker Verteidiger' },
  { code: 'RV', name: 'Rechter Verteidiger' },
  { code: 'ZDM', name: 'Defensives Mittelfeld' },
  { code: 'ZM', name: 'Zentrales Mittelfeld' },
  { code: 'LM', name: 'Linkes Mittelfeld' },
  { code: 'RM', name: 'Rechtes Mittelfeld' },
  { code: 'ZOM', name: 'Offensives Mittelfeld' },
  { code: 'LA', name: 'Linksaußen' },
  { code: 'RA', name: 'Rechtsaußen' },
  { code: 'ST', name: 'Stürmer' },
]

export interface TeamPlayer {
  id: string
  name: string
  /** Shirt number as text (e.g. "7"); empty = none */
  number: string
  position: Position | null
  /** Part of the starting eleven used by "Aufstellen" */
  starter: boolean
}

export interface Team {
  id: string
  name: string
  color: string
  players: TeamPlayer[]
  createdAt: number
  updatedAt: number
}

let idCounter = 0

function createId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${idCounter}`
}

export function createTeam(now: number, color: string): Team {
  return { id: createId('team'), name: 'Neue Mannschaft', color, players: [], createdAt: now, updatedAt: now }
}

/** Adds a player with the next free shirt number. */
export function addPlayer(team: Team): Team {
  const used = new Set(team.players.map((p) => Number.parseInt(p.number, 10)).filter((n) => !Number.isNaN(n)))
  let number = 1
  while (used.has(number)) number++
  const player: TeamPlayer = {
    id: createId('player'),
    name: '',
    number: String(number),
    position: null,
    starter: team.players.filter((p) => p.starter).length < 11,
  }
  return { ...team, players: [...team.players, player] }
}

/** Moves the player at `index` one step up (-1) or down (+1). */
export function movePlayer(players: TeamPlayer[], index: number, direction: -1 | 1): TeamPlayer[] {
  const target = index + direction
  if (index < 0 || index >= players.length || target < 0 || target >= players.length) return players
  const result = [...players]
  ;[result[index], result[target]] = [result[target], result[index]]
  return result
}

/** Name for display: "7 Müller", or just the number / name. */
export function playerLabel(player: Pick<TeamPlayer, 'name' | 'number'>): string {
  return [player.number, player.name].filter(Boolean).join(' ') || 'Spieler'
}

export function sortTeams(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const POSITION_CODES = POSITIONS.map((p) => p.code)

/** Validates a team from a backup; returns null if it is broken. */
export function teamFromData(value: unknown): Team | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.color !== 'string' ||
    !Array.isArray(value.players) ||
    typeof value.createdAt !== 'number' ||
    typeof value.updatedAt !== 'number'
  ) {
    return null
  }
  const players: TeamPlayer[] = []
  for (const p of value.players) {
    if (
      !isRecord(p) ||
      typeof p.id !== 'string' ||
      typeof p.name !== 'string' ||
      typeof p.number !== 'string' ||
      !(p.position === null || POSITION_CODES.includes(p.position as Position)) ||
      typeof p.starter !== 'boolean'
    ) {
      return null
    }
    players.push({
      id: p.id,
      name: p.name,
      number: p.number,
      position: p.position as Position | null,
      starter: p.starter,
    })
  }
  return {
    id: value.id,
    name: value.name,
    color: value.color,
    players,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}
