import { DrillFileError, drillFromData } from '../model/serialize'
import type { Category, Drill } from '../model/types'
import { sessionFromData, type TrainingSession } from '../sessions/session'

export const BACKUP_FORMAT = 'trainingsplaner-library'
// Version 2: drills use the line format of file version 2. Version 3: zones.
export const BACKUP_VERSION = 3

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

/** Filters by search text (title and description, case-insensitive) and category. */
export function filterEntries(
  entries: LibraryEntry[],
  query: string,
  category: Category | null,
): LibraryEntry[] {
  const needle = query.trim().toLocaleLowerCase('de')
  return entries.filter((entry) => {
    if (category && entry.drill.category !== category) return false
    if (!needle) return true
    const haystack = `${entry.drill.title} ${entry.drill.description}`.toLocaleLowerCase('de')
    return haystack.includes(needle)
  })
}

export interface Backup {
  entries: LibraryEntry[]
  sessions: TrainingSession[]
}

/** Backup of drills and training sessions as one file. */
export function serializeBackup({ entries, sessions }: Backup): string {
  return JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION, entries, sessions }, null, 2)
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
  if (!Array.isArray(data.entries) || !(data.sessions === undefined || Array.isArray(data.sessions))) {
    throw new DrillFileError('Die Sicherung ist beschädigt oder unvollständig.')
  }
  const sessions = ((data.sessions as unknown[] | undefined) ?? []).map((value) => {
    const session = sessionFromData(value)
    if (!session) throw new DrillFileError('Die Sicherung ist beschädigt oder unvollständig.')
    return session
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
  return { entries, sessions }
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
