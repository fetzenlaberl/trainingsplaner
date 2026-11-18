import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { ITEM_EXTENT, ITEM_TEMPLATES, type ItemTemplate } from '../items/palette'
import { ZONE_TEMPLATES, type ZoneTemplate } from '../items/zones'
import { useDrillStore } from '../store/drillStore'
import { usePlaybackStore } from '../store/playbackStore'
import { useToolStore } from '../store/toolStore'
import { ItemPreview } from './ItemPreview'
import { ZonePreview } from './ZonePreview'
import type { DropTarget } from './PitchStage'

const ICON_SIZE_PX = 36
const ZONE_ICON_SIZE_PX = 34
const FALLBACK_SCALE = 10

type Template = { kind: 'item'; template: ItemTemplate } | { kind: 'zone'; template: ZoneTemplate }

interface DragState {
  dragged: Template
  clientX: number
  clientY: number
  scale: number
}

interface ItemSidebarProps {
  dropTargetRef: RefObject<DropTarget | null>
}

/**
 * Palette of items and zones. Uses pointer events instead of HTML5 drag & drop,
 * so dragging works the same with mouse, pen and touch.
 */
export function ItemSidebar({ dropTargetRef }: ItemSidebarProps) {
  const addItem = useDrillStore((s) => s.addItem)
  const addZone = useDrillStore((s) => s.addZone)
  const select = useDrillStore((s) => s.select)
  const setTool = useToolStore((s) => s.setTool)
  const [drag, setDrag] = useState<DragState | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => () => cleanupRef.current?.(), [])

  function startDrag(e: ReactPointerEvent, dragged: Template) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    cleanupRef.current?.()

    setDrag({
      dragged,
      clientX: e.clientX,
      clientY: e.clientY,
      scale: dropTargetRef.current?.scale ?? FALLBACK_SCALE,
    })

    const onMove = (ev: PointerEvent) =>
      setDrag((d) => d && { ...d, clientX: ev.clientX, clientY: ev.clientY })
    const onUp = (ev: PointerEvent) => {
      cleanup()
      const pos = dropTargetRef.current?.toMeters(ev.clientX, ev.clientY)
      if (!pos) return
      usePlaybackStore.getState().stop()
      // Switch to the select tool so the new item can be adjusted right away.
      setTool('select')
      select(
        dragged.kind === 'item'
          ? addItem(dragged.template.item, pos.x, pos.y)
          : addZone(dragged.template, pos.x, pos.y),
      )
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
              onPointerDown={(e) => startDrag(e, { kind: 'item', template })}
              className="flex w-20 touch-none cursor-grab flex-col items-center gap-1 rounded-md p-1 text-xs text-slate-300 select-none hover:bg-slate-800 md:w-full"
            >
              <span className="pointer-events-none flex h-10 items-center justify-center">
                <ItemPreview
                  item={template.item}
                  scale={ICON_SIZE_PX / (ITEM_EXTENT[template.item.type] * (template.item.size ?? 1))}
                />
              </span>
              {template.name}
            </button>
          </li>
        ))}
        <li className="flex shrink-0 items-center px-1 text-xs font-semibold tracking-wide text-slate-500 uppercase md:pt-2">
          Zonen
        </li>
        {ZONE_TEMPLATES.map((template) => (
          <li key={template.key} className="shrink-0">
            <button
              type="button"
              title={`Zone ${template.name} aufs Feld ziehen`}
              onPointerDown={(e) => startDrag(e, { kind: 'zone', template })}
              className="flex w-20 touch-none cursor-grab flex-col items-center gap-1 rounded-md p-1 text-xs text-slate-300 select-none hover:bg-slate-800 md:w-full"
            >
              <span className="pointer-events-none flex h-10 items-center justify-center">
                <ZonePreview template={template} scale={ZONE_ICON_SIZE_PX / Math.max(template.width, template.height)} />
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
          {drag.dragged.kind === 'item' ? (
            <ItemPreview item={drag.dragged.template.item} scale={drag.scale} />
          ) : (
            <ZonePreview template={drag.dragged.template} scale={drag.scale} />
          )}
        </div>
      )}
    </aside>
  )
}
