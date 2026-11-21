import { FIGURE_POSE_NAMES, FIGURE_POSE_ORDER } from './PlayerFigures'
import { useRef } from 'react'
import { isFreehand } from '../lines/freehand'
import { BALL_STYLES,
  ITEM_SIZE_STEP,
  MAX_ITEM_SIZE,
  MIN_ITEM_SIZE,
  COLORABLE_TYPES,
  PLAYER_COLORS,
  PLAYER_SHAPES,
  ROTATABLE_TYPES,
  TEXTBOX_COLORS,
} from '../items/palette'
import {
  MAX_POLYGON_CORNERS,
  MAX_ZONE_FILL_OPACITY,
  MIN_POLYGON_CORNERS,
  regularPolygon,
  ZONE_COLORS,
  ZONE_GOAL_OPTIONS,
  zoneCorners,
  zoneExtent,
} from '../items/zones'
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
import { nextStep } from '../lines/steps'
import { LineStylePicker } from './LineStylePicker'
import { ColorSwatches, LabelInput } from './controls'
import { buttonClass, dangerButtonClass } from './ui'

const ROTATE_STEP = 15

const SHAPE_LABELS: Record<PlayerShape, { icon: string; name: string }> = {
  circle: { icon: '●', name: 'Kreis' },
  triangle: { icon: '▲', name: 'Dreieck' },
  cross: { icon: '✕', name: 'Kreuz' },
  shirt: { icon: '👕', name: 'Trikot' },
}

function formatMeters(value: number): string {
  return value.toFixed(1).replace('.', ',').replace(',0', '')
}

