import { getAll, getOne, putAll, removeOne } from '../storage/db'
import type { LibraryEntry } from './library'
import { sortEntries } from './library'

export { resetDbConnection } from '../storage/db'

/** All library entries, newest first. */
export async function listEntries(): Promise<LibraryEntry[]> {
  return sortEntries(await getAll<LibraryEntry>('drills'))
}

export function getEntry(id: string): Promise<LibraryEntry | undefined> {
  return getOne<LibraryEntry>('drills', id)
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
