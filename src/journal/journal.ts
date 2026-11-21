// Journal: free notes with thoughts and ideas (title, text, tags), stored locally.

import type { PdfTextItem } from '../teams/matchReport'

export interface JournalEntry {
  id: string
  title: string
  text: string
  /** Chosen tags (see JOURNAL_TAGS) */
  tags: string[]
  createdAt: number
  updatedAt: number
  /** Time it was moved to the trash, or null */
  deletedAt: number | null
}

export const JOURNAL_TAGS = ['Idee', 'Training', 'Taktik', 'Spieler', 'Spiel', 'Sonstiges'] as const

export const MAX_JOURNAL_TITLE = 200
export const MAX_JOURNAL_TEXT = 100_000
const MAX_TAGS = 10
const MAX_TAG_LENGTH = 30
/** Entries kept in the trash; older ones are removed for good. */
export const MAX_JOURNAL_TRASH = 50

let idCounter = 0
function createJournalId(): string {
  idCounter += 1
  return `journal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${idCounter}`
}

export function createJournalEntry(now: number, values: Partial<Pick<JournalEntry, 'title' | 'text' | 'tags'>> = {}): JournalEntry {
  return {
    id: createJournalId(),
    title: (values.title ?? '').slice(0, MAX_JOURNAL_TITLE),
    text: (values.text ?? '').slice(0, MAX_JOURNAL_TEXT),
    tags: values.tags ?? [],
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

/** Changes title, text or tags and marks the entry as changed. */
export function editJournalEntry(
  entry: JournalEntry,
  change: Partial<Pick<JournalEntry, 'title' | 'text' | 'tags'>>,
  now: number,
): JournalEntry {
  return {
    ...entry,
    ...(change.title !== undefined ? { title: change.title.slice(0, MAX_JOURNAL_TITLE) } : {}),
    ...(change.text !== undefined ? { text: change.text.slice(0, MAX_JOURNAL_TEXT) } : {}),
    ...(change.tags !== undefined ? { tags: change.tags } : {}),
    updatedAt: now,
  }
}

export function toggleTag(tags: string[], tag: string): string[] {
  return tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]
}

/** Title to show: the own title, else the first line of the text. */
export function entryTitle(entry: Pick<JournalEntry, 'title' | 'text'>): string {
  const title = entry.title.trim()
  if (title) return title
  const firstLine = entry.text.trim().split('\n')[0]?.trim() ?? ''
  if (!firstLine) return 'Ohne Titel'
  return firstLine.length > 60 ? `${firstLine.slice(0, 60)} …` : firstLine
}

/** Short preview of the text for the list. */
export function entryPreview(entry: Pick<JournalEntry, 'title' | 'text'>): string {
  const text = entry.text.replace(/\s+/g, ' ').trim()
  const skip = entry.title.trim() ? 0 : (entry.text.trim().split('\n')[0]?.trim().length ?? 0)
  const rest = text.slice(skip).trim()
  return rest.length > 90 ? `${rest.slice(0, 90)} …` : rest
}

/** Newest change first. */
export function sortJournal(entries: JournalEntry[]): JournalEntry[] {
  return [...entries].sort((a, b) => b.updatedAt - a.updatedAt)
}

/** Entries (not in the trash) matching the search text and the tag. */
export function filterJournal(entries: JournalEntry[], query: string, tag: string | null): JournalEntry[] {
  const needle = query.trim().toLowerCase()
  return entries.filter(
    (e) =>
      e.deletedAt === null &&
      (tag === null || e.tags.includes(tag)) &&
      (needle === '' || `${e.title}\n${e.text}\n${e.tags.join(' ')}`.toLowerCase().includes(needle)),
  )
}

/** Trash entries, newest deleted first; `purge` = those over the limit (to remove for good). */
export function journalTrash(entries: JournalEntry[]): { trash: JournalEntry[]; purge: JournalEntry[] } {
  const all = entries.filter((e) => e.deletedAt !== null).sort((a, b) => b.deletedAt! - a.deletedAt!)
  return { trash: all.slice(0, MAX_JOURNAL_TRASH), purge: all.slice(MAX_JOURNAL_TRASH) }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Validates a stored or imported entry; null if it is broken. */
export function journalEntryFromData(value: unknown): JournalEntry | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.text !== 'string' ||
    !Array.isArray(value.tags) ||
    value.tags.length > MAX_TAGS ||
    !value.tags.every((t) => typeof t === 'string' && t.length <= MAX_TAG_LENGTH) ||
    typeof value.createdAt !== 'number' ||
    typeof value.updatedAt !== 'number' ||
    !(value.deletedAt === null || value.deletedAt === undefined || typeof value.deletedAt === 'number')
  ) {
    return null
  }
  return {
    id: value.id,
    title: value.title.slice(0, MAX_JOURNAL_TITLE),
    text: value.text.slice(0, MAX_JOURNAL_TEXT),
    tags: value.tags as string[],
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    deletedAt: typeof value.deletedAt === 'number' ? value.deletedAt : null,
  }
}

/** File name without its extension, as title of an imported entry. */
export function titleFromFileName(name: string): string {
  return name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim()
}

/** Imported file text: unified line breaks, no blank lines at the ends. */
export function cleanImportedText(text: string): string {
  return text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').trim()
}

/** Text of a PDF in reading order: pieces on the same height form a line, top to bottom. */
export function pdfPagesToText(pages: PdfTextItem[][]): string {
  return pages
    .map((items) => {
      const sorted = items.filter((i) => i.str.trim() !== '').sort((a, b) => b.y - a.y || a.x - b.x)
      const lines: { y: number; parts: PdfTextItem[] }[] = []
      for (const item of sorted) {
        const line = lines.find((l) => Math.abs(l.y - item.y) <= Math.max(2, item.height / 2))
        if (line) line.parts.push(item)
        else lines.push({ y: item.y, parts: [item] })
      }
      return lines
        .map((l) =>
          l.parts
            .sort((a, b) => a.x - b.x)
            .map((p) => p.str)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim(),
        )
        .join('\n')
    })
    .join('\n\n')
    .trim()
}

export function dateTimeText(time: number): string {
  return new Date(time).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
}

/** One entry as plain text (for the text export). */
export function entryToText(entry: JournalEntry): string {
  const head = [entryTitle(entry), `Erstellt: ${dateTimeText(entry.createdAt)} · Geändert: ${dateTimeText(entry.updatedAt)}`]
  if (entry.tags.length > 0) head.push(`Schlagwörter: ${entry.tags.join(', ')}`)
  return `${head.join('\n')}\n\n${entry.text.trim()}\n`
}

export function entriesToText(entries: JournalEntry[]): string {
  return entries.map(entryToText).join('\n----------------------------------------\n\n')
}
