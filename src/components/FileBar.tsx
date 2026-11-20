import { useRef, useState, type ChangeEvent } from 'react'
import { downloadBlob } from '../export/download'
import { isEditorDirty, saveToLibraryWithFeedback, unlinkEditor } from '../library/libraryActions'
import { useLibraryLink } from '../library/libraryStore'
import { DrillFileError, fileNameFromTitle, parseDrill, serializeDrill } from '../model/serialize'
import { currentDrill, useDrillStore } from '../store/drillStore'
import { usePlaybackStore } from '../store/playbackStore'
import { DetailsDialog } from './DetailsDialog'
import { Dropdown } from './Dropdown'
import { ExportMenu } from './ExportMenu'
import { buttonClass, inputClass } from './ui'

const DISCARD_QUESTION =
  'Die Übung im Editor hat Änderungen, die nicht in der Bibliothek gespeichert sind. Trotzdem fortfahren?'

/** Title, details, file menu, library save, export and undo/redo. */
export function FileBar() {
  const title = useDrillStore((s) => s.title)
  const setTitle = useDrillStore((s) => s.setTitle)
  const canUndo = useDrillStore((s) => s.past.length > 0)
  const canRedo = useDrillStore((s) => s.future.length > 0)
  const undo = useDrillStore((s) => s.undo)
  const redo = useDrillStore((s) => s.redo)
  const drillJson = useDrillStore((s) => serializeDrill(currentDrill(s)))
  const savedJson = useLibraryLink((s) => s.savedJson)
  const inLibrary = useLibraryLink((s) => s.libraryId !== null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const dirty = drillJson !== savedJson

  function handleNew() {
    if (isEditorDirty() && !window.confirm(DISCARD_QUESTION)) return
    usePlaybackStore.getState().stop()
    useDrillStore.getState().newDrill()
    unlinkEditor(serializeDrill(currentDrill(useDrillStore.getState())))
  }

  function handleSaveFile() {
    const state = useDrillStore.getState()
    const blob = new Blob([serializeDrill(currentDrill(state))], { type: 'application/json' })
    downloadBlob(blob, `${fileNameFromTitle(state.title)}.json`)
  }

  async function handleOpenFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow opening the same file again
    if (!file) return
    try {
      const drill = parseDrill(await file.text())
      if (isEditorDirty() && !window.confirm(DISCARD_QUESTION)) return
      usePlaybackStore.getState().stop()
      useDrillStore.getState().loadDrill(drill)
      unlinkEditor(null) // a drill from a file is not in the library yet
    } catch (err) {
      const message = err instanceof DrillFileError ? err.message : 'Die Datei konnte nicht gelesen werden.'
      window.alert(`Öffnen fehlgeschlagen: ${message}`)
    }
  }

  async function handleSaveToLibrary() {
    setSaving(true)
    await saveToLibraryWithFeedback()
    setSaving(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button type="button" className={buttonClass} title="Neue, leere Übung beginnen" onClick={handleNew}>
        + Neu
      </button>
      <input
        className={`${inputClass} w-48`}
        value={title}
        aria-label="Titel der Übung"
        placeholder="Titel der Übung"
        onChange={(e) => setTitle(e.target.value)}
      />
      <button type="button" className={buttonClass} onClick={() => setDetailsOpen(true)}>
        Details
      </button>
      <Dropdown
        label="Datei"
        items={[
          { label: 'Neue Übung', onSelect: handleNew },
          { label: 'Datei öffnen …', onSelect: () => fileInputRef.current?.click() },
          { label: 'Als Datei speichern', hint: 'JSON-Datei herunterladen', onSelect: handleSaveFile },
        ]}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleOpenFile}
      />
      <button
        type="button"
        className={`${buttonClass} ${dirty ? 'bg-emerald-700 text-white hover:bg-emerald-600' : ''}`}
        title="In der Übungsbibliothek speichern (Strg+S)"
        disabled={saving}
        onClick={handleSaveToLibrary}
      >
        {saving ? 'Speichert …' : 'In Bibliothek speichern'}
      </button>
      <span className="text-xs text-slate-400" aria-live="polite">
        {dirty ? '● Ungespeichert' : inLibrary ? '✓ Gespeichert' : ''}
      </span>
      <ExportMenu />
      <span className="mx-1 h-6 w-px bg-slate-700" aria-hidden />
      <button
        type="button"
        className={buttonClass}
        title="Rückgängig (Strg+Z)"
        disabled={!canUndo}
        onClick={undo}
      >
        ↶ Rückgängig
      </button>
      <button
        type="button"
        className={buttonClass}
        title="Wiederholen (Strg+Y)"
        disabled={!canRedo}
        onClick={redo}
      >
        ↷ Wiederholen
      </button>
      {detailsOpen && <DetailsDialog onClose={() => setDetailsOpen(false)} />}
    </div>
  )
}