/** Actions for the selected item, line or zone, plus duplicate and delete. */
export function SelectionBar() {
  const selected = useDrillStore((s) => findElement(currentScene(s), s.selectedId))
  const selectedCount = useDrillStore((s) => s.selectedIds.length)
  const insertCopy = useDrillStore((s) => s.insertCopy)
  const deleteElement = useDrillStore((s) => s.deleteElement)

  if (selectedCount > 1) return <MultiControls />
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

/** Actions for several selected elements at once. */
function MultiControls() {
  const selectedIds = useDrillStore((s) => s.selectedIds)
  const scene = useDrillStore((s) => currentScene(s))
  const insertCopies = useDrillStore((s) => s.insertCopies)
  const deleteElements = useDrillStore((s) => s.deleteElements)
  const resizeItems = useDrillStore((s) => s.resizeItems)
  const setItemsColor = useDrillStore((s) => s.setItemsColor)
  const select = useDrillStore((s) => s.select)
  const elements = selectedIds.map((id) => findElement(scene, id)).filter((el) => el !== undefined)
  const items = elements.filter((el): el is Item => !isLine(el) && !isZone(el))
  const colorable = items.filter((i) => COLORABLE_TYPES.includes(i.type))

  return (
    <div role="group" aria-label="Mehrere bearbeiten" className="flex flex-wrap items-center gap-1.5">
      <span className="rounded-md bg-sky-500/20 px-2 py-1 text-sm font-semibold text-sky-200">
        {selectedIds.length} ausgewählt
      </span>
      {items.length > 0 && (
        <div role="group" aria-label="Größe" className="flex items-center gap-1">
          <span className="text-sm text-slate-400">Größe</span>
          <button
            type="button"
            className={buttonClass}
            aria-label="Alle kleiner"
            onClick={() => resizeItems(items.map((i) => i.id), -ITEM_SIZE_STEP)}
          >
            −
          </button>
          <button
            type="button"
            className={buttonClass}
            aria-label="Alle größer"
            onClick={() => resizeItems(items.map((i) => i.id), ITEM_SIZE_STEP)}
          >
            +
          </button>
        </div>
      )}
      {colorable.length > 0 && (
        <ColorSwatches
          label="Farbe"
          colors={PLAYER_COLORS}
          value={colorable.every((i) => i.color === colorable[0].color) ? colorable[0].color : ''}
          onSelect={(color) => setItemsColor(colorable.map((i) => i.id), color)}
        />
      )}
      <button type="button" className={buttonClass} title="Duplizieren (Strg+D)" onClick={() => insertCopies(elements)}>
        Duplizieren
      </button>
      <button
        type="button"
        className={dangerButtonClass}
        title="Löschen (Entf)"
        onClick={() => deleteElements(selectedIds)}
      >
        Löschen
      </button>
      <button type="button" className={buttonClass} title="Auswahl aufheben (Esc)" onClick={() => select(null)}>
        Aufheben
      </button>
    </div>
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
  const setItemFacing = useDrillStore((s) => s.setItemFacing)
  const setItemColor = useDrillStore((s) => s.setItemColor)

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

      {item.type === 'ball' && (
        <ColorSwatches label="Ball" colors={BALL_STYLES} value={item.color} onSelect={(color) => setItemColor(item.id, color)} />
      )}
      {COLORABLE_TYPES.includes(item.type) && (
        <ColorSwatches
          label="Farbe"
          colors={PLAYER_COLORS}
          value={item.color}
          onSelect={(color) => setItemColor(item.id, color)}
        />
      )}

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

      {item.type === 'figure' && (
        <div role="group" aria-label="Haltung" className="flex flex-wrap gap-1 rounded-lg bg-slate-800 p-1">
          {FIGURE_POSE_ORDER.map((pose) => (
            <button
              key={pose}
              type="button"
              aria-pressed={(item.pose ?? 'stand') === pose}
              onClick={() => useDrillStore.getState().setItemPose(item.id, pose)}
              className={`min-h-8 rounded-md px-2 text-sm ${
                (item.pose ?? 'stand') === pose ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {FIGURE_POSE_NAMES[pose]}
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

      {(item.type === 'player' || item.type === 'figure' || item.type === 'text' || item.type === 'coach') && (
        <LabelInput
          caption={item.type === 'player' || item.type === 'figure' ? 'Nummer' : item.type === 'coach' ? 'Kürzel' : 'Beschriftung'}
          value={item.label}
          onChange={(label) => setItemLabel(item.id, label)}
        />
      )}

      {(item.type === 'player' || item.type === 'figure') && (
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
          {item.type === 'player' && item.shape !== 'shirt' && (
          <button
            type="button"
            aria-pressed={item.facing !== false}
            title="Pfeil für die Blickrichtung anzeigen oder ausblenden"
            onClick={() => setItemFacing(item.id, item.facing === false)}
            className={`${buttonClass} ${item.facing !== false ? 'bg-emerald-700 hover:bg-emerald-600' : ''}`}
          >
            ➤ Richtungspfeil
          </button>
          )}
        </>
      )}

      {item.type === 'crest' && (
        <button
          type="button"
          className={buttonClass}
          onClick={() => useToolStore.getState().setEditingContentId(item.id)}
        >
          {item.label ? 'Wappen ändern' : 'Wappen einfügen'}
        </button>
      )}

      {item.type === 'textbox' && (
        <>
          <ColorSwatches
            label="Hintergrund"
            colors={TEXTBOX_COLORS}
            value={item.color}
            onSelect={(color) => setItemColor(item.id, color)}
          />
          <button
            type="button"
            className={buttonClass}
            onClick={() => useToolStore.getState().setEditingContentId(item.id)}
          >
            Text bearbeiten
          </button>
        </>
      )}
    </>
  )
}

function LineControls({ line }: { line: Line }) {
  const setLineSmooth = useDrillStore((s) => s.setLineSmooth)
  const clearLineBends = useDrillStore((s) => s.clearLineBends)
  const setLineStyle = useDrillStore((s) => s.setLineStyle)
  const setLineStep = useDrillStore((s) => s.setLineStep)
  const sceneLines = useDrillStore((s) => currentScene(s).lines)

  return (
    <>
      <div role="group" aria-label="Schritt-Nummer" className="flex items-center gap-1">
        <span className="text-sm text-slate-400">Schritt</span>
        {line.step === null ? (
          <button type="button" className={buttonClass} onClick={() => setLineStep(line.id, nextStep(sceneLines))}>
            + Nummer
          </button>
        ) : (
          <>
            <button
              type="button"
              className={buttonClass}
              aria-label="Kleinere Nummer"
              disabled={line.step <= 1}
              onClick={() => setLineStep(line.id, line.step! - 1)}
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-semibold text-white tabular-nums">{line.step}</span>
            <button type="button" className={buttonClass} aria-label="Größere Nummer" onClick={() => setLineStep(line.id, line.step! + 1)}>
              +
            </button>
            <button type="button" className={buttonClass} title="Nummer entfernen" onClick={() => setLineStep(line.id, null)}>
              ohne
            </button>
          </>
        )}
      </div>
      <LineStylePicker
        pattern={line.pattern}
        weight={line.weight}
        onPattern={(pattern) => {
          if (pattern !== 'auto') setLineStyle(line.id, { pattern })
        }}
        onWeight={(weight) => setLineStyle(line.id, { weight })}
      />
      {line.points.length > 2 && !isFreehand(line.type) && (
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
      )}
    </>
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
  const cornerCount = zoneCorners(zone).length
  // A regular polygon in the current size of the zone; free corners can be moved afterwards.
  const setPolygon = (n: number) => updateZone(zone.id, { corners: regularPolygon(n, extent.width, extent.height) })

  return (
    <>
      <span className="text-sm text-slate-300 tabular-nums" title="Größe der Zone">
        {formatMeters(extent.width)} × {formatMeters(extent.height)} m
      </span>
      {zone.shape === 'ellipse' ? (
        <>
          <button
            type="button"
            aria-pressed={editingCorners}
            title="Punkte einzeln verschieben, z. B. für Ei- oder Bohnenform"
            onClick={() => setEditingCornersId(editingCorners ? null : zone.id)}
            className={`${buttonClass} ${editingCorners ? 'bg-emerald-600 text-white hover:bg-emerald-500' : ''}`}
          >
            {editingCorners ? 'Form fertig' : 'Form bearbeiten'}
          </button>
          {zone.corners && (
            <button type="button" className={buttonClass} onClick={() => updateZone(zone.id, { corners: null })}>
              Form zurücksetzen
            </button>
          )}
        </>
      ) : (
        <>
          <button
            type="button"
            aria-pressed={editingCorners}
            title="Ecken ziehst du direkt an den weißen Punkten; hier kommen neue Ecken an den Seiten dazu (Doppeltipp auf eine Ecke entfernt sie)"
            onClick={() => setEditingCornersId(editingCorners ? null : zone.id)}
            className={`${buttonClass} ${editingCorners ? 'bg-emerald-600 text-white hover:bg-emerald-500' : ''}`}
          >
            {editingCorners ? 'Ecken fertig' : 'Ecken hinzufügen'}
          </button>
          {zone.corners && (
            <button type="button" className={buttonClass} onClick={() => updateZone(zone.id, { corners: null })}>
              Ecken zurücksetzen
            </button>
          )}
          <div role="group" aria-label="Vieleck" className="flex items-center gap-1" title="Gleichmäßiges Vieleck mit dieser Eckenzahl">
            <span className="text-sm text-slate-400">Vieleck</span>
            <button
              type="button"
              className={buttonClass}
              aria-label="Eine Ecke weniger"
              disabled={cornerCount <= MIN_POLYGON_CORNERS}
              onClick={() => setPolygon(cornerCount - 1)}
            >
              −
            </button>
            <span className="w-14 text-center text-sm text-slate-300 tabular-nums">{cornerCount} Ecken</span>
            <button
              type="button"
              className={buttonClass}
              aria-label="Eine Ecke mehr"
              disabled={cornerCount >= MAX_POLYGON_CORNERS}
              onClick={() => setPolygon(cornerCount + 1)}
            >
              +
            </button>
          </div>
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
          {zone.goals > 0 && zone.corners && zone.corners.length !== 4 && (
            <span className="text-xs text-amber-300">Tore nur bei 4 Ecken</span>
          )}
        </div>
      )}
      <LabelInput value={zone.label} placeholder="z. B. Zone A" onChange={(label) => setZoneLive(zone.id, { label })} />
    </>
  )
}
