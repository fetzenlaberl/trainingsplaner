import { useRef } from 'react'
import { ITEM_SIZE_STEP, MAX_ITEM_SIZE, MIN_ITEM_SIZE, PLAYER_SHAPES, ROTATABLE_TYPES } from '../items/palette'
import { ZONE_COLORS } from '../items/zones'
import type { Item, Line, PlayerShape, Zone } from '../model/types'
import {
  currentScene,
  findElement,
  isLine,
  isZone,
  useDrillStore,
  type DrillContent,
} from '../store/drillStore'
import { buttonClass, dangerButtonClass, inputClass } from './ui'

const ROTATE_STEP = 15

const SHAPE_LABELS: Record<PlayerShape, { icon: string; name: string }> = {
  circle: { icon: '●', name: 'Kreis' },
  triangle: { icon: '▲', name: 'Dreieck' },
  cross: { icon: '✕', name: 'Kreuz' },
}

function formatMeters(value: number): string {
  return value.toFixed(1).replace('.', ',').replace(',0', '')
}

/** Actions for the selected item, line or zone, plus duplicate and delete. */
export function SelectionBar() {
  const selected = useDrillStore((s) => findElement(currentScene(s), s.selectedId))
  const insertCopy = useDrillStore((s) => s.insertCopy)
  const deleteElement = useDrillStore((s) => s.deleteElement)

  if (!selected) return null

  return (
    <div role="group" aria-label="Auswahl bearbeiten" className="flex flex-wrap items-center gap-1.5">
      {isZone(selected) ? (
        <ZoneControls zone={selected} />
      ) : isLine(selected) ? (
        <LineControls line={selected} />
      ) : (
        <ItemControls item={selected} />
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

/** Text field that edits live and records one undo step when typing is finished. */
function LabelInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const snapshot = useDrillStore((s) => s.snapshot)
  const pushHistory = useDrillStore((s) => s.pushHistory)
  const beforeRef = useRef<DrillContent | null>(null)

  return (
    <label className="flex items-center gap-1.5 text-sm text-slate-400">
      Beschriftung
      <input
        className={`${inputClass} w-28`}
        value={value}
        placeholder={placeholder}
        maxLength={24}
        onFocus={() => {
          beforeRef.current = snapshot()
        }}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (beforeRef.current) pushHistory(beforeRef.current)
          beforeRef.current = null
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
        }}
      />
    </label>
  )
}

function ItemControls({ item }: { item: Item }) {
  const rotateItem = useDrillStore((s) => s.rotateItem)
  const setItemSize = useDrillStore((s) => s.setItemSize)
  const setAllItemSizes = useDrillStore((s) => s.setAllItemSizes)
  const setItemShape = useDrillStore((s) => s.setItemShape)
  const setItemLabel = useDrillStore((s) => s.setItemLabel)

  return (
    <>
      <div role="group" aria-label="Größe" className="flex items-center gap-1">
        <button
          type="button"
          className={buttonClass}
          title="Kleiner"
          aria-label="Kleiner"
          disabled={item.size <= MIN_ITEM_SIZE}
          onClick={() => setItemSize(item.id, item.size - ITEM_SIZE_STEP)}
        >
          −
        </button>
        <span className="w-12 text-center text-sm text-slate-300 tabular-nums">
          {Math.round(item.size * 100)} %
        </span>
        <button
          type="button"
          className={buttonClass}
          title="Größer"
          aria-label="Größer"
          disabled={item.size >= MAX_ITEM_SIZE}
          onClick={() => setItemSize(item.id, item.size + ITEM_SIZE_STEP)}
        >
          +
        </button>
        <button
          type="button"
          className={buttonClass}
          title="Diese Größe für alle Objekte der aktuellen Szene übernehmen"
          onClick={() => setAllItemSizes(item.size)}
        >
          Auf alle anwenden
        </button>
      </div>

      {item.type === 'player' && (
        <div role="group" aria-label="Form" className="flex gap-1 rounded-lg bg-slate-800 p-1">
          {PLAYER_SHAPES.map((shape) => (
            <button
              key={shape}
              type="button"
              title={SHAPE_LABELS[shape].name}
              aria-label={SHAPE_LABELS[shape].name}
              aria-pressed={item.shape === shape}
              onClick={() => setItemShape(item.id, shape)}
              className={`min-h-8 min-w-8 rounded-md text-sm ${
                item.shape === shape ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {SHAPE_LABELS[shape].icon}
            </button>
          ))}
        </div>
      )}

      {ROTATABLE_TYPES.includes(item.type) && (
        <>
          <button
            type="button"
            className={buttonClass}
            title="Gegen den Uhrzeigersinn drehen"
            onClick={() => rotateItem(item.id, item.rotation - ROTATE_STEP)}
          >
            ⟲ 15°
          </button>
          <button
            type="button"
            className={buttonClass}
            title="Im Uhrzeigersinn drehen"
            onClick={() => rotateItem(item.id, item.rotation + ROTATE_STEP)}
          >
            ⟳ 15°
          </button>
        </>
      )}

      {(item.type === 'player' || item.type === 'text') && (
        <LabelInput value={item.label} onChange={(label) => setItemLabel(item.id, label)} />
      )}
    </>
  )
}

function LineControls({ line }: { line: Line }) {
  const setLineSmooth = useDrillStore((s) => s.setLineSmooth)
  const clearLineBends = useDrillStore((s) => s.clearLineBends)
  if (line.points.length <= 2) return null

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        title={line.smooth ? 'Biegungen als Ecken zeigen' : 'Biegungen als weiche Kurve zeigen'}
        onClick={() => setLineSmooth(line.id, !line.smooth)}
      >
        {line.smooth ? 'Eckig' : 'Rund'}
      </button>
      <button type="button" className={buttonClass} onClick={() => clearLineBends(line.id)}>
        Alle Biegungen entfernen
      </button>
    </>
  )
}

function ZoneControls({ zone }: { zone: Zone }) {
  const updateZone = useDrillStore((s) => s.updateZone)
  const setZoneLabel = useDrillStore((s) => s.setZoneLabel)

  return (
    <>
      <span className="text-sm text-slate-300 tabular-nums" title="Größe der Zone">
        {formatMeters(zone.width)} × {formatMeters(zone.height)} m
      </span>
      <div role="group" aria-label="Farbe der Zone" className="flex items-center gap-1">
        {ZONE_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.name}
            aria-label={c.name}
            aria-pressed={zone.color === c.value}
            onClick={() => updateZone(zone.id, { color: c.value })}
            className={`h-7 w-7 rounded-full border-2 ${
              zone.color === c.value ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-slate-600'
            }`}
            style={{ backgroundColor: c.value }}
          />
        ))}
      </div>
      <button
        type="button"
        className={buttonClass}
        title="Rand umschalten"
        onClick={() => updateZone(zone.id, { dashed: !zone.dashed })}
      >
        {zone.dashed ? 'Rand durchgezogen' : 'Rand gestrichelt'}
      </button>
      <LabelInput value={zone.label} placeholder="z. B. Zone A" onChange={(label) => setZoneLabel(zone.id, label)} />
    </>
  )
}
