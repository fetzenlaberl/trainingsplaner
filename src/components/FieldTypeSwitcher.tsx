import { useEffect, useState } from 'react'
import { FIELD_TYPE_LABELS, FIELD_TYPES, MAX_AREA, MIN_AREA, type FieldArea } from '../field/dimensions'
import { isHexColor } from '../field/pitchStyle'
import { MAX_ZONE_FILL_OPACITY, ZONE_COLORS } from '../items/zones'
import { LINE_COLORS, LINE_PATTERNS, LINE_WEIGHTS, type LinePattern, type LineWeight } from '../lines/styles'
import {
  areaForPlayers,
  customFieldScene,
  DEFAULT_FIELD_DRAW_OPTIONS,
  formatName,
  MAX_TEAM_PLAYERS,
  type FieldDrawOptions,
} from '../model/fieldTemplates'
import { currentScene, useDrillStore } from '../store/drillStore'
import { ColorSwatches } from './controls'
import { LineStylePicker } from './LineStylePicker'
import { buttonClass } from './ui'

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

/** Remembered look of the drawn-in field (per device; falls back to the defaults). */
function loadDrawOptions(): FieldDrawOptions {
  const d = DEFAULT_FIELD_DRAW_OPTIONS
  try {
    const raw = localStorage.getItem(OPTIONS_KEY)
    if (!raw) return d
    const v = JSON.parse(raw) as Partial<FieldDrawOptions>
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

/** Players per team from an input, or null when it is not a valid count. */
function playerCount(value: string): number | null {
  const n = Number(value)
  return value.trim() !== '' && Number.isInteger(n) && n >= 0 && n <= MAX_TEAM_PLAYERS ? n : null
}

/**
 * Own size of the empty field: length × width in meters (empty = as big as the big pitch),
 * or the other way round from a player count; draws the field in with the chosen look.
 */
function AreaInputs() {
  const area = useDrillStore((s) => s.pitch.area)
  const setFieldArea = useDrillStore((s) => s.setFieldArea)
  const [length, setLength] = useState(area ? String(area.length) : '')
  const [width, setWidth] = useState(area ? String(area.width) : '')
  const [teamA, setTeamA] = useState('')
  const [teamB, setTeamB] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [options, setOptions] = useState<FieldDrawOptions>(loadDrawOptions)
  const [showOptions, setShowOptions] = useState(false)

  // Follow undo/redo and loaded drills.
  useEffect(() => {
    setLength(area ? String(area.length) : '')
    setWidth(area ? String(area.width) : '')
  }, [area])

  function changeOptions(change: Partial<FieldDrawOptions>) {
    const next = { ...options, ...change }
    setOptions(next)
    saveDrawOptions(next)
  }

  function commit(nextLength: string, nextWidth: string) {
    const l = Number(nextLength)
    const w = Number(nextWidth)
    if (nextLength.trim() === '' && nextWidth.trim() === '') setFieldArea(null)
    else if (l > 0 && w > 0) setFieldArea({ length: l, width: w })
  }

  const a = playerCount(teamA)
  const b = playerCount(teamB)
  const teams: [number, number] | null = a !== null && b !== null && a + b > 0 ? [a, b] : null

  /** Outline with the size, size labels and the players; replaces the scene (undo possible). */
  function drawField(size: FieldArea, chosenTeams?: [number, number]) {
    const state = useDrillStore.getState()
    const scene = currentScene(state)
    const filled = scene.items.length + scene.lines.length + scene.zones.length > 0
    if (filled && !window.confirm('Die Szene enthält schon Objekte. Durch das eingezeichnete Feld ersetzen? (Rückgängig möglich)')) return
    const { items, lines, zones, format } = customFieldScene(size, state.pitch.orientation, options, chosenTeams)
    // Own ids, so nothing is mixed up with items of other scenes.
    const suffix = Date.now().toString(36)
    state.replaceSceneContent({
      items: items.map((i) => ({ ...i, id: `${i.id}-${suffix}` })),
      lines: lines.map((l) => ({ ...l, id: `${l.id}-${suffix}` })),
      zones: zones.map((z) => ({ ...z, id: `${z.id}-${suffix}` })),
    })
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

  const input =
    'min-h-10 w-14 rounded-md border border-slate-600 bg-slate-900 px-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'
  const drawButton = `${buttonClass} bg-emerald-700 text-white hover:bg-emerald-600`
  const choice = (active: boolean) =>
    `min-h-8 rounded-md px-2 text-sm ${active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`

  return (
    <div className="relative flex flex-wrap items-center gap-x-3 gap-y-1 px-2 text-sm text-slate-300">
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
          aria-label="Spieler Team Blau"
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
          aria-label="Spieler Team Rot"
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
        className={`${buttonClass} ${showOptions ? 'bg-slate-600 text-white' : ''}`}
        aria-expanded={showOptions}
        onClick={() => setShowOptions(!showOptions)}
        title="Aussehen des eingezeichneten Felds: Randlinie, Füllung, Ecken, Spieler"
      >
        Aussehen {showOptions ? '▴' : '▾'}
      </button>
      {message && <span className="text-xs text-emerald-300">{message}</span>}

      {showOptions && (
        <div className="absolute top-full left-0 z-30 mt-2 flex w-max max-w-[min(40rem,calc(100vw-2rem))] flex-col gap-2 rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-400">Rand</span>
            <LineStylePicker
              pattern={options.pattern}
              weight={options.weight}
              onPattern={(pattern) => pattern !== 'auto' && changeOptions({ pattern })}
              onWeight={(weight) => changeOptions({ weight })}
            />
          </div>
          <ColorSwatches label="Randfarbe" colors={LINE_COLORS} value={options.color} onSelect={(color) => changeOptions({ color })} />
          <div className="flex flex-wrap items-center gap-1">
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
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-sm text-slate-400">Ecken</span>
            <button type="button" aria-pressed={!options.rounded} className={choice(!options.rounded)} onClick={() => changeOptions({ rounded: false })}>
              Eckig
            </button>
            <button type="button" aria-pressed={options.rounded} className={choice(options.rounded)} onClick={() => changeOptions({ rounded: true })}>
              Abgerundet
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-sm text-slate-400">Spieler</span>
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
          </div>
          <p className="text-xs text-slate-500">
            Gilt beim nächsten Einzeichnen. Ein schon eingezeichnetes Feld antippen und in der Leiste ändern.
          </p>
        </div>
      )}
    </div>
  )
}
