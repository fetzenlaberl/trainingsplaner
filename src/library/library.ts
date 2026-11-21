import { DrillFileError, drillFromData } from '../model/serialize'
import { inPlayerRange, type AgeGroup, type PlayerRange } from '../model/drillInfo'
import type { Category, Drill, DrillArea } from '../model/types'
import { sessionFromData, type TrainingSession } from '../sessions/session'
import { dayIntensityFromData, type DayIntensity } from '../sessions/week'
import { teamFromData, type Team } from '../teams/team'
import { matchFromData, type Match } from '../teams/match'

export const BACKUP_FORMAT = 'trainingsplaner-library'
// Backup versions follow the drill file versions (2: waypoints, 3: zones, 4: text boxes etc.).
// Version 8: also contains teams (squads). Version 10: day intensities of the week planner.
// Version 14: match reports.
export const BACKUP_VERSION = 14

export const CATEGORY_LABELS: Record<Category, string> = {
  warmup: 'Aufwärmen',
  technique: 'Technik',
  passing: 'Passspiel',
  shooting: 'Torschuss',
  tactics: 'Taktik',
  game: 'Spielform',
  cooldown: 'Abschluss',
}

export interface LibraryEntry {
  id: string
  drill: Drill
  /** Small JPEG data URL of the first scene, or null if it could not be created */
  thumbnail: string | null
  createdAt: number
  updatedAt: number
}

let idCounter = 0

export function createLibraryId(): string {
  idCounter += 1
  return `drill-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${idCounter}`
}

export function createEntry(drill: Drill, thumbnail: string | null, now: number): LibraryEntry {
  return { id: createLibraryId(), drill, thumbnail, createdAt: now, updatedAt: now }
}

export function updateEntry(
  entry: LibraryEntry,
  drill: Drill,
  thumbnail: string | null,
  now: number,
): LibraryEntry {
  return { ...entry, drill, thumbnail, updatedAt: now }
}

export function duplicateEntry(entry: LibraryEntry, now: number): LibraryEntry {
  return {
    ...entry,
    id: createLibraryId(),
    drill: { ...entry.drill, title: `${entry.drill.title} (Kopie)` },
    createdAt: now,
    updatedAt: now,
  }
}

/** Newest first. */
export function sortEntries(entries: LibraryEntry[]): LibraryEntry[] {
  return [...entries].sort((a, b) => b.updatedAt - a.updatedAt)
}

export const AREA_LABELS: Record<DrillArea, string> = {
  drill: 'Trainingsform',
  tactic: 'Taktik/Aufstellung',
}

export interface LibraryFilter {
  area?: DrillArea | null
  ageGroup?: AgeGroup | null
  players?: PlayerRange | null
}

/** Filters by search text (title and description, case-insensitive), category, age group and players. */
export function filterEntries(
  entries: LibraryEntry[],
  query: string,
  category: Category | null,
  filter: LibraryFilter = {},
): LibraryEntry[] {
  const needle = query.trim().toLocaleLowerCase('de')
  return entries.filter((entry) => {
    if (category && entry.drill.category !== category) return false
    if (filter.area && entry.drill.area !== filter.area) return false
    if (filter.ageGroup && entry.drill.info.ageGroup !== filter.ageGroup) return false
    if (filter.players && !inPlayerRange(entry.drill.info.players, filter.players)) return false
    if (!needle) return true
    const haystack = `${entry.drill.title} ${entry.drill.description}`.toLocaleLowerCase('de')
    return haystack.includes(needle)
  })
}

export interface Backup {
  entries: LibraryEntry[]
  sessions: TrainingSession[]
  teams: Team[]
  days: DayIntensity[]
  /** Match reports (missing in older backups) */
  matches?: Match[]
}

/** Backup of drills and training sessions as one file. */
export function serializeBackup({ entries, sessions, teams, days, matches = [] }: Backup): string {
  return JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, entries, sessions, teams, days, matches }, null, 2)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Parses a backup. Throws DrillFileError with a German message. */
export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new DrillFileError('Die Datei ist keine gültige JSON-Datei.')
  }
  if (!isRecord(data) || data.format !== BACKUP_FORMAT) {
    throw new DrillFileError('Die Datei ist keine Sicherung der Übungsbibliothek.')
  }
  if (typeof data.version !== 'number' || data.version > BACKUP_VERSION) {
    throw new DrillFileError('Die Sicherung stammt aus einer neueren Version des Trainingsplaners.')
  }
  // Sessions were added later; older backups only contain drills.
  if (
    !Array.isArray(data.entries) ||
    !(data.sessions === undefined || Array.isArray(data.sessions)) ||
    // Teams were added in backup version 8.
    !(data.teams === undefined || Array.isArray(data.teams)) ||
    !(data.days === undefined || Array.isArray(data.days)) ||
    !(data.matches === undefined || Array.isArray(data.matches))
  ) {
    throw new DrillFileError('Die Sicherung ist beschädigt oder unvollständig.')
  }
  const sessions = ((data.sessions as unknown[] | undefined) ?? []).map((value) => {
    const session = sessionFromData(value)
    if (!session) throw new DrillFileError('Die Sicherung ist beschädigt oder unvollständig.')
    return session
  })
  const teams = ((data.teams as unknown[] | undefined) ?? []).map((value) => {
    const team = teamFromData(value)
    if (!team) throw new DrillFileError('Die Sicherung ist beschädigt oder unvollständig.')
    return team
  })
  const days = ((data.days as unknown[] | undefined) ?? []).map((value) => {
    const day = dayIntensityFromData(value)
    if (!day) throw new DrillFileError('Die Sicherung ist beschädigt oder unvollständig.')
    return day
  })
  const matches = ((data.matches as unknown[] | undefined) ?? []).map((value) => {
    const match = matchFromData(value)
    if (!match) throw new DrillFileError('Die Sicherung ist beschädigt oder unvollständig.')
    return match
  })
  const entries = data.entries.map((value): LibraryEntry => {
    if (
      !isRecord(value) ||
      typeof value.id !== 'string' ||
      typeof value.createdAt !== 'number' ||
      typeof value.updatedAt !== 'number' ||
      !(value.thumbnail === null || (typeof value.thumbnail === 'string' && value.thumbnail.startsWith('data:image/')))
    ) {
      throw new DrillFileError('Die Sicherung ist beschädigt oder unvollständig.')
    }
    return {
      id: value.id,
      drill: drillFromData(value.drill),
      thumbnail: value.thumbnail,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    }
  })
  return { entries, sessions, teams, days, matches }
}

/**
 * Decides which imported records to write: new ones, and existing ones only if the
 * imported version is newer. Returns the records to store and how many were skipped.
 */
export function planImport<T extends { id: string; updatedAt: number }>(
  existing: T[],
  imported: T[],
): { toStore: T[]; skipped: number } {
  const byId = new Map(existing.map((e) => [e.id, e]))
  const toStore = imported.filter((entry) => {
    const current = byId.get(entry.id)
    return !current || entry.updatedAt > current.updatedAt
  })
  return { toStore, skipped: imported.length - toStore.length }
}
