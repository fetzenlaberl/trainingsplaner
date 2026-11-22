import { NEON_COLORS } from '../lines/styles'
import { useEffect, useRef, useState } from 'react'
import { FIELD_TYPE_LABELS, FIELD_TYPES, MAX_AREA, MIN_AREA, type FieldArea } from '../field/dimensions'
import { isHexColor } from '../field/pitchStyle'
import { MAX_ZONE_FILL_OPACITY, ZONE_COLORS } from '../items/zones'
import { LINE_COLORS, LINE_PATTERNS, LINE_WEIGHTS, type LinePattern, type LineWeight } from '../lines/styles'
import {
  areaForPlayers,
  CONE_SIZES,
  customFieldScene,
  DEFAULT_FIELD_DRAW_OPTIONS,
  formatName,
  isFieldPart,
  isLabelOpacity,
  FIELD_DIVISIONS,
  SIZE_LABEL_OPACITY,
  MAX_SIDE_CONES,
  MAX_SIDE_GOALS,
  MAX_TEAM_PLAYERS,
  SCREEN_SIDES,
  type ConeSize,
  type FieldDrawOptions,
  type ScreenSide,
} from '../model/fieldTemplates'
import type { Scene } from '../model/types'
import { currentScene, useDrillStore } from '../store/drillStore'
import { ColorSwatches } from './controls'
import { LineStylePicker } from './LineStylePicker'
import { buttonClass, dangerButtonClass } from './ui'

