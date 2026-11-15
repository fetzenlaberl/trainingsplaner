import { describe, expect, it } from 'vitest'
import { DrillFileError, emptyDrill } from '../model/serialize'
import type { Category, Drill } from '../model/types'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  createEntry,
  duplicateEntry,
  filterEntries,
  parseBackup,
  planImport,
  serializeBackup,
  sortEntries,
  updateEntry,
  type LibraryEntry,
} from './library'
import { createSession, freeBlock } from '../sessions/session'

function drill(title: string, category: Category | null = null, description = ''): Drill {
  return { ...emptyDrill(), title, category, description }
}

function entry(id: string, d: Drill, updatedAt: number): LibraryEntry {
  return { id, drill: d, thumbnail: null, createdAt: 1, updatedAt }
}

describe('entries', () => {
  it('creates an entry with id and timestamps', () => {
    const e = createEntry(drill('Rondo'), 'data:image/jpeg;base64,xx', 1000)
    expect(e.id).toMatch(/^drill-/)
    expect([e.createdAt, e.updatedAt]).toEqual([1000, 1000])
  })

  it('updates the drill but keeps id and creation time', () => {
    const e = createEntry(drill('Rondo'), null, 1000)
    const updated = updateEntry(e, drill('Rondo 2'), null, 2000)
    expect(updated.id).toBe(e.id)
    expect(updated.createdAt).toBe(1000)
    expect(updated.updatedAt).toBe(2000)
    expect(updated.drill.title).toBe('Rondo 2')
  })

  it('duplicates with a new id and "(Kopie)" in the title', () => {
    const e = createEntry(drill('Rondo'), null, 1000)
    const copy = duplicateEntry(e, 3000)
    expect(copy.id).not.toBe(e.id)
    expect(copy.drill.title).toBe('Rondo (Kopie)')
    expect(copy.createdAt).toBe(3000)
  })

  it('sorts newest first', () => {
    const sorted = sortEntries([entry('a', drill('A'), 1), entry('b', drill('B'), 3), entry('c', drill('C'), 2)])
    expect(sorted.map((e) => e.id)).toEqual(['b', 'c', 'a'])
  })
})

describe('filterEntries', () => {
  const entries = [
    entry('1', drill('Rondo 4 gegen 2', 'warmup'), 1),
    entry('2', drill('Torschuss nach Flanke', 'shooting', 'Abschluss mit Kopfball'), 2),
    entry('3', drill('Überzahlspiel', 'tactics'), 3),
  ]

  it('returns everything without filters', () => {
    expect(filterEntries(entries, '', null)).toHaveLength(3)
  })

  it('searches title and description, ignoring case', () => {
    expect(filterEntries(entries, 'rondo', null).map((e) => e.id)).toEqual(['1'])
    expect(filterEntries(entries, 'KOPFBALL', null).map((e) => e.id)).toEqual(['2'])
  })

  it('handles umlauts', () => {
    expect(filterEntries(entries, 'überzahl', null).map((e) => e.id)).toEqual(['3'])
  })

  it('filters by category and combines with search', () => {
    expect(filterEntries(entries, '', 'shooting').map((e) => e.id)).toEqual(['2'])
    expect(filterEntries(entries, 'rondo', 'shooting')).toEqual([])
  })
})

describe('backup', () => {
  const entries = [
    { ...entry('a', drill('Rondo', 'warmup', 'Zwei Kontakte'), 5), thumbnail: 'data:image/jpeg;base64,abc' },
    entry('b', drill('Abschlussspiel', 'cooldown'), 6),
  ]

  it('round-trips the library', () => {
    expect(parseBackup(serializeBackup({ entries, sessions: [] }))).toEqual({ entries, sessions: [] })
  })

  it('round-trips training sessions', () => {
    const session = { ...createSession(7, '2026-11-20'), blocks: [freeBlock('Trinkpause', 5)] }
    expect(parseBackup(serializeBackup({ entries, sessions: [session] })).sessions).toEqual([session])
  })

  it('reads older backups without sessions', () => {
    const data = JSON.parse(serializeBackup({ entries, sessions: [] }))
    delete data.sessions
    expect(parseBackup(JSON.stringify(data)).sessions).toEqual([])
  })

  it('rejects broken sessions', () => {
    const session = createSession(7)
    const data = JSON.parse(serializeBackup({ entries, sessions: [session] }))
    data.sessions[0].blocks = [{ id: 'x', title: 'ohne Dauer' }]
    expect(() => parseBackup(JSON.stringify(data))).toThrow(/beschädigt/)
  })

  it('writes format and version', () => {
    const data = JSON.parse(serializeBackup({ entries, sessions: [] }))
    expect([data.format, data.version]).toEqual([BACKUP_FORMAT, BACKUP_VERSION])
  })

  it('rejects other files', () => {
    expect(() => parseBackup('kein json')).toThrow(DrillFileError)
    expect(() => parseBackup('{"format":"trainingsplaner-drill"}')).toThrow(/keine Sicherung/)
  })

  it('rejects broken entries and broken drills inside', () => {
    const data = JSON.parse(serializeBackup({ entries, sessions: [] }))
    data.entries[0].drill.fieldType = 'beach'
    expect(() => parseBackup(JSON.stringify(data))).toThrow(/beschädigt/)
    const data2 = JSON.parse(serializeBackup({ entries, sessions: [] }))
    data2.entries[1].thumbnail = 'javascript:alert(1)'
    expect(() => parseBackup(JSON.stringify(data2))).toThrow(/beschädigt/)
  })

  it('rejects backups from newer versions', () => {
    const data = JSON.parse(serializeBackup({ entries, sessions: [] }))
    data.version = BACKUP_VERSION + 1
    expect(() => parseBackup(JSON.stringify(data))).toThrow(/neueren Version/)
  })
})

describe('planImport', () => {
  it('adds new entries, replaces older ones and skips newer local ones', () => {
    const existing = [entry('old', drill('Alt'), 10), entry('newer', drill('Lokal neuer'), 50)]
    const imported = [
      entry('old', drill('Alt, aktualisiert'), 20),
      entry('newer', drill('Import älter'), 30),
      entry('fresh', drill('Neu'), 5),
    ]
    const { toStore, skipped } = planImport(existing, imported)
    expect(toStore.map((e) => e.id)).toEqual(['old', 'fresh'])
    expect(skipped).toBe(1)
  })
})
