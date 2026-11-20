// Squads (teams with players) and their validation for backups.

export type Position =
  | 'TW'
  | 'ET'
  | 'TSP'
  | 'IV'
  | 'RIV'
  | 'LIV'
  | 'ZIV'
  | 'LV'
  | 'LOV'
  | 'RV'
  | 'ROV'
  | 'ZDM'
  | 'ZDM6'
  | 'ZDM6A'
  | 'ZDM6S'
  | 'ZM'
  | 'ZOM8'
  | 'LM'
  | 'RM'
  | 'ZOM'
  | 'ZOM10'
  | 'ZOM10S'
  | 'LA'
  | 'RA'
  | 'ST'
  | 'MS9'
  | 'MSF9'

export interface PositionInfo {
  /** Stored value (unique) */
  code: Position
  /** Short code shown to the user (several roles can share one, e.g. ZDM) */
  label: string
  name: string
  /** Basic position used by the formations (e.g. a "6er" plays as ZDM) */
  base: Position
}

const pos = (code: Position, name: string, label: string = code, base: Position = code): PositionInfo => ({
  code,
  label,
  name,
  base,
})

export const POSITIONS: PositionInfo[] = [
  pos('TW', 'Torwart'),
  pos('ET', 'Ersatztorwart', 'ET', 'TW'),
  pos('TSP', 'Torwart als Torspieler', 'TSP', 'TW'),
  pos('IV', 'Innenverteidiger'),
  pos('RIV', 'Rechter Innenverteidiger', 'RIV', 'IV'),
  pos('LIV', 'Linker Innenverteidiger', 'LIV', 'IV'),
  pos('ZIV', 'Zentraler Innenverteidiger', 'ZIV', 'IV'),
  pos('LV', 'Linker Verteidiger'),
  pos('LOV', 'Linker Offensivverteidiger', 'LOV', 'LV'),
  pos('RV', 'Rechter Verteidiger'),
  pos('ROV', 'Rechter Offensivverteidiger', 'ROV', 'RV'),
  pos('ZDM', 'Defensives Mittelfeld'),
  pos('ZDM6', '6er', 'ZDM', 'ZDM'),
  pos('ZDM6A', '6er abkippend', 'ZDM', 'ZDM'),
  pos('ZDM6S', '6er defensiver Schwimmer', 'ZDM', 'ZDM'),
  pos('ZM', 'Zentrales Mittelfeld'),
  pos('ZOM8', '8er', 'ZOM', 'ZM'),
  pos('LM', 'Linkes Mittelfeld'),
  pos('RM', 'Rechtes Mittelfeld'),
  pos('ZOM', 'Offensives Mittelfeld'),
  pos('ZOM10', '10er', 'ZOM', 'ZOM'),
  pos('ZOM10S', '10er offensiver Schwimmer', 'ZOM', 'ZOM'),
  pos('LA', 'Linksaußen'),
  pos('RA', 'Rechtsaußen'),
  pos('ST', 'Stürmer'),
  pos('MS9', '9er', 'MS', 'ST'),
  pos('MSF9', 'falscher 9er', 'MS', 'ST'),
]

/** Basic position of a role (the formations know only these). */
export function basePosition(position: Position | null): Position | null {
  if (position === null) return null
  return POSITIONS.find((p) => p.code === position)?.base ?? position
}

/** Goalkeeper, substitute keeper or keeper playing as an extra field player. */
export function isKeeper(position: Position | null): boolean {
  return basePosition(position) === 'TW'
}

/** Text for menus: "ZDM · 6er". */
export function positionText(info: PositionInfo): string {
  return `${info.label} · ${info.name}`
}

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

/** How imported players are added: replace the squad or append to it. */
export type ImportMode = 'replace' | 'append'

/**
 * Adds players from an import. Without starting-eleven information the first players
 * fill the starting eleven up to 11, as with "+ Spieler".
 */
export function importPlayers(
  team: Team,
  imported: { number: string; name: string; position: Position | null; starter: boolean | null }[],
  mode: ImportMode,
): Team {
  const players = mode === 'replace' ? [] : [...team.players]
  let starters = players.filter((p) => p.starter).length
  for (const p of imported) {
    const starter = p.starter ?? starters < 11
    if (starter) starters++
    players.push({ id: createId('player'), name: p.name, number: p.number, position: p.position, starter })
  }
  return { ...team, players }
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

/** How a player's name appears on the pitch. */
export type NameStyle = 'full' | 'initials' | 'none'

export const NAME_STYLES: { value: NameStyle; label: string }[] = [
  { value: 'full', label: 'Name auf dem Feld: ganz' },
  { value: 'initials', label: 'Name auf dem Feld: Anfangsbuchstaben' },
  { value: 'none', label: 'Name auf dem Feld: keiner' },
]

/** First letters of first name and surname(s): "Max Müller" -> "MM". */
export function nameInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase('de'))
    .join('')
}

/** Name tag text for a player in the given style. */
export function nameForStyle(name: string, style: NameStyle): string {
  if (style === 'none') return ''
  return style === 'initials' ? nameInitials(name) : name
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
