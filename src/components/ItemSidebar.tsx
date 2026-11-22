import { noteOrigin, withRememberedStyle } from '../items/rememberedStyle'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { ITEM_EXTENT, ITEM_TEMPLATES, type ItemTemplate } from '../items/palette'
import { ZONE_TEMPLATES, type ZoneTemplate } from '../items/zones'
import { useDrillStore } from '../store/drillStore'
import { usePlaybackStore } from '../store/playbackStore'
import { useToolStore } from '../store/toolStore'
import { CollapseButton } from './CollapseControls'
import { ItemPreview } from './ItemPreview'
import { SquadPanel } from './SquadPanel'
import { ZonePreview } from './ZonePreview'
import type { DropTarget } from './PitchStage'

const ICON_SIZE_PX = 36
const ZONE_ICON_SIZE_PX = 34
const FALLBACK_SCALE = 10
/** Touch: holding still this long, or moving across the list, picks the object up. */
const PICK_UP_MS = 300
const MOVE_THRESHOLD = 8

type Template = { kind: 'item'; template: ItemTemplate } | { kind: 'zone'; template: ZoneTemplate }

interface DragState {
  dragged: Template
  clientX: number
  clientY: number
  scale: number
  rotation: number
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
  const [mode, setMode] = useState<'items' | 'squad'>('items')
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => () => cleanupRef.current?.(), [])

  /**
   * Mouse: dragging starts at once. Touch and pen: moving along the list scrolls it;
   * moving across it (towards the pitch) or holding still for a moment picks the object up.
   */
  function startDrag(e: ReactPointerEvent, dragged: Template, verticalOnly = false) {
    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return
      e.preventDefault()
      beginDrag(dragged, e.clientX, e.clientY)
      return
    }
    cleanupRef.current?.()
    const startX = e.clientX
    const startY = e.clientY
    // The list scrolls vertically on wide screens (sidebar) and horizontally on narrow ones.
    const verticalList = verticalOnly || window.matchMedia('(min-width: 768px)').matches
    let picked = false
    const pickUp = (x: number, y: number) => {
      if (picked) return
      picked = true
      cancelPending()
      beginDrag(dragged, x, y)
    }
    const timer = window.setTimeout(() => pickUp(startX, startY), PICK_UP_MS)
    const onMove = (ev: PointerEvent) => {
      const along = Math.abs(verticalList ? ev.clientY - startY : ev.clientX - startX)
      const across = Math.abs(verticalList ? ev.clientX - startX : ev.clientY - startY)
      if (across > MOVE_THRESHOLD && across > along) pickUp(ev.clientX, ev.clientY)
      else if (along > MOVE_THRESHOLD) cancelPending() // the list is being scrolled
    }
    const cancelPending = () => {
      window.clearTimeout(timer)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', cancelPending)
      window.removeEventListener('pointercancel', cancelPending)
      if (cleanupRef.current === cancelPending) cleanupRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', cancelPending)
    window.addEventListener('pointercancel', cancelPending)
    cleanupRef.current = cancelPending
  }

  function beginDrag(dragged: Template, clientX: number, clientY: number) {
    cleanupRef.current?.()

    setDrag({
      dragged,
      clientX,
      clientY,
      scale: dropTargetRef.current?.scale ?? FALLBACK_SCALE,
      rotation: dropTargetRef.current?.rotation ?? 0,
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
      let id: string
      if (dragged.kind === 'item') {
        id = addItem(withRememberedStyle(dragged.template), pos.x, pos.y)
        noteOrigin(id, dragged.template.key)
      } else {
        id = addZone(dragged.template, pos.x, pos.y)
      }
      select(id)
      // A new text asks for its words, a crest for its picture, right away.
      if (dragged.kind === 'item' && ['text', 'textbox', 'crest'].includes(dragged.template.item.type)) {
        useToolStore.getState().setEditingContentId(id)
      }
    }
    // While an object is carried, a finger must not scroll the page or the list.
    const blockScroll = (ev: TouchEvent) => ev.preventDefault()
    const cleanup = () => {
      window.removeEventListener('touchmove', blockScroll)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', cleanup)
      cleanupRef.current = null
      setDrag(null)
    }

    window.addEventListener('touchmove', blockScroll, { passive: false })
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', cleanup)
    cleanupRef.current = cleanup
  }

  return (
    <aside
      className={`flex flex-col border-b border-slate-700 bg-slate-900 md:border-r md:border-b-0 ${mode === 'squad' ? 'md:w-56' : 'md:w-36'}`}
    >
      <div role="tablist" aria-label="Seitenleiste" className="flex gap-1 p-2 pb-0">
        {([
          ['items', 'Objekte'],
          ['squad', 'Kader'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={`flex-1 rounded-md px-2 py-1 text-xs font-semibold ${
              mode === key ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {label}
          </button>
        ))}
        <CollapseButton bar="sidebar" label="Objektleiste" className="h-auto w-7" />
      </div>
      {mode === 'squad' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SquadPanel onStartDrag={(e, template) => startDrag(e, { kind: 'item', template }, true)} />
        </div>
      ) : (
        <ul className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-y-auto">
          {ITEM_TEMPLATES.map((template) => (
            <li key={template.key} className="shrink-0">
              <button
                type="button"
                title={`${template.name} aufs Feld ziehen`}
                onPointerDown={(e) => startDrag(e, { kind: 'item', template })}
                className="flex w-20 cursor-grab touch-pan-x md:touch-pan-y flex-col items-center gap-1 rounded-md p-1 text-center text-xs leading-tight text-slate-300 select-none hover:bg-slate-800 md:w-full"
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
                className="flex w-20 cursor-grab touch-pan-x md:touch-pan-y flex-col items-center gap-1 rounded-md p-1 text-center text-xs leading-tight text-slate-300 select-none hover:bg-slate-800 md:w-full"
              >
                <span className="pointer-events-none flex h-10 items-center justify-center">
                  <ZonePreview template={template} scale={ZONE_ICON_SIZE_PX / Math.max(template.width, template.height)} />
                </span>
                {template.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {drag && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-1/2 opacity-80"
          // The preview turns with the field, so it looks like the object will after dropping.
          style={{ left: drag.clientX, top: drag.clientY, rotate: `${drag.rotation}deg` }}
        >
          {drag.dragged.kind === 'item' ? (
            <ItemPreview item={withRememberedStyle(drag.dragged.template)} scale={drag.scale} />
          ) : (
            <ZonePreview template={drag.dragged.template} scale={drag.scale} />
          )}
        </div>
      )}
    </aside>
  )
}
