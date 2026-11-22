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
  MARKER_LETTERS,
  MARKER_NUMBERS,
  markerValues,
  stepMarker,
} from '../items/palette'
import {
  MAX_POLYGON_CORNERS,
  MAX_ZONE_FILL_OPACITY,
  MIN_POLYGON_CORNERS,
  regularPolygon,
  ZONE_COLORS,
  ZONE_GOAL_OPTIONS,
  canRoundZone,
  zoneCorners,
  zoneExtent,
  zonePattern,
} from '../items/zones'
import type { GoalView, Item, Line, PlayerShape, PoleLean, SymbolStyle, Zone } from '../model/types'

const SYMBOL_STYLES: { value: SymbolStyle | null; label: string }[] = [
  { value: null, label: 'Mit Rand' },
  { value: 'flat', label: 'Vollfarbe' },
  { value: 'outline', label: 'Umriss' },
]

const GOAL_VIEWS: { value: GoalView; label: string }[] = [
  { value: 'front', label: 'Von vorne' },
  { value: 'back', label: 'Von hinten' },
  { value: 'left', label: 'Seite, Öffnung links' },
  { value: 'right', label: 'Seite, Öffnung rechts' },
]

const POLE_LEANS: { value: PoleLean; label: string }[] = [
  { value: 'left', label: 'Links' },
  { value: 'right', label: 'Rechts' },
  { value: 'front', label: 'Nach vorne' },
  { value: 'back', label: 'Nach hinten' },
]
import {
  BORDER_COLORS,
  TAIL_ARROWS,
  TAIL_PICKER,
  TEXTBOX_FONTS,
  TEXTBOX_SHAPES,
  TEXTBOX_WIDTHS,
  type TextBoxFont,
  type TextBoxShape,
  type TextBoxStyle,
  type TextBoxWidth,
} from '../items/textBoxStyle'
import {
  currentScene,
  findElement,
  isLine,
  isZone,
  MIN_ALPHA,
  useDrillStore,
  type DrillContent,
} from '../store/drillStore'
import { useToolStore } from '../store/toolStore'
import { nextStep } from '../lines/steps'
import { LineStylePicker } from './LineStylePicker'
import { ColorSwatches, LabelInput } from './controls'
import { buttonClass, dangerButtonClass, inputClass } from './ui'

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
      <AlphaSlider ids={[selected.id]} value={selected.alpha ?? 1} />
      <OrderButtons ids={[selected.id]} />
      <LockButton ids={[selected.id]} locked={selected.locked === true} />
    </div>
  )
}

/** Own opacity of objects and lines (one undo step per slider move). */
function AlphaSlider({ ids, value }: { ids: string[]; value: number }) {
  const setAlphaLive = useDrillStore((s) => s.setAlphaLive)
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
    <label className="flex items-center gap-1.5 text-sm text-slate-400" title="Deckkraft: wie durchsichtig Objekt, Linie oder Zone sind">
      Deckkraft
      <input
        type="range"
        aria-label="Deckkraft"
        className="w-24 accent-emerald-500"
        min={MIN_ALPHA}
        max={1}
        step={0.05}
        value={value}
        onPointerDown={begin}
        onKeyDown={begin}
        onChange={(e) => {
          begin()
          setAlphaLive(ids, Number(e.target.value))
        }}
        onPointerUp={finish}
        onKeyUp={finish}
        onBlur={finish}
      />
      <span className="w-10 whitespace-nowrap text-right tabular-nums">{Math.round(value * 100)} %</span>
    </label>
  )
}

/** Brings the selection to the front or sends it to the back. */
function OrderButtons({ ids }: { ids: string[] }) {
  const reorder = useDrillStore((s) => s.reorder)
  return (
    <>
      <button
        type="button"
        className={buttonClass}
        title="In den Vordergrund: über die anderen Objekte legen (Zonen bleiben immer unter Linien und Objekten)"
        onClick={() => reorder(ids, 'front')}
      >
        ⬆ Vordergrund
      </button>
      <button
        type="button"
        className={buttonClass}
        title="In den Hintergrund: unter die anderen Objekte legen"
        onClick={() => reorder(ids, 'back')}
      >
        ⬇ Hintergrund
      </button>
    </>
  )
}

