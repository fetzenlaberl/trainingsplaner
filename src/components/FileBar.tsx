import { useRef, useState, type ChangeEvent } from 'react'
import { downloadBlob } from '../export/download'
import { DrillFileError, fileNameFromTitle, parseDrill, serializeDrill } from '../model/serialize'
import { currentDrill, useDrillStore } from '../store/drillStore'
import { buttonClass, inputClass } from './ui'

/** Title, new/open/save, export and undo/redo. */
export function FileBar() {
  const title = useDrillStore((s) => s.title)
  const setTitle = useDrillStore((s) => s.setTitle)
  const canUndo = useDrillStore((s) => s.past.length > 0)
  const canRedo = useDrillStore((s) => s.future.length > 0)
  const undo = useDrillStore((s) => s.undo)
  const redo = useDrillStore((s) => s.redo)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)

  function handleNew() {
    if (window.confirm('Neue Übung beginnen? Die aktuelle Übung wird verworfen, wenn du sie nicht gespeichert hast.')) {
      useDrillStore.getState().newDrill()
    }
  }

  function handleSave() {
    const state = useDrillStore.getState()
    const blob = new Blob([serializeDrill(currentDrill(state))], { type: 'application/json' })
    downloadBlob(blob, `${fileNameFromTitle(state.title)}.json`)
  }

  async function handleExport(format: 'png' | 'pdf') {
    setExporting(true)
    try {
      const { exportPdf, exportPng } = await import('../export/exportDrill')
      await (format === 'png' ? exportPng() : exportPdf())
    } catch (err) {
      console.error(err)
      window.alert('Export fehlgeschlagen. Bitte versuche es noch einmal.')
    } finally {
      setExporting(false)
    }
  }

  async function handleOpen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow opening the same file again
    if (!file) return
    try {
      useDrillStore.getState().loadDrill(parseDrill(await file.text()))
    } catch (err) {
      const message = err instanceof DrillFileError ? err.message : 'Die Datei konnte nicht gelesen werden.'
      window.alert(`Öffnen fehlgeschlagen: ${message}`)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        className={`${inputClass} w-48`}
        value={title}
        aria-label="Titel der Übung"
        placeholder="Titel der Übung"
        onChange={(e) => setTitle(e.target.value)}
      />
      <button type="button" className={buttonClass} onClick={handleNew}>
        Neu
      </button>
      <button type="button" className={buttonClass} onClick={() => fileInputRef.current?.click()}>
        Öffnen
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleOpen}
      />
      <button type="button" className={buttonClass} onClick={handleSave}>
        Speichern
      </button>
      <button
        type="button"
        className={buttonClass}
        title="Als Bild exportieren"
        disabled={exporting}
        onClick={() => handleExport('png')}
      >
        PNG
      </button>
      <button
        type="button"
        className={buttonClass}
        title="Als PDF exportieren"
        disabled={exporting}
        onClick={() => handleExport('pdf')}
      >
        PDF
      </button>
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
    </div>
  )
}
