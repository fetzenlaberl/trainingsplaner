import { useRef, useState, type ChangeEvent } from 'react'
import { importFile, type ImportTarget } from '../import/importActions'
import { downloadBlob } from '../export/download'
import { isEditorDirty, saveToLibraryWithFeedback, unlinkEditor } from '../library/libraryActions'
import { useLibraryLink } from '../library/libraryStore'
import { DrillFileError, fileNameFromTitle, parseDrill, serializeDrill } from '../model/serialize'
import { currentDrill, useDrillStore } from '../store/drillStore'
import { usePlaybackStore } from '../store/playbackStore'
import { usePerspectiveStore } from '../store/perspectiveStore'
import { templateDrill, type DrillTemplate } from '../model/templates'
import { DetailsDialog } from './DetailsDialog'
import { FieldTemplateDialog } from './FieldTemplateDialog'
import type { Drill } from '../model/types'
import { Dropdown } from './Dropdown'
import { useExportMenu } from './ExportMenu'
import { buttonClass, inputClass } from './ui'

const DISCARD_QUESTION =
  'Die Übung im Editor hat Änderungen, die nicht in der Bibliothek gespeichert sind. Trotzdem fortfahren?'

/** Title, the file menu (new, details, templates, open/save, export, import), library save and undo/redo. */
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
  const importInputRef = useRef<HTMLInputElement>(null)
  const importTargetRef = useRef<ImportTarget>('item')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [fieldTemplatesOpen, setFieldTemplatesOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const dirty = drillJson !== savedJson
  const exportMenu = useExportMenu()

  function handleNew() {
    if (isEditorDirty() && !window.confirm(DISCARD_QUESTION)) return
    usePlaybackStore.getState().stop()
    useDrillStore.getState().newDrill()
    unlinkEditor(serializeDrill(currentDrill(useDrillStore.getState())))
  }

  function handleTemplate(template: DrillTemplate) {
    if (isEditorDirty() && !window.confirm(DISCARD_QUESTION)) return
    usePlaybackStore.getState().stop()
    useDrillStore.getState().loadDrill(templateDrill(template))
    usePerspectiveStore.getState().setEnabled(true)
    unlinkEditor(null)
  }

  function handleFieldTemplate(drill: Drill) {
    if (isEditorDirty() && !window.confirm(DISCARD_QUESTION)) return
    setFieldTemplatesOpen(false)
    usePlaybackStore.getState().stop()
    useDrillStore.getState().loadDrill(drill)
    usePerspectiveStore.getState().setEnabled(false)
    unlinkEditor(null)
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

  function startImport(target: ImportTarget) {
    importTargetRef.current = target
    const input = importInputRef.current
    if (!input) return
    input.accept = target === 'text' ? '.txt,.md,text/plain' : 'image/*,.pdf,application/pdf'
    input.click()
  }

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const error = await importFile(file, importTargetRef.current)
    if (error) window.alert('Import fehlgeschlagen: ' + error)
  }

  async function handleSaveToLibrary() {
    setSaving(true)
    await saveToLibraryWithFeedback()
    setSaving(false)
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      <input
        className={`${inputClass} w-40 min-w-0 lg:w-56`}
        value={title}
        aria-label="Titel der Übung"
        placeholder="Titel der Übung"
        onChange={(e) => setTitle(e.target.value)}
      />
      <Dropdown
        label="Datei"
        items={[
          { section: 'Übung', label: 'Neue Übung', onSelect: handleNew },
          { section: 'Übung', label: 'Details …', hint: 'Beschreibung, Kategorie, Spieler, Dauer', onSelect: () => setDetailsOpen(true) },
          {
            section: 'Übung',
            label: 'In Bibliothek speichern',
            hint: 'Strg+S',
            disabled: saving,
            onSelect: () => void handleSaveToLibrary(),
          },
          {
            section: 'Neu aus Vorlage',
            label: 'Trainingsfelder …',
            hint: 'Feldgrößen 1:1–9:9, Torvarianten, Y-Pass',
            onSelect: () => setFieldTemplatesOpen(true),
          },
          {
            section: 'Neu aus Vorlage',
            label: 'Perspektive leer',
            hint: 'Ganzfeld hochkant mit Korridoren, 3D-Ansicht an',
            onSelect: () => handleTemplate('perspective'),
          },
          {
            section: 'Neu aus Vorlage',
            label: 'Perspektive mit Dummys',
            hint: 'Dazu gelbe Dummys als Gegner',
            onSelect: () => handleTemplate('perspectiveDummies'),
          },
          { section: 'Datei', label: 'Datei öffnen …', onSelect: () => fileInputRef.current?.click() },
          { section: 'Datei', label: 'Als Datei speichern', hint: 'JSON-Datei herunterladen', onSelect: handleSaveFile },
          ...exportMenu.items,
          {
            section: 'Importieren',
            label: 'Bild oder PDF aufs Feld …',
            hint: 'Foto, PNG, JPG oder erste PDF-Seite als Objekt',
            onSelect: () => startImport('item'),
          },
          {
            section: 'Importieren',
            label: 'Hintergrundbild …',
            hint: 'Bild oder PDF statt Rasen, z. B. Foto vom eigenen Platz',
            onSelect: () => startImport('background'),
          },
          {
            section: 'Importieren',
            label: 'Text als Textfeld …',
            hint: 'Textdatei (.txt)',
            onSelect: () => startImport('text'),
          },
        ]}
      />
      <input ref={importInputRef} type="file" className="hidden" onChange={(e) => void handleImport(e)} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleOpenFile}
      />
      <button
        type="button"
        className={dirty ? buttonClass.replace('bg-slate-800', 'bg-emerald-700').replace('hover:bg-slate-700', 'hover:bg-emerald-600') : buttonClass}
        title={dirty ? 'Ungespeicherte Änderungen – in der Übungsbibliothek speichern (Strg+S)' : inLibrary ? 'In der Bibliothek gespeichert' : 'In der Übungsbibliothek speichern (Strg+S)'}
        disabled={saving}
        onClick={handleSaveToLibrary}
      >
        {saving ? 'Speichert …' : dirty ? '● Speichern' : inLibrary ? '✓ Gespeichert' : 'Speichern'}
      </button>
      <div role="group" aria-label="Verlauf" className="flex gap-1">
        <button
          type="button"
          className={`${buttonClass} w-10 justify-center px-0 text-base`}
          title="Rückgängig (Strg+Z)"
          aria-label="Rückgängig"
          disabled={!canUndo}
          onClick={undo}
        >
          ↶
        </button>
        <button
          type="button"
          className={`${buttonClass} w-10 justify-center px-0 text-base`}
          title="Wiederholen (Strg+Y)"
          aria-label="Wiederholen"
          disabled={!canRedo}
          onClick={redo}
        >
          ↷
        </button>
      </div>
      {exportMenu.dialogs}
      {detailsOpen && <DetailsDialog onClose={() => setDetailsOpen(false)} />}
      {fieldTemplatesOpen && (
        <FieldTemplateDialog onChoose={handleFieldTemplate} onClose={() => setFieldTemplatesOpen(false)} />
      )}
    </div>
  )
}
