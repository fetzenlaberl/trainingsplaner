import { useEffect, useRef, useState } from 'react'
import { CATEGORY_LABELS, filterEntries, type LibraryEntry } from '../library/library'
import { buttonClass, inputClass } from './ui'

interface DrillPickerProps {
  entries: LibraryEntry[]
  onPick: (entry: LibraryEntry) => void
  onClose: () => void
}

/** Dialog to choose a drill from the library. */
export function DrillPicker({ entries, onPick, onClose }: DrillPickerProps) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    searchRef.current?.focus()
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const visible = filterEntries(entries, query, null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="picker-title"
        className="flex max-h-[85vh] w-full max-w-xl flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <h2 id="picker-title" className="text-base font-semibold text-white">
          Übung aus der Bibliothek hinzufügen
        </h2>
        <input
          ref={searchRef}
          type="search"
          className={inputClass}
          placeholder="Suchen …"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className="min-h-0 flex-1 overflow-y-auto">
          {entries.length === 0 && (
            <li className="text-sm text-slate-400">
              Die Bibliothek ist leer. Speichere zuerst Übungen im Editor.
            </li>
          )}
          {entries.length > 0 && visible.length === 0 && (
            <li className="text-sm text-slate-400">Keine Übung passt zur Suche.</li>
          )}
          {visible.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => onPick(entry)}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-800"
              >
                <span className="flex h-12 w-18 shrink-0 items-center justify-center overflow-hidden rounded bg-emerald-900">
                  {entry.thumbnail && <img src={entry.thumbnail} alt="" className="h-full w-full object-contain" />}
                </span>
                <span className="flex flex-col">
                  <span className="font-medium text-white">{entry.drill.title}</span>
                  {entry.drill.category && (
                    <span className="text-xs text-slate-400">{CATEGORY_LABELS[entry.drill.category]}</span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex justify-end">
          <button type="button" className={buttonClass} onClick={onClose}>
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}