/** Fixes the selection (no more moving by accident) or frees it again. */
function LockButton({ ids, locked }: { ids: string[]; locked: boolean }) {
  const setLocked = useDrillStore((s) => s.setLocked)
  return (
    <button
      type="button"
      aria-pressed={locked}
      className={`${buttonClass} ${locked ? 'bg-amber-600 text-white hover:bg-amber-500' : ''}`}
      title={
        locked
          ? 'Fixiert: lässt sich nicht verschieben. Antippen zum Lösen.'
          : 'Fixieren: lässt sich nicht mehr aus Versehen verschieben oder auswählen (wieder lösen über „🔒 Fixierte auswählen“)'
      }
      onClick={() => setLocked(ids, !locked)}
    >
      {locked ? '🔓 Lösen' : '🔒 Fixieren'}
    </button>
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
  // Objects and lines have an own opacity; zones have their fill opacity instead.
  const alphaTargets = elements

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
      {alphaTargets.length > 0 && (
        <AlphaSlider
          ids={alphaTargets.map((e) => e.id)}
          value={alphaTargets.every((e) => (e.alpha ?? 1) === (alphaTargets[0].alpha ?? 1)) ? (alphaTargets[0].alpha ?? 1) : 1}
        />
      )}
      <OrderButtons ids={selectedIds} />
      <LockButton ids={selectedIds} locked={elements.length > 0 && elements.every((el) => el.locked === true)} />
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

      {item.type === 'player' && (
        <div role="group" aria-label="Darstellung" className="flex gap-1 rounded-lg bg-slate-800 p-1" title="Bleibt für die nächsten Spieler, bis du es änderst">
          {SYMBOL_STYLES.map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={(item.symbol ?? null) === o.value}
              onClick={() => useDrillStore.getState().setSymbolStyle(item.id, o.value)}
              className={`min-h-8 rounded-md px-2 text-sm ${
                (item.symbol ?? null) === o.value ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {o.label}
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

      {(item.type === 'goalFront' || item.type === 'minigoalFront') && (
        <div role="group" aria-label="Ansicht" className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-800 p-1">
          <span className="px-1 text-sm text-slate-400">Ansicht</span>
          {GOAL_VIEWS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={(item.view ?? 'front') === o.value}
              onClick={() => useDrillStore.getState().setGoalView(item.id, o.value)}
              className={`min-h-8 rounded-md px-2 text-sm ${
                (item.view ?? 'front') === o.value ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      {item.type === 'discPole' && (
        <div role="group" aria-label="Neigung" className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-800 p-1">
          <span className="px-1 text-sm text-slate-400">Neigung</span>
          {POLE_LEANS.map((o) => (
            <button
              key={o.value}
              type="button"
              aria-pressed={(item.lean ?? 'right') === o.value}
              onClick={() => useDrillStore.getState().setItemLean(item.id, o.value)}
              className={`min-h-8 rounded-md px-2 text-sm ${
                (item.lean ?? 'right') === o.value ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {o.label}
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

      {item.type === 'marker' && (
        <div role="group" aria-label="Wert der Marke" className="flex items-center gap-1">
          <button
            type="button"
            className={buttonClass}
            aria-label="Vorheriger Wert"
            onClick={() => setItemLabel(item.id, stepMarker(item.label, -1))}
          >
            −
          </button>
          <select
            className={inputClass}
            aria-label="Wert"
            value={markerValues(item.label).includes(item.label) ? item.label : ''}
            onChange={(e) => setItemLabel(item.id, e.target.value)}
          >
            <optgroup label="Nummern">
              {MARKER_NUMBERS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </optgroup>
            <optgroup label="Buchstaben">
              {MARKER_LETTERS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </optgroup>
          </select>
          <button
            type="button"
            className={buttonClass}
            aria-label="Nächster Wert"
            onClick={() => setItemLabel(item.id, stepMarker(item.label, 1))}
          >
            +
          </button>
        </div>
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
          <TextBoxControls item={item} />
        </>
      )}
    </>
  )
}

const selectClass = 'min-h-10 rounded-md bg-slate-800 px-2 text-sm text-slate-200'

/** Shape, width, font, border and tail of a text box or speech bubble. */
function TextBoxControls({ item }: { item: Item }) {
  const setTextBoxStyle = useDrillStore((s) => s.setTextBoxStyle)
  const box = item.box
  const change = (c: Partial<TextBoxStyle>) => setTextBoxStyle(item.id, c)
  const toggle = (active: boolean) =>
    active ? buttonClass.replace('bg-slate-800', 'bg-emerald-700').replace('hover:bg-slate-700', 'hover:bg-emerald-600') : buttonClass
  return (
    <>
      <label className="flex items-center gap-1 text-sm text-slate-400">
        Form
        <select className={selectClass} value={box?.shape ?? 'rounded'} onChange={(e) => change({ shape: e.target.value as TextBoxShape })}>
          {TEXTBOX_SHAPES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1 text-sm text-slate-400">
        Breite
        <select className={selectClass} value={box?.width ?? 'normal'} onChange={(e) => change({ width: e.target.value as TextBoxWidth })}>
          {TEXTBOX_WIDTHS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-1 text-sm text-slate-400">
        Schrift
        <select className={selectClass} value={box?.font ?? 'medium'} onChange={(e) => change({ font: e.target.value as TextBoxFont })}>
          {TEXTBOX_FONTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <button type="button" aria-pressed={!!box?.bold} className={`${toggle(!!box?.bold)} font-bold`} title="Fett" onClick={() => change({ bold: !box?.bold })}>
        F
      </button>
      <button type="button" aria-pressed={!!box?.italic} className={`${toggle(!!box?.italic)} italic`} title="Kursiv" onClick={() => change({ italic: !box?.italic })}>
        K
      </button>
      <ColorSwatches
        label="Rand"
        colors={[{ value: '', name: 'Schwach', swatch: 'linear-gradient(135deg, #475569 45%, #94a3b8 55%)' }, ...BORDER_COLORS]}
        value={box?.border ?? ''}
        onSelect={(border) => change({ border: border || undefined })}
      />
      <div role="group" aria-label="Zipfel" className="flex items-center gap-1">
        <span className="text-sm text-slate-400" title="Sprechblase: Richtung des Zipfels">
          Zipfel
        </span>
        <div className="grid grid-cols-3 gap-0.5">
          {TAIL_PICKER.map((dir) => {
            const active = (box?.tail ?? null) === dir
            return (
              <button
                key={dir ?? 'none'}
                type="button"
                aria-pressed={active}
                aria-label={dir ? `Zipfel ${TAIL_ARROWS[dir]}` : 'Kein Zipfel'}
                title={dir ? `Zipfel ${TAIL_ARROWS[dir]}` : 'Kein Zipfel'}
                className={`h-5 w-6 rounded text-xs leading-none ${active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                onClick={() => change({ tail: dir ?? undefined })}
              >
                {dir ? TAIL_ARROWS[dir] : '·'}
              </button>
            )
          })}
        </div>
        {box?.tail && (
          <>
            <button
              type="button"
              aria-pressed={box.tailKind !== 'thought'}
              className={toggle(box.tailKind !== 'thought')}
              onClick={() => change({ tailKind: 'speech' })}
            >
              Sprechen
            </button>
            <button
              type="button"
              aria-pressed={box.tailKind === 'thought'}
              className={toggle(box.tailKind === 'thought')}
              onClick={() => change({ tailKind: 'thought' })}
            >
              Denken
            </button>
          </>
        )}
      </div>
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
    <label className="flex items-center gap-1.5 text-sm text-slate-400" title="Deckkraft nur der Füllung">
      Füllung
      <input
        type="range"
        aria-label="Deckkraft der Füllung"
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
      <LineStylePicker
        pattern={zonePattern(zone)}
        weight={zone.weight ?? 'medium'}
        onPattern={(pattern) => pattern !== 'auto' && updateZone(zone.id, { pattern, dashed: pattern !== 'solid' })}
        onWeight={(weight) => updateZone(zone.id, { weight })}
      />
      {canRoundZone(zone) && (
        <button
          type="button"
          aria-pressed={zone.rounded === true}
          title="Ecken der Zone abrunden"
          onClick={() => updateZone(zone.id, { rounded: !zone.rounded })}
          className={`${buttonClass} ${zone.rounded ? 'bg-emerald-600 text-white hover:bg-emerald-500' : ''}`}
        >
          Ecken rund
        </button>
      )}
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
