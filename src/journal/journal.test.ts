import { describe, expect, it } from 'vitest'
import {
  cleanImportedText,
  createJournalEntry,
  editJournalEntry,
  entryTitle,
  filterJournal,
  journalEntryFromData,
  journalTrash,
  MAX_JOURNAL_TRASH,
  pdfPagesToText,
  titleFromFileName,
  toggleTag,
} from './journal'

describe('journal entries', () => {
  it('creates, edits and validates entries', () => {
    const entry = createJournalEntry(1000, { title: 'Pressing', text: 'Idee: höher anlaufen', tags: ['Taktik'] })
    const edited = editJournalEntry(entry, { text: 'Neu' }, 2000)
    expect(edited).toMatchObject({ title: 'Pressing', text: 'Neu', createdAt: 1000, updatedAt: 2000, deletedAt: null })
    expect(journalEntryFromData(JSON.parse(JSON.stringify(edited)))).toEqual(edited)
    expect(journalEntryFromData({ ...edited, tags: 'x' })).toBeNull()
    expect(journalEntryFromData({ id: 'x' })).toBeNull()
  })

  it('takes the first text line as title when there is none', () => {
    expect(entryTitle({ title: '', text: '\nErste Zeile\nzweite' })).toBe('Erste Zeile')
    expect(entryTitle({ title: '', text: '' })).toBe('Ohne Titel')
    expect(entryTitle({ title: ' Eigener ', text: 'x' })).toBe('Eigener')
  })

  it('toggles tags', () => {
    expect(toggleTag(['Idee'], 'Taktik')).toEqual(['Idee', 'Taktik'])
    expect(toggleTag(['Idee', 'Taktik'], 'Idee')).toEqual(['Taktik'])
  })

  it('filters by text and tag and leaves out the trash', () => {
    const a = createJournalEntry(1, { title: 'Umschalten', tags: ['Taktik'] })
    const b = createJournalEntry(2, { text: 'Aufwärmen mit Ball', tags: ['Training'] })
    const c = { ...createJournalEntry(3, { text: 'Ball weg' }), deletedAt: 5 }
    expect(filterJournal([a, b, c], 'ball', null)).toEqual([b])
    expect(filterJournal([a, b, c], '', 'Taktik')).toEqual([a])
    expect(filterJournal([a, b, c], '', null)).toHaveLength(2)
  })

  it('keeps at most the newest deleted entries in the trash', () => {
    const deleted = Array.from({ length: MAX_JOURNAL_TRASH + 3 }, (_, i) => ({ ...createJournalEntry(i), deletedAt: i }))
    const { trash, purge } = journalTrash(deleted)
    expect(trash).toHaveLength(MAX_JOURNAL_TRASH)
    expect(purge.map((e) => e.deletedAt)).toEqual([2, 1, 0])
  })
})

describe('journal import', () => {
  it('uses the file name as title and cleans the text', () => {
    expect(titleFromFileName('ideen_saison.txt')).toBe('ideen saison')
    expect(cleanImportedText('﻿Zeile 1  \r\nZeile 2\r\n\r\n')).toBe('Zeile 1\nZeile 2')
  })

  it('reads PDF text line by line from top to bottom', () => {
    const item = (str: string, x: number, y: number) => ({ str, x, y, width: 10, height: 10 })
    const text = pdfPagesToText([[item('Welt', 60, 700), item('Hallo', 10, 700), item('Zweite Zeile', 10, 680)], [item('Seite 2', 10, 700)]])
    expect(text).toBe('Hallo Welt\nZweite Zeile\n\nSeite 2')
  })
})
