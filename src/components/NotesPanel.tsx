import { useRef, useState } from 'react'
import { MAX_NOTES_LENGTH } from '../field/pitchStyle'
import { useDrillStore, type DrillContent } from '../store/drillStore'
import { AutoTextarea } from './AutoTextarea'

const COLLAPSED_KEY = 'trainingsplaner.notesCollapsed'

function loadCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Notes below the pitch (switched on in the "Feld" menu). Belongs to the drill and is
 * printed below the field in the PNG and PDF export. One undo step per editing session.
 * Can be folded to a thin strip so the pitch gets the room (remembered on this device).
 */
export function NotesPanel() {
  const show = useDrillStore((s) => s.pitch.showNotes === true)
  const notes = useDrillStore((s) => s.pitch.notes ?? '')
  const setPitchNotesLive = useDrillStore((s) => s.setPitchNotesLive)
  const beforeRef = useRef<DrillContent | null>(null)
  const [collapsed, setCollapsedState] = useState(loadCollapsed)
  if (!show) return null

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value)
    try {
      localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0')
    } catch {
      // Only a convenience; the panel simply opens again next time.
    }
  }
  const firstLine = notes.split('\n').find((line) => line.trim() !== '') ?? ''

  return (
    <div className="border-t border-slate-700 bg-slate-900 px-2 py-1">
      <button
        type="button"
        aria-expanded={!collapsed}
        title={collapsed ? 'Notizen aufklappen' : 'Notizen zuklappen'}
        onClick={() => setCollapsed(!collapsed)}
        className="flex min-h-8 w-full items-center gap-2 rounded-md px-1 text-left text-xs font-semibold text-slate-300 hover:bg-slate-800"
      >
        <span aria-hidden className="w-3">{collapsed ? '▸' : '▾'}</span>
        Notizen
        {collapsed && firstLine && <span className="min-w-0 flex-1 truncate font-normal text-slate-400">{firstLine}</span>}
      </button>
      {!collapsed && (
        // Grows up to 30 % of the screen, so the pitch keeps enough room.
        <AutoTextarea
          label="Notizen unter dem Feld"
          minLines={3}
          maxHeightClass="max-h-[30dvh]"
          value={notes}
          maxLength={MAX_NOTES_LENGTH}
          placeholder="Notizen zur Übung oder Taktik …"
          onFocus={() => {
            beforeRef.current = useDrillStore.getState().snapshot()
          }}
          onChange={setPitchNotesLive}
          onBlur={() => {
            const before = beforeRef.current
            beforeRef.current = null
            if (before && (before.pitch.notes ?? '') !== (useDrillStore.getState().pitch.notes ?? '')) {
              useDrillStore.getState().pushHistory(before)
            }
          }}
        />
      )}
    </div>
  )
}
