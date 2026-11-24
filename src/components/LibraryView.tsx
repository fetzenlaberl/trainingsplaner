import { PhoneFold } from './PhoneFold'
import { listMatches, putMatches } from '../teams/matchDb'
import { listJournal, putJournalEntries } from '../journal/journalDb'
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { downloadBlob } from '../export/download'
import { FIELD_TYPE_LABELS } from '../field/dimensions'
import {
  AREA_LABELS,
  CATEGORY_LABELS,
  duplicateEntry,
  filterEntries,
  parseBackup,
  planImport,
  serializeBackup,
  type LibraryEntry,
} from '../library/library'
import { isEditorDirty, openEntryInEditor, unlinkEditor } from '../library/libraryActions'
import { deleteEntry, listEntries, putEntries, putEntry } from '../library/libraryDb'
import { useLibraryLink } from '../library/libraryStore'
import { AGE_GROUPS, drillInfoLine, PLAYER_RANGES, type AgeGroup, type PlayerRange } from '../model/drillInfo'
import { CATEGORIES, DrillFileError } from '../model/serialize'
import { listSessions, putSessions } from '../sessions/sessionDb'
import { listTeams, putTeams } from '../teams/teamDb'
import { listDayIntensities, putDayIntensities } from '../sessions/dayDb'
import { backupReminderText, loadLastBackup, saveLastBackup } from '../settings/backupReminder'
import type { Category, DrillArea } from '../model/types'
import { useViewStore } from '../store/viewStore'
import { buttonClass, dangerButtonClass, inputClass } from './ui'

const LOAD_ERROR =
  'Die Bibliothek konnte nicht geladen werden. Möglicherweise erlaubt dieser Browser (z. B. im privaten Modus) keine dauerhafte Speicherung.'

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10)
}

