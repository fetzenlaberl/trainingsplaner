import { useEffect, useState } from 'react'
import type { LibraryEntry } from '../library/library'
import { isEditorDirty, openEntryInEditor } from '../library/libraryActions'
import { listEntries } from '../library/libraryDb'
import {
  clampMinutes,
  createSession,
  drillBlock,
  duplicateSession,
  formatDate,
  freeBlock,
  moveBlock,
  scheduleRows,
  sortSessions,
  totalMinutes,
  type SessionBlock,
  type TrainingSession,
} from '../sessions/session'
import { deleteSession, listSessions, putSession } from '../sessions/sessionDb'
import { useViewStore } from '../store/viewStore'
import { kindInfo, SESSION_KINDS, type SessionKind } from '../sessions/week'
import { DrillPicker } from './DrillPicker'
import { WeekView } from './WeekView'
import { buttonClass, dangerButtonClass, inputClass } from './ui'

const MINUTE_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 75, 90]

const LOAD_ERROR =
  'Die Einheiten konnten nicht geladen werden. Möglicherweise erlaubt dieser Browser (z. B. im privaten Modus) keine dauerhafte Speicherung.'

function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function reportSaveError(err: unknown) {
  console.error(err)
  window.alert('Die Einheit konnte nicht gespeichert werden.')
}

