import { useRef, useState } from 'react'
import {
  ITEM_SIZE_STEP,
  MAX_ITEM_SIZE,
  MIN_ITEM_SIZE,
  PLAYER_SHAPES,
  ROTATABLE_TYPES,
  TEXTBOX_COLORS,
} from '../items/palette'
import { MAX_ZONE_FILL_OPACITY, ZONE_COLORS, ZONE_GOAL_OPTIONS, zoneExtent } from '../items/zones'
import type { Item, Line, PlayerShape, Zone } from '../model/types'
import {
  currentScene,
  findElement,
  isLine,
  isZone,
  useDrillStore,
  type DrillContent,
} from '../store/drillStore'
import { useToolStore } from '../store/toolStore'
import { TextBoxDialog } from './TextBoxDialog'
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
  caption = 'Beschriftung',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  caption?: string
}) {
  const snapshot = useDrillStore((s) => s.snapshot)
  const pushHistory = useDrillStore((s) => s.pushHistory)
  const beforeRef = useRef<DrillContent | null>(null)

  return (
    <label className="flex items-center gap-1.5 text-sm text-slate-400">
      {caption}
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
  const setItemName = useDrillStore((s) => s.setItemName)
  const setItemHighlight = useDrillStore((s) => s.setItemHighlight)
  const setItemColor = useDrillStore((s) => s.setItemColor)
  const [editingText, setEditingText] = useState(false)

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
        <LabelInput
          caption={item.type === 'player' ? 'Nummer' : 'Beschriftung'}
          value={item.label}
          onChange={(label) => setItemLabel(item.id, label)}
        />
      )}

      {item.type === 'player' && (
        <>
          <LabelInput
            caption="Name"
            placeholder="für Aufstellung"
            value={item.name}
            onChange={(name) => setItemName(item.id, name)}
          />
          <button
            type="button"
            aria-pressed={item.highlight}
            title="Leuchtenden Rahmen um den Spieler anzeigen"
            onClick={() => setItemHighlight(item.id, !item.highlight)}
            className={`${buttonClass} ${item.highlight ? 'bg-yellow-500 text-slate-900 hover:bg-yellow-400' : ''}`}
          >
            ✦ Hervorheben
          </button>
        </>
      )}

      {item.type === 'textbox' && (
        <>
          <ColorSwatches
            label="Hintergrund"
            colors={TEXTBOX_COLORS}
            value={item.color}
            onSelect={(color) => setItemColor(item.id, color)}
          />
          <button type="button" className={buttonClass} onClick={() => setEditingText(true)}>
            Text bearbeiten
          </button>
          {editingText && <TextBoxDialog itemId={item.id} onClose={() => setEditingText(false)} />}
        </>
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

function ColorSwatches({
  label,
  colors,
  value,
  onSelect,
}: {
  label: string
  colors: { value: string; name: string }[]
  value: string
  onSelect: (color: string) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1">
      <span className="text-sm text-slate-400">{label}</span>
      {colors.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.name}
          aria-label={`${label}: ${c.name}`}
          aria-pressed={value === c.value}
          onClick={() => onSelect(c.value)}
          className={`h-7 w-7 rounded-full border-2 ${
            value === c.value ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-slate-600'
          }`}
          style={{ backgroundColor: c.value }}
        />
      ))}
    </div>
  )
}

/** Opacity slider: moves live, one undo step per drag. */
function OpacitySlider({ zone }: { zone: Zone }) {
  const setZoneLive = useDrillStore((s) => s.setZoneLive)
  const snapshot = useDrillStore((s) => s.snapshot)
  const pushHistory = useDrillStore((s) => s.pushHistory)
  const beforeRef = useRef<DrillContent | null>(null)
  const begin = () => {
    beforeRef.current ??= snapshot()
  }
  const finish = () => {
    if (beforeRef.current) pushHistory(beforeRef.current)
    beforeRef.current = null
  }

  return (
    <label className="flex items-center gap-1.5 text-sm text-slate-400">
      Deckkraft
      <input
        type="range"
        className="w-24 accent-emerald-500"
        min={0}
        max={MAX_ZONE_FILL_OPACITY}
        step={0.05}
        value={zone.fillOpacity}
        onPointerDown={begin}
        onKeyDown={begin}
        onChange={(e) => {
          begin()
          setZoneLive(zone.id, { fillOpacity: Number(e.target.value) })
        }}
        onPointerUp={finish}
        onKeyUp={finish}
        onBlur={finish}
      />
      <span className="w-9 text-right tabular-nums">{Math.round(zone.fillOpacity * 100)} %</span>
    </label>
  )
}

function ZoneControls({ zone }: { zone: Zone }) {
  const updateZone = useDrillStore((s) => s.updateZone)
  const setZoneLive = useDrillStore((s) => s.setZoneLive)
  const editingCornersId = useToolStore((s) => s.editingCornersId)
  const setEditingCornersId = useToolStore((s) => s.setEditingCornersId)
  const editingCorners = editingCornersId === zone.id
  const extent = zoneExtent(zone)

  return (
    <>
      <span className="text-sm text-slate-300 tabular-nums" title="Größe der Zone">
        {formatMeters(extent.width)} × {formatMeters(extent.height)} m
      </span>
      {zone.shape !== 'ellipse' && (
        <>
          <button
            type="button"
            aria-pressed={editingCorners}
            title="Ecken einzeln verschieben, z. B. für Raute oder Trapez"
            onClick={() => setEditingCornersId(editingCorners ? null : zone.id)}
            className={`${buttonClass} ${editingCorners ? 'bg-emerald-600 text-white hover:bg-emerald-500' : ''}`}
          >
            {editingCorners ? 'Ecken fertig' : 'Ecken bearbeiten'}
          </button>
          {zone.corners && (
            <button type="button" className={buttonClass} onClick={() => updateZone(zone.id, { corners: null })}>
              Ecken zurücksetzen
            </button>
          )}
        </>
      )}
      <ColorSwatches
        label="Füllung"
        colors={ZONE_COLORS}
        value={zone.fillColor}
        onSelect={(fillColor) => updateZone(zone.id, { fillColor })}
      />
      <OpacitySlider zone={zone} />
      <ColorSwatches
        label="Rand"
        colors={ZONE_COLORS}
        value={zone.color}
        onSelect={(color) => updateZone(zone.id, { color })}
      />
      <button
        type="button"
        className={buttonClass}
        title="Rand umschalten"
        onClick={() => updateZone(zone.id, { dashed: !zone.dashed })}
      >
        {zone.dashed ? 'Rand durchgezogen' : 'Rand gestrichelt'}
      </button>
      {zone.shape === 'rect' && (
        <div role="group" aria-label="Minitore" className="flex items-center gap-1">
          <span className="text-sm text-slate-400">Tore</span>
          {ZONE_GOAL_OPTIONS.map((goals) => (
            <button
              key={goals}
              type="button"
              aria-pressed={zone.goals === goals}
              onClick={() => updateZone(zone.id, { goals })}
              className={`min-h-8 min-w-8 rounded-md px-2 text-sm ${
                zone.goals === goals ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {goals}
            </button>
          ))}
        </div>
      )}
      <LabelInput value={zone.label} placeholder="z. B. Zone A" onChange={(label) => setZoneLive(zone.id, { label })} />
    </>
  )
}
