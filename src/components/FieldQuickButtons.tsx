import { useDrillStore } from '../store/drillStore'
import { useToolStore } from '../store/toolStore'

const quickClass =
  'flex h-12 min-w-12 items-center justify-center gap-1 rounded-lg bg-slate-900/85 px-3 text-sm font-medium text-slate-200 shadow-lg hover:bg-slate-700 disabled:text-slate-500 disabled:hover:bg-slate-900/85'

/**
 * Buttons next to the trash bin on the pitch: back to the normal editing mode at once, and
 * undo. Handy while drawing, without reaching up to the toolbar. Not part of exports (HTML).
 */
export function FieldQuickButtons({ onStandardMode }: { onStandardMode: () => void }) {
  const canUndo = useDrillStore((s) => s.past.length > 0)
  const standard = useToolStore(
    (s) => s.tool === 'select' && !s.multiSelect && !s.showLocked && s.editingCornersId === null,
  )

  /** Select tool, nothing selected, no special modes (multi-select, fixed parts, corners, zoom area). */
  function standardMode() {
    const tools = useToolStore.getState()
    tools.setTool('select')
    tools.setMultiSelect(false)
    tools.setShowLocked(false)
    tools.setEditingCornersId(null)
    tools.setEditingContentId(null)
    tools.setQuickMenu(null)
    useDrillStore.getState().select(null)
    onStandardMode()
  }

  return (
    <div className="absolute bottom-3 left-[4.25rem] flex gap-2">
      <button
        type="button"
        className={`${quickClass} ${standard ? '' : 'ring-2 ring-emerald-400/70'}`}
        title="Zurück zur normalen Bearbeitung: Auswählen-Werkzeug, Auswahl aufheben, Sondermodi beenden"
        aria-label="Auswählen (normale Bearbeitung)"
        onClick={standardMode}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
          <path d="M5 3 L5 19 L9.5 14.5 L12.5 21 L15 20 L12 13.5 L18 13.5 Z" fill="currentColor" />
        </svg>
        <span className="hidden xl:inline">Auswählen</span>
      </button>
      <button
        type="button"
        className={quickClass}
        title="Rückgängig (Strg+Z)"
        aria-label="Rückgängig"
        disabled={!canUndo}
        onClick={() => useDrillStore.getState().undo()}
      >
        <span aria-hidden className="text-lg leading-none">↶</span>
        <span className="hidden xl:inline">Rückgängig</span>
      </button>
    </div>
  )
}