export function FieldTypeSwitcher() {
  const fieldType = useDrillStore((s) => s.fieldType)
  const setFieldType = useDrillStore((s) => s.setFieldType)

  return (
    <div role="group" aria-label="Feldtyp" className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-800 p-1">
      {FIELD_TYPES.map((type) => {
        const active = type === fieldType
        return (
          <button
            key={type}
            type="button"
            aria-pressed={active}
            onClick={() => setFieldType(type)}
            className={`min-h-10 rounded-md px-3 text-sm font-medium transition-colors ${
              active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            {FIELD_TYPE_LABELS[type]}
          </button>
        )
      })}
      {fieldType === 'empty' && <AreaInputs />}
    </div>
  )
}

const OPTIONS_KEY = 'trainingsplaner.fieldDrawOptions'
const FIELD_ZONE_PREFIX = 'zone-tpl-field-'

const isCount = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max

/** Remembered look of the drawn-in field (per device; falls back to the defaults). */
function loadDrawOptions(): FieldDrawOptions {
  const d = DEFAULT_FIELD_DRAW_OPTIONS
  try {
    const raw = localStorage.getItem(OPTIONS_KEY)
    if (!raw) return d
    const v = JSON.parse(raw) as Partial<FieldDrawOptions>
    const goals = { ...d.goals }
    for (const side of SCREEN_SIDES) {
      const n = v.goals?.[side]
      if (isCount(n, MAX_SIDE_GOALS)) goals[side] = n
    }
    const colors = Array.isArray(v.teamColors) && v.teamColors.every(isHexColor) && v.teamColors.length === 2 ? v.teamColors : d.teamColors
    return {
      pattern: LINE_PATTERNS.includes(v.pattern as LinePattern) ? (v.pattern as LinePattern) : d.pattern,
      weight: LINE_WEIGHTS.includes(v.weight as LineWeight) ? (v.weight as LineWeight) : d.weight,
      color: isHexColor(v.color) ? v.color : d.color,
      fill: isHexColor(v.fill) ? v.fill : null,
      fillOpacity:
        typeof v.fillOpacity === 'number' && v.fillOpacity >= 0.05 && v.fillOpacity <= MAX_ZONE_FILL_OPACITY
          ? v.fillOpacity
          : d.fillOpacity,
      rounded: v.rounded === true,
      playerShape: v.playerShape === 'circle' || v.playerShape === 'triangle' ? v.playerShape : 'arrow',
      numbers: v.numbers !== false,
      playerSymbol: v.playerSymbol === 'flat' || v.playerSymbol === 'outline' ? v.playerSymbol : null,
      coneSymbol: v.coneSymbol === 'flat' || v.coneSymbol === 'outline' ? v.coneSymbol : null,
      teamColors: [colors[0], colors[1]],
      cones: v.cones === true,
      sideCones: isCount(v.sideCones, MAX_SIDE_CONES) ? v.sideCones : d.sideCones,
      coneSize: CONE_SIZES.some((c) => c.value === v.coneSize) ? (v.coneSize as ConeSize) : d.coneSize,
      coneColor: isHexColor(v.coneColor) ? v.coneColor : d.coneColor,
      goals,
      goalType: v.goalType === 'goal' ? 'goal' : 'minigoal',
      lockField: v.lockField !== false,
      labelOpacity: isLabelOpacity(v.labelOpacity) ? v.labelOpacity : d.labelOpacity,
      division: FIELD_DIVISIONS.find((o) => o.value === v.division)?.value ?? d.division,
    }
  } catch {
    return d
  }
}

function saveDrawOptions(options: FieldDrawOptions): void {
  try {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(options))
  } catch {
    // Not remembered (private window); the choice still applies now.
  }
}

const PLAYER_SHAPES: { value: FieldDrawOptions['playerShape']; label: string }[] = [
  { value: 'arrow', label: 'Kreis mit Pfeil' },
  { value: 'circle', label: 'Kreis' },
  { value: 'triangle', label: 'Dreieck' },
]

const PLAYER_SYMBOLS: { value: FieldDrawOptions['playerSymbol']; label: string; title: string }[] = [
  { value: null, label: 'Mit Rand', title: 'Ausgefüllt mit weißem Rand' },
  { value: 'flat', label: 'Vollfarbe', title: 'Ausgefüllt ohne Rand' },
  { value: 'outline', label: 'Umriss', title: 'Nur farbiger Rand, innen durchsichtig' },
]

const CONE_SYMBOLS: { value: FieldDrawOptions['coneSymbol']; label: string; title: string }[] = [
  { value: null, label: 'Mit Rand', title: 'Hütchen mit Rand und Öffnung' },
  { value: 'flat', label: 'Vollfarbe', title: 'Ganz ausgefüllt' },
  { value: 'outline', label: 'Umriss', title: 'Nur farbiger Rand, innen durchsichtig' },
]

const SIDE_LABELS: Record<ScreenSide, string> = { top: 'Oben', bottom: 'Unten', left: 'Links', right: 'Rechts' }

const CONE_COLORS = [
  { value: '#f97316', name: 'Orange' },
  { value: '#facc15', name: 'Gelb' },
  { value: '#dc2626', name: 'Rot' },
  { value: '#2563eb', name: 'Blau' },
  { value: '#22c55e', name: 'Grün' },
  { value: '#ffffff', name: 'Weiß' },
  ...NEON_COLORS,
]

const TEAM_COLORS = [
  { value: '#2563eb', name: 'Blau' },
  { value: '#dc2626', name: 'Rot' },
  { value: '#facc15', name: 'Gelb' },
  { value: '#22c55e', name: 'Grün' },
  { value: '#f97316', name: 'Orange' },
  { value: '#7c3aed', name: 'Lila' },
  { value: '#ffffff', name: 'Weiß' },
  { value: '#111827', name: 'Schwarz' },
  ...NEON_COLORS,
]

/** Players per team from an input, or null when it is not a valid count. */
function playerCount(value: string): number | null {
  const n = Number(value)
  return value.trim() !== '' && Number.isInteger(n) && n >= 0 && n <= MAX_TEAM_PLAYERS ? n : null
}

/** Id ending of the drawn-in field in the current scene, or null when there is none. */
function drawnFieldSuffix(scene: Scene): string | null {
  const zone = scene.zones.find((z) => z.id.startsWith(FIELD_ZONE_PREFIX))
  return zone ? zone.id.slice(FIELD_ZONE_PREFIX.length) : null
}

type SceneContent = Pick<Scene, 'items' | 'lines' | 'zones'>

/** What was drawn last: to redraw it with a new look, and to see whether it was changed since. */
interface LastDraw {
  suffix: string
  size: FieldArea
  teams?: [number, number]
  content: SceneContent
}

// Kept outside the component, so it survives switching the field type back and forth.
let lastDraw: LastDraw | null = null

const sameContent = (a: SceneContent, b: SceneContent) => JSON.stringify(a) === JSON.stringify(b)

/**
 * Own size of the empty field: length × width in meters (empty = as big as the big pitch),
 * or the other way round from a player count; draws the field in with the chosen look.
 */
function AreaInputs() {
  const area = useDrillStore((s) => s.pitch.area)
  const setFieldArea = useDrillStore((s) => s.setFieldArea)
  const canUndo = useDrillStore((s) => s.past.length > 0)
  const hasDrawnField = useDrillStore((s) => drawnFieldSuffix(currentScene(s)) !== null)
  const fieldLocked = useDrillStore((s) => currentScene(s).zones.some((z) => z.id.startsWith(FIELD_ZONE_PREFIX) && z.locked === true))
  const [length, setLength] = useState(area ? String(area.length) : '')
  const [width, setWidth] = useState(area ? String(area.width) : '')
  const [teamA, setTeamA] = useState('')
  const [teamB, setTeamB] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [options, setOptions] = useState<FieldDrawOptions>(loadDrawOptions)
  const [showOptions, setShowOptions] = useState(false)
  const showNotes = useDrillStore((s) => s.pitch.showNotes === true)
  // Look changes by the user (not the first render) redraw the field after a short pause.
  const changedByUser = useRef(false)
  // Fixing or freeing the field changes it directly, without a redraw.
  const skipRedraw = useRef(false)

  // Follow undo/redo and loaded drills.
  useEffect(() => {
    setLength(area ? String(area.length) : '')
    setWidth(area ? String(area.width) : '')
  }, [area])

  function commit(nextLength: string, nextWidth: string) {
    const l = Number(nextLength)
    const w = Number(nextWidth)
    if (nextLength.trim() === '' && nextWidth.trim() === '') setFieldArea(null)
    else if (l > 0 && w > 0) setFieldArea({ length: l, width: w })
  }

  const a = playerCount(teamA)
  const b = playerCount(teamB)
  const teams: [number, number] | null = a !== null && b !== null && a + b > 0 ? [a, b] : null

  /** Builds the field content with own ids (so nothing is mixed up with other scenes). */
  function build(size: FieldArea, look: FieldDrawOptions, chosenTeams: [number, number] | undefined, suffix: string) {
    const { items, lines, zones, format } = customFieldScene(size, useDrillStore.getState().pitch.orientation, look, chosenTeams)
    const content: SceneContent = {
      items: items.map((i) => ({ ...i, id: `${i.id}-${suffix}` })),
      lines: lines.map((l) => ({ ...l, id: `${l.id}-${suffix}` })),
      zones: zones.map((z) => ({ ...z, id: `${z.id}-${suffix}` })),
    }
    return { content, format }
  }

  /** Outline with the size, size labels and the players; replaces the scene (undo possible). */
  function drawField(size: FieldArea, chosenTeams?: [number, number]) {
    const state = useDrillStore.getState()
    const scene = currentScene(state)
    const filled = scene.items.length + scene.lines.length + scene.zones.length > 0
    if (filled && !window.confirm('Die Szene enthält schon Objekte. Durch das eingezeichnete Feld ersetzen? (Rückgängig möglich)')) return
    const suffix = Date.now().toString(36)
    const { content, format } = build(size, options, chosenTeams, suffix)
    state.replaceSceneContent(content)
    lastDraw = { suffix, size, teams: chosenTeams, content }
    const total = chosenTeams ? chosenTeams[0] + chosenTeams[1] : format.players * 2
    state.setInfo({ fieldSize: `${size.length} × ${size.width} m`, players: total })
    const who = chosenTeams ? `${chosenTeams[0]} gegen ${chosenTeams[1]}` : formatName(format)
    setMessage(`Eingezeichnet: ${size.length} × ${size.width} m, ${who}`)
  }

  function drawFromSize() {
    const size = useDrillStore.getState().pitch.area
    if (size) drawField(size)
  }

  function drawFromPlayers() {
    if (!teams) return
    const size = areaForPlayers(teams[0], teams[1])
    setFieldArea(size)
    // setFieldArea clamps and rounds; draw with the stored size.
    drawField(useDrillStore.getState().pitch.area ?? size, teams)
  }

  // A new look redraws the field drawn last (when it is still in this scene).
  useEffect(() => {
    if (!changedByUser.current) return
    if (skipRedraw.current) {
      skipRedraw.current = false
      return
    }
    const timer = window.setTimeout(() => {
      const state = useDrillStore.getState()
      const scene = currentScene(state)
      const draw = lastDraw
      if (!draw || drawnFieldSuffix(scene) !== draw.suffix) return
      const current: SceneContent = { items: scene.items, lines: scene.lines, zones: scene.zones }
      const next = build(draw.size, options, draw.teams, draw.suffix).content
      if (sameContent(current, next)) return
      if (
        !sameContent(current, draw.content) &&
        !window.confirm('Das Feld wurde seit dem Einzeichnen verändert. Mit dem neuen Aussehen neu zeichnen? (Rückgängig möglich)')
      ) {
        return
      }
      state.replaceSceneContent(next)
      lastDraw = { ...draw, content: next }
    }, 300)
    return () => window.clearTimeout(timer)
    // build only reads the store and its arguments
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options])

  // Builds on the newest options, so quick clicks one after another all count.
  function changeOptions(change: Partial<FieldDrawOptions> | ((current: FieldDrawOptions) => Partial<FieldDrawOptions>)) {
    changedByUser.current = true
    setOptions((current) => {
      const next = { ...current, ...(typeof change === 'function' ? change(current) : change) }
      saveDrawOptions(next)
      return next
    })
  }

  /**
   * Fixes or frees the drawn-in field (outline, size labels, cones, goals), so it does not
   * move by accident while drawing; players and the ball stay movable. One undo step.
   */
  function setFieldLocked(lock: boolean) {
    skipRedraw.current = true
    changeOptions({ lockField: lock })
    const state = useDrillStore.getState()
    const scene = currentScene(state)
    const suffix = drawnFieldSuffix(scene)
    if (!suffix) return
    function apply<T extends Scene['items'][number] | Scene['lines'][number] | Scene['zones'][number]>(element: T): T {
      if (!element.id.endsWith(`-${suffix}`) || !isFieldPart(element)) return element
      const next = { ...element }
      if (lock) next.locked = true
      else delete next.locked
      return next
    }
    const applyAll = (content: SceneContent): SceneContent => ({
      items: content.items.map(apply),
      lines: content.lines.map(apply),
      zones: content.zones.map(apply),
    })
    state.replaceSceneContent(applyAll(scene))
    if (lastDraw?.suffix === suffix) lastDraw = { ...lastDraw, content: applyAll(lastDraw.content) }
    setMessage(lock ? 'Feld fixiert: Rand, Maße, Hütchen und Tore bleiben stehen' : 'Feld gelöst: alles lässt sich wieder verschieben')
  }

  /** Removes the drawn-in field with everything that belongs to it (undo possible). */
  function deleteField() {
    const state = useDrillStore.getState()
    const scene = currentScene(state)
    const suffix = drawnFieldSuffix(scene)
    if (!suffix) return
    const own = (id: string) => id.endsWith(`-${suffix}`)
    state.replaceSceneContent({
      items: scene.items.filter((i) => !own(i.id)),
      lines: scene.lines.filter((l) => !own(l.id)),
      zones: scene.zones.filter((z) => !own(z.id)),
    })
    lastDraw = null
    setMessage('Feld gelöscht (Rückgängig möglich)')
  }

  const input =
    'min-h-10 w-14 rounded-md border border-slate-600 bg-slate-900 px-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'
  const drawButton = `${buttonClass} bg-emerald-700 text-white hover:bg-emerald-600`
  const choice = (active: boolean) =>
    `min-h-8 rounded-md px-2 text-sm ${active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`
  const row = 'flex flex-wrap items-center gap-x-2 gap-y-1'
  const rowLabel = 'w-20 shrink-0 text-sm text-slate-400'

  return (
    <div className="flex basis-full flex-wrap items-center gap-x-3 gap-y-1 px-2 text-sm text-slate-300">
      <label
        className="flex items-center gap-1"
        title={`Eigene Größe der Fläche (${MIN_AREA}–${MAX_AREA} m); leer = so groß wie das Großfeld`}
      >
        Größe
        <input
          type="number"
          inputMode="numeric"
          min={MIN_AREA}
          max={MAX_AREA}
          aria-label="Länge der Fläche in Metern"
          placeholder="105"
          className={input}
          value={length}
          onChange={(e) => setLength(e.target.value)}
          onBlur={() => commit(length, width)}
          onKeyDown={(e) => e.key === 'Enter' && commit(length, width)}
        />
        ×
        <input
          type="number"
          inputMode="numeric"
          min={MIN_AREA}
          max={MAX_AREA}
          aria-label="Breite der Fläche in Metern"
          placeholder="68"
          className={input}
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          onBlur={() => commit(length, width)}
          onKeyDown={(e) => e.key === 'Enter' && commit(length, width)}
        />
        m
      </label>
      <button
        type="button"
        className={drawButton}
        disabled={!area}
        title="Feld in dieser Größe mit Maßangaben und der üblichen Spielerzahl einzeichnen"
        onClick={drawFromSize}
      >
        Feld einzeichnen
      </button>
      <label
        className="flex items-center gap-1"
        title={`Spieler je Team (0–${MAX_TEAM_PLAYERS}); daraus wird die passende Feldgröße berechnet`}
      >
        Spieler
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_TEAM_PLAYERS}
          aria-label="Spieler Team 1"
          placeholder="6"
          className={input}
          value={teamA}
          onChange={(e) => setTeamA(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && drawFromPlayers()}
        />
        gegen
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={MAX_TEAM_PLAYERS}
          aria-label="Spieler Team 2"
          placeholder="3"
          className={input}
          value={teamB}
          onChange={(e) => setTeamB(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && drawFromPlayers()}
        />
      </label>
      <button
        type="button"
        className={drawButton}
        disabled={!teams}
        title="Passende Feldgröße für diese Spielerzahl berechnen und das Feld mit Maßangaben einzeichnen"
        onClick={drawFromPlayers}
      >
        Feld aus Spielern
      </button>
      <button
        type="button"
        aria-pressed={fieldLocked}
        disabled={!hasDrawnField}
        className={`${buttonClass} ${fieldLocked ? 'bg-amber-600 text-white hover:bg-amber-500' : ''}`}
        onClick={() => setFieldLocked(!fieldLocked)}
        title={
          fieldLocked
            ? 'Feld ist fixiert (Rand, Maße, Hütchen, Tore). Antippen zum Lösen.'
            : 'Feld fixieren: Rand, Maße, Hütchen und Tore lassen sich nicht mehr aus Versehen verschieben'
        }
      >
        {fieldLocked ? '🔒 Feld fixiert' : '🔓 Feld fixieren'}
      </button>
      <button
        type="button"
        className={`${buttonClass} ${showOptions ? 'bg-slate-600 text-white' : ''}`}
        aria-expanded={showOptions}
        onClick={() => setShowOptions(!showOptions)}
        title="Aussehen des eingezeichneten Felds: Rand, Füllung, Ecken, Hütchen, Tore, Spieler"
      >
        Aussehen {showOptions ? '▴' : '▾'}
      </button>
      <button
        type="button"
        className={showNotes ? buttonClass.replace('bg-slate-800', 'bg-emerald-700').replace('hover:bg-slate-700', 'hover:bg-emerald-600') : buttonClass}
        aria-pressed={showNotes}
        onClick={() => useDrillStore.getState().setPitchLines({ showNotes: !showNotes })}
        title="Notizen unter dem Feld zeigen oder ausblenden (kommen beim Export als PNG und PDF mit)"
      >
        📝 Notizen
      </button>
      {message && <span className="text-xs text-emerald-300">{message}</span>}

      {showOptions && (
        // Its own row below the inputs: pushes the pitch down instead of covering it.
        <div className="flex basis-full flex-col gap-2 rounded-lg border border-slate-700 bg-slate-900 p-3">
          <div className={row}>
            <span className={rowLabel}>Rand</span>
            <LineStylePicker
              pattern={options.pattern}
              weight={options.weight}
              onPattern={(pattern) => pattern !== 'auto' && changeOptions({ pattern })}
              onWeight={(weight) => changeOptions({ weight })}
            />
            <ColorSwatches label="Farbe" colors={LINE_COLORS} value={options.color} onSelect={(color) => changeOptions({ color })} />
          </div>
          <div className={row}>
            <span className={rowLabel}>Fläche</span>
            <button
              type="button"
              aria-pressed={options.fill === null}
              className={choice(options.fill === null)}
              onClick={() => changeOptions({ fill: null })}
            >
              Keine Füllung
            </button>
            <ColorSwatches label="Füllung" colors={ZONE_COLORS} value={options.fill ?? ''} onSelect={(fill) => changeOptions({ fill })} />
            {options.fill && (
              <label className="flex items-center gap-1 text-xs text-slate-400">
                Deckkraft
                <input
                  type="range"
                  min={0.05}
                  max={MAX_ZONE_FILL_OPACITY}
                  step={0.05}
                  value={options.fillOpacity}
                  onChange={(e) => changeOptions({ fillOpacity: Number(e.target.value) })}
                />
                <span className="w-9 text-right tabular-nums">{Math.round(options.fillOpacity * 100)} %</span>
              </label>
            )}
            <span className="ml-2 text-sm text-slate-400">Ecken</span>
            <button type="button" aria-pressed={!options.rounded} className={choice(!options.rounded)} onClick={() => changeOptions({ rounded: false })}>
              Eckig
            </button>
            <button type="button" aria-pressed={options.rounded} className={choice(options.rounded)} onClick={() => changeOptions({ rounded: true })}>
              Abgerundet
            </button>
          </div>
          <div className={row}>
            <span className={rowLabel}>Teilung</span>
            {FIELD_DIVISIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={options.division === o.value}
                className={choice(options.division === o.value)}
                onClick={() => changeOptions({ division: o.value })}
                title={o.title}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className={row}>
            <span className={rowLabel}>Maße</span>
            <button
              type="button"
              aria-pressed={options.labelOpacity > 0}
              className={choice(options.labelOpacity > 0)}
              onClick={() => changeOptions((c) => ({ labelOpacity: c.labelOpacity > 0 ? 0 : SIZE_LABEL_OPACITY }))}
              title="Maßangaben (Länge und Breite mit Pfeilen) zeigen oder weglassen"
            >
              {options.labelOpacity > 0 ? 'An' : 'Aus'}
            </button>
            {options.labelOpacity > 0 && (
              <label className="flex items-center gap-1.5 text-sm text-slate-400" title="Deckkraft der Maßangaben">
                Deckkraft
                <input
                  type="range"
                  aria-label="Deckkraft der Maßangaben"
                  className="w-24 accent-emerald-500"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={options.labelOpacity}
                  onChange={(e) => changeOptions({ labelOpacity: Number(e.target.value) })}
                />
                <span className="w-9 text-right tabular-nums">{Math.round(options.labelOpacity * 100)} %</span>
              </label>
            )}
          </div>
          <div className={row}>
            <span className={rowLabel}>Hütchen</span>
            <button type="button" aria-pressed={options.cones} className={choice(options.cones)} onClick={() => changeOptions((c) => ({ cones: !c.cones }))}>
              An den Ecken
            </button>
            <div role="group" aria-label="Hütchen je Seite" className="flex items-center gap-0.5 rounded-lg bg-slate-800 p-1">
              <span className="px-1 text-xs text-slate-400">je Seite</span>
              {Array.from({ length: MAX_SIDE_CONES + 1 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} Hütchen je Seite`}
                  aria-pressed={options.sideCones === n}
                  className={`min-h-8 min-w-7 rounded-md text-sm ${
                    options.sideCones === n ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                  }`}
                  onClick={() => changeOptions({ sideCones: n })}
                >
                  {n}
                </button>
              ))}
            </div>
            {(options.cones || options.sideCones > 0) && (
              <>
                <div role="group" aria-label="Größe der Hütchen" className="flex items-center gap-1">
                  {CONE_SIZES.map((size) => (
                    <button
                      key={size.value}
                      type="button"
                      aria-pressed={options.coneSize === size.value}
                      className={choice(options.coneSize === size.value)}
                      onClick={() => changeOptions({ coneSize: size.value })}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
                <ColorSwatches label="Farbe" colors={CONE_COLORS} value={options.coneColor} onSelect={(coneColor) => changeOptions({ coneColor })} />
                {CONE_SYMBOLS.map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    aria-pressed={options.coneSymbol === o.value}
                    className={choice(options.coneSymbol === o.value)}
                    onClick={() => changeOptions({ coneSymbol: o.value })}
                    title={o.title}
                  >
                    {o.label}
                  </button>
                ))}
              </>
            )}
          </div>
          <div className={row}>
            <span className={rowLabel}>Tore</span>
            {SCREEN_SIDES.map((side) => (
              <div key={side} role="group" aria-label={`Tore ${SIDE_LABELS[side]}`} className="flex items-center gap-0.5 rounded-lg bg-slate-800 p-1">
                <span className="w-12 px-1 text-xs text-slate-400">{SIDE_LABELS[side]}</span>
                {Array.from({ length: MAX_SIDE_GOALS + 1 }, (_, n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${n} Tore ${SIDE_LABELS[side]}`}
                    aria-pressed={options.goals[side] === n}
                    className={`min-h-8 min-w-7 rounded-md text-sm ${
                      options.goals[side] === n ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                    }`}
                    onClick={() => changeOptions((current) => ({ goals: { ...current.goals, [side]: n } }))}
                  >
                    {n}
                  </button>
                ))}
              </div>
            ))}
            <button
              type="button"
              aria-pressed={options.goalType === 'minigoal'}
              className={choice(options.goalType === 'minigoal')}
              onClick={() => changeOptions({ goalType: 'minigoal' })}
            >
              Minitore
            </button>
            <button
              type="button"
              aria-pressed={options.goalType === 'goal'}
              className={choice(options.goalType === 'goal')}
              onClick={() => changeOptions({ goalType: 'goal' })}
            >
              Große Tore
            </button>
          </div>
          <div className={row}>
            <span className={rowLabel}>Spieler</span>
            {PLAYER_SHAPES.map((shape) => (
              <button
                key={shape.value}
                type="button"
                aria-pressed={options.playerShape === shape.value}
                className={choice(options.playerShape === shape.value)}
                onClick={() => changeOptions({ playerShape: shape.value })}
              >
                {shape.label}
              </button>
            ))}
            <button type="button" aria-pressed={options.numbers} className={choice(options.numbers)} onClick={() => changeOptions({ numbers: true })}>
              Mit Zahl
            </button>
            <button type="button" aria-pressed={!options.numbers} className={choice(!options.numbers)} onClick={() => changeOptions({ numbers: false })}>
              Ohne Zahl
            </button>
          </div>
          <div className={row}>
            <span className={rowLabel}>Teamfarben</span>
            <ColorSwatches
              label="Team 1"
              colors={TEAM_COLORS}
              value={options.teamColors[0]}
              onSelect={(c) => changeOptions((current) => ({ teamColors: [c, current.teamColors[1]] }))}
            />
            <ColorSwatches
              label="Team 2"
              colors={TEAM_COLORS}
              value={options.teamColors[1]}
              onSelect={(c) => changeOptions((current) => ({ teamColors: [current.teamColors[0], c] }))}
            />
            <span className="ml-2 text-sm text-slate-400">Darstellung</span>
            {PLAYER_SYMBOLS.map((o) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={options.playerSymbol === o.value}
                className={choice(options.playerSymbol === o.value)}
                onClick={() => changeOptions({ playerSymbol: o.value })}
                title={o.title}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className={`${row} border-t border-slate-700 pt-2`}>
            <button type="button" className={buttonClass} disabled={!canUndo} onClick={() => useDrillStore.getState().undo()} title="Letzte Änderung zurücknehmen">
              ↶ Rückgängig
            </button>
            <button
              type="button"
              className={dangerButtonClass}
              disabled={!hasDrawnField}
              onClick={deleteField}
              title="Eingezeichnetes Feld mit Rand, Maßen, Hütchen, Toren und Spielern entfernen"
            >
              🗑 Feld löschen
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() => changeOptions(DEFAULT_FIELD_DRAW_OPTIONS)}
              title="Alle Aussehen-Einstellungen auf den Anfang zurücksetzen"
            >
              Standard
            </button>
            <span className="text-xs text-slate-500">
              Änderungen gelten sofort für das zuletzt eingezeichnete Feld und beim nächsten Einzeichnen.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
