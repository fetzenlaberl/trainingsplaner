import { drillFromData } from '../model/serialize'
import { getAll, getOne, putAll, removeOne } from '../storage/db'
import type { LibraryEntry } from './library'
import { sortEntries } from './library'

export { resetDbConnection } from '../storage/db'

/**
 * Brings a stored entry up to the current data format (e.g. old single-bend lines).
 * Returns null if the stored drill is broken.
 */
function normalizeEntry(entry: LibraryEntry): LibraryEntry | null {
  try {
    return { ...entry, drill: drillFromData(entry.drill) }
  } catch (err) {
    console.error('Skipping broken library entry', entry.id, err)
    return null
  }
}

/** All library entries, newest first. */
export async function listEntries(): Promise<LibraryEntry[]> {
  const entries = await getAll<LibraryEntry>('drills')
  return sortEntries(entries.map(normalizeEntry).filter((e): e is LibraryEntry => e !== null))
}

export async function getEntry(id: string): Promise<LibraryEntry | undefined> {
  const entry = await getOne<LibraryEntry>('drills', id)
  return (entry && normalizeEntry(entry)) ?? undefined
}

export function putEntries(entries: LibraryEntry[]): Promise<void> {
  return putAll('drills', entries)
}

export function putEntry(entry: LibraryEntry): Promise<void> {
  return putEntries([entry])
}

export function deleteEntry(id: string): Promise<void> {
  return removeOne('drills', id)
}