/** Overview of all saved drills with search, categories and backup. */
export function LibraryView() {
  const [entries, setEntries] = useState<LibraryEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<Category | null>(null)
  const [area, setArea] = useState<DrillArea | null>(null)
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null)
  const [players, setPlayers] = useState<PlayerRange | null>(null)
  const linkedId = useLibraryLink((s) => s.libraryId)
  const setView = useViewStore((s) => s.setView)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [lastBackup, setLastBackup] = useState(loadLastBackup)
  const [now] = useState(() => Date.now())
  const reminder = backupReminderText(lastBackup, now)

  const reload = useCallback(async () => {
    try {
      setEntries(await listEntries())
      setError(null)
    } catch (err) {
      console.error(err)
      setError(LOAD_ERROR)
    }
  }, [])

  // Initial load; ignored if the view is closed before the data arrives.
  useEffect(() => {
    let cancelled = false
    listEntries().then(
      (loaded) => {
        if (!cancelled) setEntries(loaded)
      },
      (err) => {
        console.error(err)
        if (!cancelled) setError(LOAD_ERROR)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  async function run(action: () => Promise<unknown>) {
    try {
      await action()
    } catch (err) {
      console.error(err)
      window.alert('Die Aktion ist fehlgeschlagen. Bitte versuche es noch einmal.')
    }
    await reload()
  }

  function handleOpen(entry: LibraryEntry) {
    if (entry.id !== linkedId && isEditorDirty()) {
      const ok = window.confirm(
        'Die Übung im Editor hat Änderungen, die nicht in der Bibliothek gespeichert sind. Trotzdem öffnen?',
      )
      if (!ok) return
    }
    openEntryInEditor(entry)
    setView('editor')
  }

  function handleDelete(entry: LibraryEntry) {
    if (!window.confirm(`„${entry.drill.title}“ wirklich aus der Bibliothek löschen?`)) return
    void run(async () => {
      await deleteEntry(entry.id)
      // The drill stays open in the editor, but is no longer in the library.
      if (entry.id === useLibraryLink.getState().libraryId) unlinkEditor(null)
    })
  }

  /** Backup of all drills and training sessions. */
  async function handleExportBackup() {
    try {
      const backup = {
        entries: await listEntries(),
        sessions: await listSessions(),
        teams: await listTeams(),
        days: await listDayIntensities(),
        matches: await listMatches(),
        journal: await listJournal(),
      }
      const blob = new Blob([serializeBackup(backup)], { type: 'application/json' })
      downloadBlob(blob, `trainingsplaner-sicherung-${todayStamp()}.json`)
      const stamp = Date.now()
      saveLastBackup(stamp)
      setLastBackup(stamp)
    } catch (err) {
      console.error(err)
      window.alert('Die Sicherung konnte nicht erstellt werden.')
    }
  }

  async function handleImportBackup(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const backup = parseBackup(await file.text())
      const drills = planImport(await listEntries(), backup.entries)
      const sessions = planImport(await listSessions(), backup.sessions)
      const teams = planImport(await listTeams(), backup.teams)
      const matches = planImport(await listMatches(), backup.matches ?? [])
      const journal = planImport(await listJournal(), backup.journal ?? [])
      await putEntries(drills.toStore)
      await putSessions(sessions.toStore)
      await putTeams(teams.toStore)
      await putMatches(matches.toStore)
      await putJournalEntries(journal.toStore)
      // Day intensities simply take the value from the backup.
      await putDayIntensities(backup.days)
      const skipped = drills.skipped + sessions.skipped + teams.skipped + matches.skipped + journal.skipped
      window.alert(
        `${drills.toStore.length} Übung(en), ${sessions.toStore.length} Einheit(en), ${teams.toStore.length} Mannschaft(en), ${matches.toStore.length} Spielbericht(e) und ${journal.toStore.length} Journal-Eintrag/-Einträge importiert.` +
          (skipped > 0 ? ` ${skipped} übersprungen, weil schon eine neuere Fassung vorhanden ist.` : ''),
      )
    } catch (err) {
      console.error(err)
      window.alert(
        `Import fehlgeschlagen: ${err instanceof DrillFileError ? err.message : 'Die Datei konnte nicht gelesen werden.'}`,
      )
    }
    await reload()
  }

  const visible = entries ? filterEntries(entries, query, category, { area, ageGroup, players }) : []

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        role="tablist"
        aria-label="Bereich"
        className="flex gap-1 overflow-x-auto border-b border-slate-700 bg-slate-900 px-4 pt-2"
      >
        {(
          [
            [null, 'Alle'],
            ['drill', 'Trainingsformen'],
            ['tactic', 'Taktik & Aufstellungen'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={area === key}
            onClick={() => setArea(key)}
            className={`shrink-0 rounded-t-md px-4 py-2 text-sm font-semibold whitespace-nowrap ${
              area === key ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-700 bg-slate-900 px-4 py-2">
        <input
          type="search"
          className={`${inputClass} w-56 max-w-full`}
          placeholder="Suchen …"
          aria-label="Übungen durchsuchen"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <PhoneFold label="Filter" activeCount={(category ? 1 : 0) + (ageGroup ? 1 : 0) + (players ? 1 : 0)}>
        <div role="group" aria-label="Kategorie" className="flex flex-wrap gap-1">
          {[null, ...CATEGORIES].map((c) => (
            <button
              key={c ?? 'all'}
              type="button"
              aria-pressed={c === category}
              onClick={() => setCategory(c)}
              className={`min-h-9 rounded-full px-3 text-sm ${
                c === category ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {c ? CATEGORY_LABELS[c] : 'Alle'}
            </button>
          ))}
        </div>
        <select
          className={inputClass}
          aria-label="Altersklasse"
          value={ageGroup ?? ''}
          onChange={(e) => setAgeGroup(e.target.value === '' ? null : (e.target.value as AgeGroup))}
        >
          <option value="">Alle Altersklassen</option>
          {AGE_GROUPS.map((a) => (
            <option key={a.key} value={a.key}>
              {a.name}
            </option>
          ))}
        </select>
        <select
          className={inputClass}
          aria-label="Spieleranzahl"
          value={players ?? ''}
          onChange={(e) => setPlayers(e.target.value === '' ? null : (e.target.value as PlayerRange))}
        >
          <option value="">Alle Spielerzahlen</option>
          {PLAYER_RANGES.map((r) => (
            <option key={r.key} value={r.key}>
              {r.name}
            </option>
          ))}
        </select>
        </PhoneFold>
        <PhoneFold label="Sicherung">
        <div className="ml-auto flex flex-wrap gap-1.5">
          <button type="button" className={buttonClass} onClick={() => void handleExportBackup()}>
            Sicherung exportieren
          </button>
          <button type="button" className={buttonClass} onClick={() => importInputRef.current?.click()}>
            Sicherung importieren
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={handleImportBackup}
          />
        </div>
        </PhoneFold>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {reminder && entries && entries.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-500/60 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            <span>
              {reminder} Die Daten liegen nur in diesem Browser – sichere sie regelmäßig als Datei.
            </span>
            <button type="button" className={buttonClass} onClick={() => void handleExportBackup()}>
              Jetzt sichern
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-300">{error}</p>}
        {!error && entries === null && <p className="text-sm text-slate-400">Wird geladen …</p>}
        {!error && entries?.length === 0 && (
          <p className="text-sm text-slate-400">
            Die Bibliothek ist noch leer. Bau im Editor eine Übung und klicke auf „In Bibliothek speichern“.
          </p>
        )}
        {!error && entries && entries.length > 0 && visible.length === 0 && (
          <p className="text-sm text-slate-400">Keine Übung passt zur Suche.</p>
        )}
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
          {visible.map((entry) => (
            <li
              key={entry.id}
              className={`flex flex-col overflow-hidden rounded-xl border bg-slate-900 ${
                entry.id === linkedId ? 'border-emerald-500' : 'border-slate-700'
              }`}
            >
              <button
                type="button"
                className="aspect-[3/2] w-full bg-emerald-900"
                title="Im Editor öffnen"
                onClick={() => handleOpen(entry)}
              >
                {entry.thumbnail ? (
                  <img src={entry.thumbnail} alt="" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-sm text-emerald-200">Keine Vorschau</span>
                )}
              </button>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold break-words text-white">{entry.drill.title}</h3>
                  {entry.drill.category && (
                    <span className="shrink-0 rounded-full bg-slate-700 px-2 py-0.5 text-xs text-slate-200">
                      {CATEGORY_LABELS[entry.drill.category]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  {FIELD_TYPE_LABELS[entry.drill.fieldType]} · {entry.drill.scenes.length}{' '}
                  {entry.drill.scenes.length === 1 ? 'Szene' : 'Szenen'} · geändert {formatDate(entry.updatedAt)}
                </p>
                {entry.drill.area === 'tactic' && (
                  <span className="w-fit rounded-full bg-violet-700/70 px-2 py-0.5 text-xs text-violet-100">
                    {AREA_LABELS.tactic}
                  </span>
                )}
                {drillInfoLine(entry.drill.info) && (
                  <p className="text-xs text-slate-300">{drillInfoLine(entry.drill.info)}</p>
                )}
                {entry.id === linkedId && <p className="text-xs text-emerald-300">Gerade im Editor geöffnet</p>}
                {entry.drill.description && (
                  <p className="line-clamp-2 text-sm text-slate-300">{entry.drill.description}</p>
                )}
                <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                  <button type="button" className={buttonClass} onClick={() => handleOpen(entry)}>
                    Öffnen
                  </button>
                  <button
                    type="button"
                    className={buttonClass}
                    onClick={() => void run(() => putEntry(duplicateEntry(entry, Date.now())))}
                  >
                    Duplizieren
                  </button>
                  <button type="button" className={dangerButtonClass} onClick={() => handleDelete(entry)}>
                    Löschen
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
