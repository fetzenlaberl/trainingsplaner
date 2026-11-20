import { useEffect, useRef, useState } from 'react'
import { useDrillStore } from '../store/drillStore'
import { useToolStore } from '../store/toolStore'
import { TrashIcon } from './TrashIcon'
import { isOverTrash, registerTrashBin, trackPointer } from './trashDrop'

/**
 * Trash bin in the corner of the pitch: drag objects, lines or zones onto it to delete
 * them, or tap it to delete the current selection. Not part of exports (HTML, not canvas).
 */
export function TrashBin() {
  const ref = useRef<HTMLButtonElement>(null)
  const dragging = useToolStore((s) => s.draggingId !== null)
  const selectedCount = useDrillStore((s) => s.selectedIds.length)
  const [over, setOver] = useState(false)

  useEffect(() => {
    registerTrashBin(ref.current)
    const onMove = (e: PointerEvent) => {
      trackPointer(e.clientX, e.clientY)
      if (useToolStore.getState().draggingId !== null) setOver(isOverTrash(e.clientX, e.clientY))
    }
    window.addEventListener('pointermove', onMove, true)
    window.addEventListener('pointerdown', onMove, true)
    return () => {
      registerTrashBin(null)
      window.removeEventListener('pointermove', onMove, true)
      window.removeEventListener('pointerdown', onMove, true)
    }
  }, [])

  useEffect(() => {
    if (!dragging) setOver(false)
  }, [dragging])

  const active = dragging && over
  return (
    <button
      ref={ref}
      type="button"
      title={selectedCount > 0 ? 'Auswahl löschen (oder Objekt hierher ziehen)' : 'Objekt hierher ziehen zum Löschen'}
      aria-label="Papierkorb"
      disabled={selectedCount === 0 && !dragging}
      onClick={() => {
        const { selectedIds, deleteElements } = useDrillStore.getState()
        if (selectedIds.length > 0) deleteElements(selectedIds)
      }}
      className={`absolute bottom-3 left-3 flex h-12 w-12 items-center justify-center rounded-lg shadow-lg transition-transform ${
        active
          ? 'scale-125 bg-red-600 text-white'
          : dragging
            ? 'bg-slate-900/90 text-red-300 ring-2 ring-red-400/70'
            : 'bg-slate-900/85 text-slate-200 hover:bg-slate-700 disabled:text-slate-500 disabled:hover:bg-slate-900/85'
      }`}
    >
      <TrashIcon className="h-6 w-6" />
    </button>
  )
}
