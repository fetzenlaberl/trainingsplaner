import { useRef } from 'react'
import { ROTATABLE_TYPES } from '../items/palette'
import { findElement, isLine, useDrillStore, type DrillContent } from '../store/drillStore'
import { buttonClass, dangerButtonClass, inputClass } from './ui'

const ROTATE_STEP = 15

/** Actions for the selected item or line: rotate, label, straighten, duplicate, delete. */
export function SelectionBar() {
  const selected = useDrillStore((s) => findElement(s, s.selectedId))
  const rotateItem = useDrillStore((s) => s.rotateItem)
  const setItemLabel = useDrillStore((s) => s.setItemLabel)
  const setLineControl = useDrillStore((s) => s.setLineControl)
  const insertCopy = useDrillStore((s) => s.insertCopy)
  const deleteElement = useDrillStore((s) => s.deleteElement)
  const snapshot = useDrillStore((s) => s.snapshot)
  const pushHistory = useDrillStore((s) => s.pushHistory)
  const labelBeforeRef = useRef<DrillContent | null>(null)

  if (!selected) return null

  const straighten = (id: string) => {
    const before = snapshot()
    setLineControl(id, null)
    pushHistory(before)
  }

  return (
    <div role="group" aria-label="Auswahl bearbeiten" className="flex flex-wrap items-center gap-1.5">
      {!isLine(selected) && ROTATABLE_TYPES.includes(selected.type) && (
        <>
          <button
            type="button"
            className={buttonClass}
            title="Gegen den Uhrzeigersinn drehen"
            onClick={() => rotateItem(selected.id, selected.rotation - ROTATE_STEP)}
          >
            ⟲ 15°
          </button>
          <button
            type="button"
            className={buttonClass}
            title="Im Uhrzeigersinn drehen"
            onClick={() => rotateItem(selected.id, selected.rotation + ROTATE_STEP)}
          >
            ⟳ 15°
          </button>
        </>
      )}

      {!isLine(selected) && (selected.type === 'player' || selected.type === 'text') && (
        <label className="flex items-center gap-1.5 text-sm text-slate-400">
          Beschriftung
          <input
            className={`${inputClass} w-28`}
            value={selected.label}
            maxLength={24}
            onFocus={() => {
              labelBeforeRef.current = snapshot()
            }}
            onChange={(e) => setItemLabel(selected.id, e.target.value)}
            onBlur={() => {
              if (labelBeforeRef.current) pushHistory(labelBeforeRef.current)
              labelBeforeRef.current = null
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
            }}
          />
        </label>
      )}

      {isLine(selected) && selected.control && (
        <button type="button" className={buttonClass} onClick={() => straighten(selected.id)}>
          Gerade machen
        </button>
      )}

      <button
        type="button"
        className={buttonClass}
        title="Duplizieren (Strg+D)"
        onClick={() => insertCopy(selected)}
      >
        Duplizieren
      </button>
      <button
        type="button"
        className={dangerButtonClass}
        title="Löschen (Entf)"
        onClick={() => deleteElement(selected.id)}
      >
        Löschen
      </button>
    </div>
  )
}
