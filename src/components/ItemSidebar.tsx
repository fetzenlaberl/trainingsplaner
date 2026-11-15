import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { ITEM_EXTENT, ITEM_TEMPLATES, type ItemTemplate } from '../items/palette'
import { useDrillStore } from '../store/drillStore'
import { ItemPreview } from './ItemPreview'
import type { DropTarget } from './PitchStage'

const ICON_SIZE_PX = 36
const FALLBACK_SCALE = 10

interface DragState {
  template: ItemTemplate
  clientX: number
  clientY: number
  scale: number
}

interface ItemSidebarProps {
  dropTargetRef: RefObject<DropTarget | null>
}

/**
 * Item palette. Uses pointer events instead of HTML5 drag & drop,
 * so dragging works the same with mouse, pen and touch.
 */
export function ItemSidebar({ dropTargetRef }: ItemSidebarProps) {
  const addItem = useDrillStore((s) => s.addItem)
  const [drag, setDrag] = useState<DragState | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => () => cleanupRef.current?.(), [])

  function startDrag(e: ReactPointerEvent, template: ItemTemplate) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    cleanupRef.current?.()

    setDrag({
      template,
      clientX: e.clientX,
      clientY: e.clientY,
      scale: dropTargetRef.current?.scale ?? FALLBACK_SCALE,
    })

    const onMove = (ev: PointerEvent) =>
      setDrag((d) => d && { ...d, clientX: ev.clientX, clientY: ev.clientY })
    const onUp = (ev: PointerEvent) => {
      cleanup()
      const pos = dropTargetRef.current?.toMeters(ev.clientX, ev.clientY)
      if (pos) addItem(template.item, pos.x, pos.y)
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', cleanup)
      cleanupRef.current = null
      setDrag(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', cleanup)
    cleanupRef.current = cleanup
  }

  return (
    <aside className="border-b border-slate-700 bg-slate-900 md:w-28 md:border-r md:border-b-0">
      <ul className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-y-auto">
        {ITEM_TEMPLATES.map((template) => (
          <li key={template.key} className="shrink-0">
            <button
              type="button"
              title={`${template.name} aufs Feld ziehen`}
              onPointerDown={(e) => startDrag(e, template)}
              className="flex w-20 touch-none cursor-grab flex-col items-center gap-1 rounded-md p-1 text-xs text-slate-300 select-none hover:bg-slate-800 md:w-full"
            >
              <span className="pointer-events-none flex h-10 items-center justify-center">
                <ItemPreview
                  item={template.item}
                  scale={ICON_SIZE_PX / ITEM_EXTENT[template.item.type]}
                />
              </span>
              {template.name}
            </button>
          </li>
        ))}
      </ul>

      {drag && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 opacity-80"
          style={{ left: drag.clientX, top: drag.clientY }}
        >
          <ItemPreview item={drag.template.item} scale={drag.scale} />
        </div>
      )}
    </aside>
  )
}
