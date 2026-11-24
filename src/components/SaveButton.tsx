import { buttonClass } from './ui'

/**
 * Save button for the phone: green "Speichern" while there are unsaved changes, "…" while
 * saving, otherwise "✓ Gespeichert" (or only ✓ when `compact`). A tap always saves at once.
 */
export function SaveButton({
  dirty,
  saving,
  onSave,
  savedTitle = 'Gespeichert',
  compact = false,
}: {
  dirty: boolean
  saving: boolean
  onSave: () => void
  savedTitle?: string
  compact?: boolean
}) {
  return (
    <button
      type="button"
      className={dirty ? buttonClass.replace('bg-slate-800', 'bg-emerald-700').replace('hover:bg-slate-700', 'hover:bg-emerald-600') : buttonClass}
      disabled={saving}
      title={dirty ? 'Änderungen jetzt speichern' : `${savedTitle} – antippen speichert noch einmal`}
      aria-label={dirty ? 'Speichern' : savedTitle}
      onClick={onSave}
    >
      {saving ? '…' : dirty ? 'Speichern' : compact ? '✓' : '✓ Gespeichert'}
    </button>
  )
}
