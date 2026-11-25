import { SaveButton } from './SaveButton'
import { PhoneFold } from './PhoneFold'
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { downloadBlob } from '../export/download'
import { ImportError, isPdf, readPdfText } from '../import/fileImport'
import {
  cleanImportedText,
  createJournalEntry,
  dateTimeText,
  editJournalEntry,
  entriesToText,
  entryPreview,
  entryTitle,
  entryToText,
  filterJournal,
  JOURNAL_TAGS,
  journalTrash,
  MAX_JOURNAL_TEXT,
  pdfPagesToText,
  titleFromFileName,
  toggleTag,
  type JournalEntry,
} from '../journal/journal'
import { deleteJournalEntry, listJournal, putJournalEntries, putJournalEntry } from '../journal/journalDb'
import { exportJournalPdf } from '../journal/journalPdf'
import { fileNameFromTitle } from '../model/serialize'
import { buttonClass, dangerButtonClass, inputClass } from './ui'

/** Saving waits this long after the last key press. */
const SAVE_DELAY_MS = 600

const chipClass = (active: boolean) =>
  `min-h-9 rounded-full px-3 text-xs font-medium transition-colors ${
    active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
  }`

/** Journal: thoughts and ideas as free text entries, with tags, search, import and export. */
export function JournalView() {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState<string | null>(null)
  const [showTrash, setShowTrash] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<'saved' | 'dirty' | 'failed'>('saved')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  /** Changed entries not yet written, by id */
  const pending = useRef(new Map<string, JournalEntry>())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const toSave = [...pending.current.values()]
    pending.current.clear()
    if (toSave.length === 0) return
    putJournalEntries(toSave).then(
      () => setSaveState(pending.current.size > 0 ? 'dirty' : 'saved'),
      (err) => {
        console.error(err)
        // Keep them for the next try, unless they were changed again meanwhile.
        for (const e of toSave) if (!pending.current.has(e.id)) pending.current.set(e.id, e)
        setSaveState('failed')
      },
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    listJournal().then(
      async (all) => {
        // Keep the trash small: the oldest deleted entries go for good.
        // Entries left completely empty are removed as well.
        const empty = all.filter((e) => e.deletedAt === null && !e.title.trim() && !e.text.trim() && e.tags.length === 0)
        const purge = [...journalTrash(all).purge, ...empty]
        for (const e of purge) await deleteJournalEntry(e.id)
        if (!cancelled) setEntries(all.filter((e) => !purge.includes(e)))
      },
      (err) => {
        console.error(err)
        if (!cancelled) setEntries([])
      },
    )
    // Write open changes when leaving the view or closing the page.
    window.addEventListener('beforeunload', flush)
    return () => {
      cancelled = true
      window.removeEventListener('beforeunload', flush)
      flush()
    }
  }, [flush])

  const selected = entries?.find((e) => e.id === selectedId) ?? null

  function change(entry: JournalEntry, values: Partial<Pick<JournalEntry, 'title' | 'text' | 'tags'>>) {
    const next = editJournalEntry(entry, values, Date.now())
    setEntries((all) => all?.map((e) => (e.id === next.id ? next : e)) ?? null)
    pending.current.set(next.id, next)
    setStatus(null)
    setSaveState('dirty')
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY_MS)
  }

  async function save(entry: JournalEntry) {
    pending.current.delete(entry.id)
    try {
      await putJournalEntry(entry)
    } catch (err) {
      console.error(err)
      if (!pending.current.has(entry.id)) pending.current.set(entry.id, entry)
      setSaveState('failed')
    }
  }

  /** Save button: writes everything that is waiting, and the open entry in any case. */
  function saveNow(entry: JournalEntry) {
    if (!pending.current.has(entry.id)) pending.current.set(entry.id, entry)
    flush()
  }

  async function handleNew() {
    flush()
    const entry = createJournalEntry(Date.now(), { tags: tag ? [tag] : [] })
    setEntries((all) => [entry, ...(all ?? [])])
    setSelectedId(entry.id)
    setShowTrash(false)
    await save(entry)
  }

  async function moveToTrash(entry: JournalEntry) {
    flush()
    const trashed = { ...entry, deletedAt: Date.now() }
    setEntries((all) => all?.map((e) => (e.id === entry.id ? trashed : e)) ?? null)
    setSelectedId(null)
    await save(trashed)
  }

  async function restore(entry: JournalEntry) {
    const restored = { ...entry, deletedAt: null }
    setEntries((all) => all?.map((e) => (e.id === entry.id ? restored : e)) ?? null)
    await save(restored)
  }

  async function deleteForGood(entry: JournalEntry) {
    if (!window.confirm(`„${entryTitle(entry)}“ endgültig löschen?`)) return
    setEntries((all) => all?.filter((e) => e.id !== entry.id) ?? null)
    pending.current.delete(entry.id)
    await deleteJournalEntry(entry.id)
  }

  async function emptyTrash(trash: JournalEntry[]) {
    if (!window.confirm(`${trash.length} Einträge im Papierkorb endgültig löschen?`)) return
    const ids = new Set(trash.map((e) => e.id))
    setEntries((all) => all?.filter((e) => !ids.has(e.id)) ?? null)
    for (const id of ids) pending.current.delete(id)
    for (const e of trash) await deleteJournalEntry(e.id)
  }

  /** Text, Markdown and PDF files become new entries (file name = title). */
  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])]
    e.target.value = ''
    if (files.length === 0) return
    flush()
    setImporting(true)
    const created: JournalEntry[] = []
    const failed: string[] = []
    for (const file of files) {
      try {
        const text = isPdf(file) ? pdfPagesToText(await readPdfText(file)) : cleanImportedText(await file.text())
        if (!text) throw new ImportError('leer')
        created.push(createJournalEntry(Date.now(), { title: titleFromFileName(file.name), text: text.slice(0, MAX_JOURNAL_TEXT) }))
      } catch (err) {
        console.error(err)
        failed.push(file.name)
      }
    }
    if (created.length > 0) {
      await putJournalEntries(created)
      setEntries((all) => [...created, ...(all ?? [])])
      setSelectedId(created[0].id)
      setShowTrash(false)
      setTag(null)
      setQuery('')
    }
    setImporting(false)
    setStatus(
      `${created.length} Datei(en) importiert.` +
        (failed.length > 0 ? ` Nicht lesbar oder ohne Text: ${failed.join(', ')}` : ''),
    )
  }

  function exportText(list: JournalEntry[], title: string) {
    downloadBlob(new Blob([entriesToText(list)], { type: 'text/plain;charset=utf-8' }), `${fileNameFromTitle(title)}.txt`)
  }

  if (entries === null) return <p className="p-4 text-sm text-slate-400">Wird geladen …</p>

  const visible = filterJournal(entries, query, tag)
  const { trash } = journalTrash(entries)
  const active = entries.filter((e) => e.deletedAt === null)

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      {/* List */}
      <aside
        className={`flex min-h-0 w-full flex-col gap-2 border-slate-700 p-3 md:w-80 md:shrink-0 md:border-r ${
          selected ? 'hidden md:flex' : 'flex flex-1 md:flex-none'
        }`}
      >
        <div className="flex flex-wrap gap-1.5">
          <button type="button" className={`${buttonClass} bg-emerald-700 text-white hover:bg-emerald-600`} onClick={handleNew}>
            + Neuer Eintrag
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={importing}
            title="Text-, Markdown- oder PDF-Dateien als neue Einträge übernehmen"
            onClick={() => fileInputRef.current?.click()}
          >
            {importing ? 'Importiere …' : 'Importieren …'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.md,.markdown,.text,.pdf,text/plain,text/markdown,application/pdf"
            className="hidden"
            onChange={handleImport}
          />
        </div>
        <input
          type="search"
          className={inputClass}
          placeholder="Suchen …"
          aria-label="Journal durchsuchen"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <PhoneFold label="Schlagwörter" activeCount={tag ? 1 : 0}>
          <div role="group" aria-label="Nach Schlagwort filtern" className="flex flex-wrap gap-1">
            <button type="button" className={chipClass(tag === null)} onClick={() => setTag(null)}>
              Alle
            </button>
            {JOURNAL_TAGS.map((t) => (
              <button key={t} type="button" className={chipClass(tag === t)} onClick={() => setTag(tag === t ? null : t)}>
                {t}
              </button>
            ))}
          </div>
        </PhoneFold>

        <ul className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {visible.length === 0 && (
            <li className="p-2 text-sm text-slate-400">
              {active.length === 0 ? 'Noch keine Einträge. Lege einen an oder importiere eine Datei.' : 'Nichts gefunden.'}
            </li>
          )}
          {visible.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                aria-current={e.id === selectedId ? 'true' : undefined}
                onClick={() => {
                  flush()
                  setSelectedId(e.id)
                }}
                className={`flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors ${
                  e.id === selectedId ? 'bg-slate-700' : 'hover:bg-slate-800'
                }`}
              >
                <span className="truncate text-sm font-semibold text-white">{entryTitle(e)}</span>
                <span className="text-xs text-slate-400">
                  {dateTimeText(e.updatedAt)}
                  {e.tags.length > 0 && ` · ${e.tags.join(', ')}`}
                </span>
                {entryPreview(e) && <span className="line-clamp-2 text-xs text-slate-300">{entryPreview(e)}</span>}
              </button>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-1.5 border-t border-slate-700 pt-2">
          <button
            type="button"
            className={buttonClass}
            disabled={visible.length === 0}
            title="Die angezeigten Einträge als Textdatei"
            onClick={() => exportText(visible, `journal-${new Date().toISOString().slice(0, 10)}`)}
          >
            Alle als Text
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={visible.length === 0}
            title="Die angezeigten Einträge als PDF"
            onClick={() => void exportJournalPdf(visible, `Journal ${new Date().toLocaleDateString('de-DE')}`)}
          >
            Alle als PDF
          </button>
          <button type="button" className={buttonClass} aria-expanded={showTrash} onClick={() => setShowTrash((v) => !v)}>
            Papierkorb ({trash.length})
          </button>
        </div>
        {showTrash && (
          <div className="flex flex-col gap-1 rounded-lg bg-slate-800/60 p-2">
            {trash.length === 0 && <p className="text-xs text-slate-400">Der Papierkorb ist leer.</p>}
            {trash.map((e) => (
              <div key={e.id} className="flex items-center gap-1.5">
                <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{entryTitle(e)}</span>
                <button type="button" className={buttonClass} onClick={() => void restore(e)}>
                  Zurückholen
                </button>
                <button type="button" className={dangerButtonClass} aria-label="Endgültig löschen" onClick={() => void deleteForGood(e)}>
                  ✕
                </button>
              </div>
            ))}
            {trash.length > 0 && (
              <button type="button" className={dangerButtonClass} onClick={() => void emptyTrash(trash)}>
                Papierkorb leeren
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Editor */}
      <section className={`min-h-0 min-w-0 flex-1 flex-col gap-3 p-3 md:p-4 ${selected ? 'flex' : 'hidden md:flex'}`}>
        {selected ? (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className={`${buttonClass} md:hidden`}
                onClick={() => {
                  flush()
                  setSelectedId(null)
                }}
              >
                ← Liste
              </button>
              <SaveButton
                dirty={saveState !== 'saved'}
                saving={false}
                onSave={() => saveNow(selected)}
                savedTitle="Eintrag gespeichert"
              />
              <span className="text-xs text-slate-400">
                Erstellt {dateTimeText(selected.createdAt)} · geändert {dateTimeText(selected.updatedAt)}
                {saveState === 'failed' ? ' · Speichern fehlgeschlagen' : status && ` · ${status}`}
              </span>
              <span className="flex-1" />
              <button type="button" className={buttonClass} onClick={() => exportText([selected], entryTitle(selected))}>
                Als Text
              </button>
              <button type="button" className={buttonClass} onClick={() => void exportJournalPdf([selected], entryTitle(selected))}>
                PDF
              </button>
              <button
                type="button"
                className={buttonClass}
                title="Text in die Zwischenablage kopieren"
                onClick={() => {
                  navigator.clipboard?.writeText(entryToText(selected)).then(
                    () => setStatus('Kopiert'),
                    () => setStatus('Kopieren nicht möglich'),
                  )
                }}
              >
                Kopieren
              </button>
              <button type="button" className={dangerButtonClass} onClick={() => void moveToTrash(selected)}>
                Löschen
              </button>
            </div>
            <input
              className={`${inputClass} text-base font-semibold`}
              placeholder="Titel (optional)"
              aria-label="Titel"
              value={selected.title}
              onChange={(e) => change(selected, { title: e.target.value })}
            />
            <div role="group" aria-label="Schlagwörter" className="flex flex-wrap gap-1">
              {JOURNAL_TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={selected.tags.includes(t)}
                  className={chipClass(selected.tags.includes(t))}
                  onClick={() => change(selected, { tags: toggleTag(selected.tags, t) })}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              // A new entry starts in the text field.
              autoFocus={selected.text === '' && selected.title === ''}
              className="min-h-64 flex-1 resize-none rounded-md border border-slate-600 bg-slate-800 p-3 text-base leading-relaxed text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
              placeholder="Gedanken und Ideen …"
              aria-label="Text"
              maxLength={MAX_JOURNAL_TEXT}
              value={selected.text}
              onChange={(e) => change(selected, { text: e.target.value })}
              onBlur={flush}
            />
            <p className="text-xs text-slate-500">Wird automatisch gespeichert, nur auf diesem Gerät (kommt mit in die Sicherung der Bibliothek).</p>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-sm text-slate-400">
            <p>Wähle links einen Eintrag oder lege einen neuen an.</p>
            {status && <p className="text-xs text-emerald-300">{status}</p>}
          </div>
        )}
      </section>
    </div>
  )
}
