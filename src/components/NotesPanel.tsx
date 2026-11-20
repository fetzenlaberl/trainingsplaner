import { useRef } from 'react'
import { MAX_NOTES_LENGTH } from '../field/pitchStyle'
import { useDrillStore, type DrillContent } from '../store/drillStore'
import { inputClass } from './ui'

/**
 * Notes below the pitch (switched on in the "Feld" menu). Belongs to the drill and is
 * printed below the field in the PNG and PDF export. One undo step per editing session.
 */
export function NotesPanel() {
  const show = useDrillStore((s) => s.pitch.showNotes === true)
  const notes = useDrillStore((s) => s.pitch.notes ?? '')
  const setPitchNotesLive = useDrillStore((s) => s.setPitchNotesLive)
  const beforeRef = useRef<DrillContent | null>(null)
  if (!show) return null
  return (
    <div className="border-t border-slate-700 bg-slate-900 p-2">
      <textarea
        aria-label="Notizen unter dem Feld"
        className={`${inputClass} block h-20 w-full resize-y py-2`}
        value={notes}
        maxLength={MAX_NOTES_LENGTH}
        placeholder="Notizen zur Übung oder Taktik …"
        onFocus={() => {
          beforeRef.current = useDrillStore.getState().snapshot()
        }}
        onChange={(e) => setPitchNotesLive(e.target.value)}
        onBlur={() => {
          const before = beforeRef.current
          beforeRef.current = null
          if (before && (before.pitch.notes ?? '') !== (useDrillStore.getState().pitch.notes ?? '')) {
            useDrillStore.getState().pushHistory(before)
          }
        }}
      />
    </div>
  )
}