/** List of training sessions and the editor for the selected one. Changes are saved automatically. */
export function SessionsView() {
  const [sessions, setSessions] = useState<TrainingSession[] | null>(null)
  const [entries, setEntries] = useState<LibraryEntry[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'list' | 'week'>('list')

  useEffect(() => {
    let cancelled = false
    Promise.all([listSessions(), listEntries()]).then(
      ([loadedSessions, loadedEntries]) => {
        if (cancelled) return
        setSessions(loadedSessions)
        setEntries(loadedEntries)
        setSelectedId(loadedSessions[0]?.id ?? null)
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

  const selected = sessions?.find((s) => s.id === selectedId) ?? null

  /** Stores a changed or new session and keeps the list sorted. */
  function save(session: TrainingSession) {
    setSessions((list) => sortSessions([...(list ?? []).filter((s) => s.id !== session.id), session]))
    putSession(session).catch(reportSaveError)
  }

  function update(change: Partial<TrainingSession>) {
    if (selected) save({ ...selected, ...change, updatedAt: Date.now() })
  }

  function handleNew(date = today()) {
    const session = createSession(Date.now(), date)
    save(session)
    setSelectedId(session.id)
    setMode('list')
  }

  function handleDuplicate() {
    if (!selected) return
    const copy = duplicateSession(selected, Date.now())
    save(copy)
    setSelectedId(copy.id)
  }

  function handleDelete() {
    if (!selected || !window.confirm(`„${selected.title}“ wirklich löschen?`)) return
    const remaining = (sessions ?? []).filter((s) => s.id !== selected.id)
    setSessions(remaining)
    setSelectedId(remaining[0]?.id ?? null)
    deleteSession(selected.id).catch(reportSaveError)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div role="tablist" aria-label="Ansicht" className="flex gap-1 border-b border-slate-700 bg-slate-900 px-3 py-2">
        {(
          [
            ['list', 'Liste'],
            ['week', 'Woche'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={`min-h-9 rounded-md px-4 text-sm font-semibold ${
              mode === key ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'week' ? (
        <div className="min-h-0 flex-1">
          <WeekView
            sessions={sessions ?? []}
            onOpen={(id) => {
              setSelectedId(id)
              setMode('list')
            }}
            onCreate={(date) => handleNew(date)}
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          <aside className="flex max-h-56 shrink-0 flex-col border-b border-slate-700 bg-slate-900 md:max-h-none md:w-72 md:border-r md:border-b-0">
            <div className="p-3">
              <button type="button" className={`${buttonClass} w-full justify-center`} onClick={() => handleNew()}>
                + Neue Einheit
              </button>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
              {error && <li className="p-2 text-sm text-red-300">{error}</li>}
              {!error && sessions === null && <li className="p-2 text-sm text-slate-400">Wird geladen …</li>}
              {sessions?.length === 0 && (
                <li className="p-2 text-sm text-slate-400">Noch keine Einheiten. Leg mit „+ Neue Einheit“ los.</li>
              )}
              {sessions?.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-current={s.id === selectedId ? 'true' : undefined}
                    onClick={() => setSelectedId(s.id)}
                    className={`flex w-full flex-col rounded-lg px-3 py-2 text-left ${
                      s.id === selectedId ? 'bg-emerald-700 text-white' : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-medium break-words">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: kindInfo(s.kind).color }} />
                      {s.title || 'Ohne Titel'}
                    </span>
                    <span className="text-xs opacity-75">
                      {[formatDate(s.date), `${totalMinutes(s)} min`, `${s.blocks.length} Blöcke`]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="min-h-0 flex-1 overflow-y-auto p-4">
            {selected ? (
              <SessionEditor
                key={selected.id}
                session={selected}
                entries={entries}
                onChange={update}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
              />
            ) : (
              sessions && <p className="text-sm text-slate-400">Wähle links eine Einheit oder leg eine neue an.</p>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

interface SessionEditorProps {
  session: TrainingSession
  entries: LibraryEntry[]
  onChange: (change: Partial<TrainingSession>) => void
  onDuplicate: () => void
  onDelete: () => void
}

function SessionEditor({ session, entries, onChange, onDuplicate, onDelete }: SessionEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const setView = useViewStore((s) => s.setView)
  const byId = new Map(entries.map((e) => [e.id, e]))
  const rows = scheduleRows(session)

  const setBlocks = (blocks: SessionBlock[]) => onChange({ blocks })
  const updateBlock = (id: string, change: Partial<SessionBlock>) =>
    setBlocks(session.blocks.map((b) => (b.id === id ? { ...b, ...change } : b)))

  function openInEditor(entry: LibraryEntry) {
    if (isEditorDirty()) {
      const ok = window.confirm(
        'Die Übung im Editor hat Änderungen, die nicht in der Bibliothek gespeichert sind. Trotzdem öffnen?',
      )
      if (!ok) return
    }
    openEntryInEditor(entry)
    setView('editor')
  }

  async function handlePdf() {
    setExporting(true)
    try {
      const { exportSessionPdf } = await import('../sessions/sessionPdf')
      await exportSessionPdf(session)
    } catch (err) {
      console.error(err)
      window.alert('Das PDF konnte nicht erstellt werden.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputClass} min-w-0 flex-1 text-lg font-semibold`}
          aria-label="Titel der Einheit"
          value={session.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
        <button type="button" className={buttonClass} disabled={exporting} onClick={handlePdf}>
          {exporting ? 'PDF wird erstellt …' : 'PDF'}
        </button>
        <button type="button" className={buttonClass} onClick={onDuplicate}>
          Duplizieren
        </button>
        <button type="button" className={dangerButtonClass} onClick={onDelete}>
          Löschen
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Art
          <select
            className={inputClass}
            value={session.kind}
            onChange={(e) => onChange({ kind: e.target.value as SessionKind })}
          >
            {SESSION_KINDS.map((k) => (
              <option key={k.key} value={k.key}>
                {k.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Datum
          <input
            type="date"
            className={inputClass}
            value={session.date}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Beginn
          <input
            type="time"
            className={inputClass}
            value={session.startTime}
            onChange={(e) => onChange({ startTime: e.target.value })}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Mannschaft
          <input
            className={inputClass}
            placeholder="z. B. U13"
            value={session.team}
            onChange={(e) => onChange({ team: e.target.value })}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm text-slate-400">
        Ziel der Einheit
        <input
          className={inputClass}
          placeholder="z. B. Spielaufbau über die Außen"
          value={session.goal}
          onChange={(e) => onChange({ goal: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-slate-400">
        Notizen
        <textarea
          className={`${inputClass} min-h-20 py-2`}
          value={session.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-white">
          Ablauf <span className="font-normal text-slate-400">· Gesamtdauer {totalMinutes(session)} min</span>
        </h2>
        <div className="flex gap-1.5">
          <button type="button" className={buttonClass} onClick={() => setPickerOpen(true)}>
            + Übung
          </button>
          <button type="button" className={buttonClass} onClick={() => setBlocks([...session.blocks, freeBlock()])}>
            + Freier Block
          </button>
        </div>
      </div>

      {session.blocks.length === 0 && (
        <p className="text-sm text-slate-400">
          Noch keine Blöcke. Füge Übungen aus der Bibliothek oder freie Blöcke (z. B. Trinkpause) hinzu.
        </p>
      )}

      <ol className="flex flex-col gap-2">
        {rows.map(({ block, number, time }, index) => {
          const entry = block.drillId ? byId.get(block.drillId) : undefined
          const missing = block.drillId !== null && !entry
          return (
            <li key={block.id} className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900 p-3 sm:flex-row">
              <div className="flex shrink-0 items-start gap-3 sm:w-56">
                <span className="mt-1 w-6 text-right font-semibold text-slate-400">{number}.</span>
                {block.drillId ? (
                  <button
                    type="button"
                    disabled={!entry}
                    title={entry ? 'Im Editor öffnen' : undefined}
                    onClick={() => entry && openInEditor(entry)}
                    className="flex h-16 w-24 items-center justify-center overflow-hidden rounded bg-emerald-900"
                  >
                    {entry?.thumbnail && <img src={entry.thumbnail} alt="" className="h-full w-full object-contain" />}
                  </button>
                ) : (
                  <span className="flex h-16 w-24 items-center justify-center rounded bg-slate-800 text-xs text-slate-400">
                    Freier Block
                  </span>
                )}
                <span className="mt-1 text-xs whitespace-nowrap text-slate-400 tabular-nums">{time}</span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                {block.drillId ? (
                  <div className="font-medium text-white">
                    {entry?.drill.title ?? block.title}
                    {missing && <span className="ml-2 text-xs text-amber-300">nicht mehr in der Bibliothek</span>}
                  </div>
                ) : (
                  <input
                    className={inputClass}
                    aria-label="Titel des Blocks"
                    value={block.title}
                    onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                  />
                )}
                <input
                  className={inputClass}
                  aria-label="Notiz zum Block"
                  placeholder="Notiz für diese Einheit (optional)"
                  value={block.notes}
                  onChange={(e) => updateBlock(block.id, { notes: e.target.value })}
                />
              </div>
              <div className="flex shrink-0 items-start gap-1">
                <select
                  className={inputClass}
                  aria-label="Dauer"
                  value={block.durationMin}
                  onChange={(e) => updateBlock(block.id, { durationMin: clampMinutes(Number(e.target.value)) })}
                >
                  {!MINUTE_OPTIONS.includes(block.durationMin) && (
                    <option value={block.durationMin}>{block.durationMin} min</option>
                  )}
                  {MINUTE_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m} min
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={buttonClass}
                  aria-label="Nach oben"
                  disabled={index === 0}
                  onClick={() => setBlocks(moveBlock(session.blocks, index, -1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={buttonClass}
                  aria-label="Nach unten"
                  disabled={index === session.blocks.length - 1}
                  onClick={() => setBlocks(moveBlock(session.blocks, index, 1))}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className={dangerButtonClass}
                  aria-label="Block entfernen"
                  onClick={() => setBlocks(session.blocks.filter((b) => b.id !== block.id))}
                >
                  ✕
                </button>
              </div>
            </li>
          )
        })}
      </ol>

      {pickerOpen && (
        <DrillPicker
          entries={entries}
          onClose={() => setPickerOpen(false)}
          onPick={(entry) => {
            setBlocks([...session.blocks, drillBlock(entry)])
            setPickerOpen(false)
          }}
        />
      )}
    </div>
  )
}
