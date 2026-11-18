import { useRef } from 'react'
import { ITEM_SIZE_STEP, MAX_ITEM_SIZE, MIN_ITEM_SIZE, ROTATABLE_TYPES } from '../items/palette'
import { currentScene, findElement, isLine, useDrillStore, type DrillContent } from '../store/drillStore'
import { buttonClass, dangerButtonClass, inputClass } from './ui'

const ROTATE_STEP = 15

/** Actions for the selected item or line: size, rotate, label, bends, duplicate, delete. */
export function SelectionBar() {
  const selected = useDrillStore((s) => findElement(currentScene(s), s.selectedId))
  const rotateItem = useDrillStore((s) => s.rotateItem)
  const setItemSize = useDrillStore((s) => s.setItemSize)
  const setAllItemSizes = useDrillStore((s) => s.setAllItemSizes)
  const setItemLabel = useDrillStore((s) => s.setItemLabel)
  const setLineSmooth = useDrillStore((s) => s.setLineSmooth)
  const clearLineBends = useDrillStore((s) => s.clearLineBends)
  const insertCopy = useDrillStore((s) => s.insertCopy)
  const deleteElement = useDrillStore((s) => s.deleteElement)
  const snapshot = useDrillStore((s) => s.snapshot)
  const pushHistory = useDrillStore((s) => s.pushHistory)
  const labelBeforeRef = useRef<DrillContent | null>(null)

  if (!selected) return null

  return (
    <div role="group" aria-label="Auswahl bearbeiten" className="flex flex-wrap items-center gap-1.5">
      {!isLine(selected) && (
        <div role="group" aria-label="Größe" className="flex items-center gap-1">
          <button
            type="button"
            className={buttonClass}
            title="Kleiner"
            aria-label="Kleiner"
            disabled={selected.size <= MIN_ITEM_SIZE}
            onClick={() => setItemSize(selected.id, selected.size - ITEM_SIZE_STEP)}
          >
            −
          </button>
          <span className="w-12 text-center text-sm text-slate-300 tabular-nums">
            {Math.round(selected.size * 100)} %
          </span>
          <button
            type="button"
            className={buttonClass}
            title="Größer"
            aria-label="Größer"
            disabled={selected.size >= MAX_ITEM_SIZE}
            onClick={() => setItemSize(selected.id, selected.size + ITEM_SIZE_STEP)}
          >
            +
          </button>
          <button
            type="button"
            className={buttonClass}
            title="Diese Größe für alle Objekte der aktuellen Szene übernehmen"
            onClick={() => setAllItemSizes(selected.size)}
          >
            Auf alle anwenden
          </button>
        </div>
      )}

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

      {isLine(selected) && selected.points.length > 2 && (
        <>
          <button
            type="button"
            className={buttonClass}
            title={selected.smooth ? 'Biegungen als Ecken zeigen' : 'Biegungen als weiche Kurve zeigen'}
            onClick={() => setLineSmooth(selected.id, !selected.smooth)}
          >
            {selected.smooth ? 'Eckig' : 'Rund'}
          </button>
          <button type="button" className={buttonClass} onClick={() => clearLineBends(selected.id)}>
            Alle Biegungen entfernen
          </button>
        </>
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
