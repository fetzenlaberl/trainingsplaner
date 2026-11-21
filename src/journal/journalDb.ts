import { getAll, putAll, removeOne } from '../storage/db'
import { journalEntryFromData, sortJournal, type JournalEntry } from './journal'

/** All journal entries incl. trash (broken records are skipped), newest change first. */
export async function listJournal(): Promise<JournalEntry[]> {
  const all = await getAll<unknown>('journal')
  return sortJournal(all.map(journalEntryFromData).filter((e): e is JournalEntry => e !== null))
}

export function putJournalEntries(entries: JournalEntry[]): Promise<void> {
  return putAll('journal', entries)
}

export function putJournalEntry(entry: JournalEntry): Promise<void> {
  return putJournalEntries([entry])
}

export function deleteJournalEntry(id: string): Promise<void> {
  return removeOne('journal', id)
}
