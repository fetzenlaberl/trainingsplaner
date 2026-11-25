import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useCloseOnEscape } from '../hooks/useCloseOnEscape'
import { BALL_STYLES, COLORABLE_TYPES, ITEM_SIZE_STEP, MAX_ITEM_SIZE, MIN_ITEM_SIZE, PLAYER_COLORS } from '../items/palette'
import { currentScene, isLine, isZone, useDrillStore } from '../store/drillStore'
import { useToolStore } from '../store/toolStore'
import { ColorSwatches, LabelInput } from './controls'
import { buttonClass, dangerButtonClass } from './ui'

const MENU_WIDTH = 280

/** Small menu next to an item (right click or long press) with its most used actions. */
export function QuickMenu() {
  const menu = useToolStore((s) => s.quickMenu)
  const setQuickMenu = useToolStore((s) => s.setQuickMenu)
  const item = useDrillStore((s) => {
    const found = menu ? currentScene(s).items.find((i) => i.id === menu.itemId) : undefined
    return found && !isLine(found) && !isZone(found) ? found : undefined
  })
  const setItemLabel = useDrillStore((s) => s.setItemLabel)
  const setItemName = useDrillStore((s) => s.setItemName)
  const setItemColor = useDrillStore((s) => s.setItemColor)
  const setItemHighlight = useDrillStore((s) => s.setItemHighlight)
  const setItemSize = useDrillStore((s) => s.setItemSize)
  const insertCopy = useDrillStore((s) => s.insertCopy)
  const deleteElement = useDrillStore((s) => s.deleteElement)
  const ref = useRef<HTMLDivElement>(null)

  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    setHeight(ref.current?.offsetHeight ?? 0)
  }, [menu, item?.type])

  useCloseOnEscape(menu !== null, () => setQuickMenu(null))

  // Close on a click or tap elsewhere.
  useEffect(() => {
    if (!menu) return
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setQuickMenu(null)
    }
    // Registered after the current event, so the opening tap does not close it again.
    const id = window.setTimeout(() => {
      window.addEventListener('pointerdown', onPointerDown)
    })
    return () => {
      window.clearTimeout(id)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [menu, setQuickMenu])

  if (!menu || !item) return null

  // Keep the menu on screen.
  const left = Math.min(menu.x + 12, window.innerWidth - MENU_WIDTH - 8)
  const top = Math.min(menu.y + 12, window.innerHeight - height - 8)
  const close = () => setQuickMenu(null)

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label="Schnellmenü"
      className="fixed z-50 flex max-h-[calc(100dvh-1rem)] flex-col gap-2 overflow-y-auto rounded-xl border border-slate-600 bg-slate-900/95 p-3 shadow-2xl"
      style={{ left: Math.max(8, left), top: Math.max(8, top), width: MENU_WIDTH }}
    >
      {item.type === 'coach' && (
        <LabelInput caption="Kürzel" value={item.label} onChange={(label) => setItemLabel(item.id, label)} />
      )}
      {item.type === 'player' && (
        <>
          <LabelInput caption="Nummer" value={item.label} onChange={(label) => setItemLabel(item.id, label)} />
          <LabelInput caption="Name" placeholder="für Aufstellung" value={item.name} onChange={(name) => setItemName(item.id, name)} />
        </>
      )}
      {item.type === 'ball' && (
        <div className="flex flex-wrap items-center gap-1">
          <ColorSwatches label="Ball" colors={BALL_STYLES} value={item.color} onSelect={(color) => setItemColor(item.id, color)} />
        </div>
      )}
      {COLORABLE_TYPES.includes(item.type) && (
        <div className="flex flex-wrap items-center gap-1">
          <ColorSwatches label="Farbe" colors={PLAYER_COLORS} value={item.color} onSelect={(color) => setItemColor(item.id, color)} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm text-slate-400">Größe</span>
        <button
          type="button"
          className={buttonClass}
          aria-label="Kleiner"
          disabled={item.size <= MIN_ITEM_SIZE}
          onClick={() => setItemSize(item.id, item.size - ITEM_SIZE_STEP)}
        >
          −
        </button>
        <span className="w-12 text-center text-sm text-slate-300 tabular-nums">{Math.round(item.size * 100)} %</span>
        <button
          type="button"
          className={buttonClass}
          aria-label="Größer"
          disabled={item.size >= MAX_ITEM_SIZE}
          onClick={() => setItemSize(item.id, item.size + ITEM_SIZE_STEP)}
        >
          +
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {item.type === 'player' && (
          <button
            type="button"
            aria-pressed={item.highlight}
            onClick={() => setItemHighlight(item.id, !item.highlight)}
            className={`${buttonClass} ${item.highlight ? 'bg-yellow-500 text-slate-900 hover:bg-yellow-400' : ''}`}
          >
            ✦ Hervorheben
          </button>
        )}
        <button
          type="button"
          className={buttonClass}
          onClick={() => {
            insertCopy(item)
            close()
          }}
        >
          Duplizieren
        </button>
        <button
          type="button"
          className={dangerButtonClass}
          onClick={() => {
            deleteElement(item.id)
            close()
          }}
        >
          Löschen
        </button>
      </div>
    </div>
  )
}
