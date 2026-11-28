import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  copyDesign,
  createDesignId,
  DESIGN_LINE_TYPES,
  designFromDrill,
  markingColor,
  NAME_TAG_MODES,
  NUMBER_MODES,
  playerNameList,
  type Design,
  type DesignLineType,
  type NameTagMode,
  type NumberMode,
  type PlayerNameEntry,
} from '../design/design'
import { deleteDesign, listDesigns, putDesigns } from '../design/designDb'
import {
  MOWING_OPTIONS,
  PITCH_COLOR_ORDER,
  PITCH_COLORS,
  PITCH_LINE_COLORS,
  PITCH_LINE_WIDTHS,
  type Mowing,
  type PitchColor,
  type PitchLineWidth,
} from '../field/pitchStyle'
import { useFocusTrap } from '../hooks/useFocusTrap'
import { clampItemSize, MAX_ITEM_SIZE, MIN_ITEM_SIZE } from '../items/palette'
import { LINE_PATTERN_LABELS, LINE_PATTERNS, LINE_WEIGHT_LABELS, LINE_WEIGHTS, type LinePattern, type LineWeight } from '../lines/styles'
import type { Drill, PlayerShape, SymbolStyle } from '../model/types'
import { buttonClass, dangerButtonClass, inputClass } from './ui'

const LINE_TYPE_LABELS: Record<DesignLineType, string> = {
  pass: 'Pass',
  run: 'Laufweg',
  dribble: 'Dribbling',
  shot: 'Schuss',
}

const SHAPE_LABELS: Record<PlayerShape, string> = {
  circle: 'Kreis',
  triangle: 'Dreieck',
  cross: 'Kreuz',
  shirt: 'Trikot',
}

const TEAM_LABELS = ['Team A', 'Team B', 'Neutrale']

const selectClass = `${inputClass} min-w-0`

export interface DesignDialogProps {
  /** The drill the design would be put on (for the preview count and "from this drill") */
  drill: Drill
  /** 'apply': design window of the editor; 'open': choose a design while opening a file; 'template': after choosing a template */
  mode: 'apply' | 'open' | 'template'
  /** Chosen design, or null = keep the look (only when opening) */
  /** design null = look stays as it is; names = changed name tags by player id */
  onChoose: (design: Design | null, names: Record<string, string>) => void
  onClose: () => void
}

/** Design templates: choose, create, change, delete, and put one onto the drill. */
export function DesignDialog({ drill, mode, onChoose, onClose }: DesignDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const [designs, setDesigns] = useState<Design[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const players = useMemo(() => playerNameList(drill), [drill])
  const [names, setNames] = useState<Record<string, string>>({})
  const namesChanged = Object.keys(names).length > 0

  useEffect(() => {
    let alive = true
    void listDesigns().then((list) => {
      if (!alive) return
      setDesigns(list)
      setSelectedId((id) => id ?? list[0]?.id ?? null)
    })
    return () => {
      alive = false
    }
  }, [])

  const selected = designs?.find((d) => d.id === selectedId) ?? null

  function store(design: Design) {
    setDesigns((list) => (list ? list.map((d) => (d.id === design.id ? design : d)) : list))
    putDesigns([design]).then(
      () => setError(null),
      (err) => {
        console.error(err)
        setError('Das Design konnte nicht gespeichert werden.')
      },
    )
  }

  function add(design: Design) {
    setDesigns((list) => [...(list ?? []), design])
    setSelectedId(design.id)
    store(design)
  }

  function change(update: (d: Design) => Design) {
    if (!selected || selected.builtIn) return
    store({ ...update(selected), updatedAt: Date.now() })
  }

  function handleCopy() {
    if (selected) add(copyDesign(selected, createDesignId(), Date.now()))
  }

  function handleFromDrill() {
    const name = window.prompt('Name des neuen Designs:', drill.title ? `Design aus „${drill.title}“` : 'Mein Design')
    if (!name?.trim()) return
    add(designFromDrill(drill, selected ?? designs![0], name.trim().slice(0, 80), createDesignId(), Date.now()))
  }

  function handleDelete() {
    if (!selected || selected.builtIn) return
    if (!window.confirm(`Design „${selected.name}“ löschen?`)) return
    const rest = (designs ?? []).filter((d) => d.id !== selected.id)
    setDesigns(rest)
    setSelectedId(rest[0]?.id ?? null)
    deleteDesign(selected.id).catch((err) => {
      console.error(err)
      setError('Das Design konnte nicht gelöscht werden.')
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="design-dialog-title"
        className="flex max-h-full w-full max-w-4xl flex-col gap-3 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl outline-none"
      >
        <div>
          <h2 id="design-dialog-title" className="text-base font-semibold text-white">
            {mode === 'open' ? 'Datei öffnen – Design wählen' : mode === 'template' ? 'Vorlage – Design wählen' : 'Design'}
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'open'
              ? 'Die Übung aus der Datei so lassen, wie sie ist, oder gleich in ein Design umstellen.'
              : mode === 'template'
                ? 'Die Vorlage so lassen, wie sie ist, oder Feld (Farbe, Muster, Linien) und Spieler (Form, Vollfarbe/Rand/Umriss, Größe, Farben) gleich in ein Design umstellen.'
              : 'Stellt die ganze Übung (alle Szenen) per Klick auf ein Design um: Feld, Teamfarben, Spieler, Hütchen, Linien und Zonen. Positionen und Texte bleiben.'}
          </p>
        </div>

        {designs === null ? (
          <p className="text-sm text-slate-400">Lädt …</p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto md:flex-row">
            <div role="listbox" aria-label="Designs" className="grid shrink-0 grid-cols-2 content-start gap-2 md:w-64 md:grid-cols-1">
              {designs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  role="option"
                  aria-selected={d.id === selectedId}
                  className={`flex items-center gap-2 rounded-md p-1.5 text-left text-sm transition-colors ${
                    d.id === selectedId ? 'bg-emerald-800 text-white ring-2 ring-emerald-400' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                  onClick={() => setSelectedId(d.id)}
                >
                  <DesignPreview design={d} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{d.name}</span>
                    {d.builtIn && <span className="text-xs text-slate-400">Fertiges Design</span>}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-3">
              {selected && <DesignEditor design={selected} onChange={change} />}
              <NameTagEditor players={players} names={names} onChange={setNames} />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-700 pt-3">
          <button type="button" className={buttonClass} disabled={!selected} onClick={handleCopy}>
            {selected?.builtIn ? 'Kopieren und ändern' : 'Kopieren'}
          </button>
          {mode === 'apply' && (
            <button type="button" className={buttonClass} disabled={!designs} onClick={handleFromDrill} title="Das Aussehen der offenen Übung als neues Design speichern">
              Aus dieser Übung übernehmen
            </button>
          )}
          {selected && !selected.builtIn && (
            <button type="button" className={dangerButtonClass} onClick={handleDelete}>
              Löschen
            </button>
          )}
          <span className="flex-1" />
          {mode === 'apply' && players.length > 0 && (
            <button type="button" className={buttonClass} disabled={!namesChanged} onClick={() => onChoose(null, names)}>
              Nur Namen übernehmen
            </button>
          )}
          {mode !== 'apply' ? (
            <button type="button" className={buttonClass} onClick={() => onChoose(null, names)}>
              {mode === 'open' ? 'Wie in der Datei' : 'Wie in der Vorlage'}
            </button>
          ) : (
            <button type="button" className={buttonClass} onClick={onClose}>
              Schließen
            </button>
          )}
          <button
            type="button"
            className={buttonClass.replace('bg-slate-800', 'bg-emerald-700').replace('hover:bg-slate-700', 'hover:bg-emerald-600')}
            disabled={!selected}
            onClick={() => selected && onChoose(selected, names)}
          >
            {mode === 'apply' ? 'Auf diese Übung anwenden' : mode === 'open' ? 'Mit diesem Design öffnen' : 'Mit diesem Design starten'}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Small picture of a design: pitch, marking line, three team colors and a pass. */
export function DesignPreview({ design }: { design: Design }) {
  const scheme = PITCH_COLORS[design.pitch.color]
  const marking = markingColor(design.pitch)
  const pass = design.lines.pass
  return (
    <svg viewBox="0 0 64 40" className="h-10 w-16 shrink-0 rounded" aria-hidden>
      <rect width="64" height="40" fill={design.pitch.gradient?.from ?? scheme.base} />
      {!design.pitch.gradient &&
        design.pitch.mowing !== 'none' &&
        scheme.stripe &&
        scheme.stripe !== scheme.base &&
        [0, 16, 32, 48].map((x) => <rect key={x} x={x} width="8" height="40" fill={scheme.stripe ?? undefined} />)}
      <rect x="3" y="3" width="58" height="34" rx={design.pitch.roundedCorners ? 3 : 0} fill="none" stroke={marking} strokeWidth="1" />
      <line x1="32" y1="3" x2="32" y2="37" stroke={marking} strokeWidth="1" />
      <line x1="14" y1="28" x2="44" y2="12" stroke={pass.color} strokeWidth="1.2" strokeDasharray={pass.pattern === 'solid' ? undefined : '3 2'} />
      {design.teams.map((color, i) => (
        <circle key={i} cx={[14, 44, 32][i]} cy={[28, 12, 22][i]} r="4" fill={color} stroke={design.player.symbol ? 'none' : '#ffffff'} strokeWidth="1" />
      ))}
      <path d="M50 30 l3 -6 l3 6 z" fill={design.coneColor} />
    </svg>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm text-slate-300">
      <span className="shrink-0">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5">{children}</span>
    </label>
  )
}

function ColorInput({ value, onChange, label, disabled }: { value: string; onChange: (v: string) => void; label: string; disabled: boolean }) {
  return (
    <input
      type="color"
      aria-label={label}
      title={label}
      disabled={disabled}
      className="h-9 w-11 cursor-pointer rounded border border-slate-600 bg-slate-800 p-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

/** Player size in percent (150 % = usual player size), or "keep" = null. */
function PercentInput({ value, onChange, disabled }: { value: number | null; onChange: (size: number | null) => void; disabled: boolean }) {
  const [draft, setDraft] = useState(value === null ? '' : String(Math.round(value * 100)))
  useEffect(() => setDraft(value === null ? '' : String(Math.round(value * 100))), [value])
  const commit = () => {
    const percent = Number(draft)
    if (!draft || !Number.isFinite(percent)) return setDraft(value === null ? '' : String(Math.round(value * 100)))
    onChange(clampItemSize(percent / 100))
  }
  return (
    <>
      <span className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          disabled={disabled}
          checked={value === null}
          onChange={(e) => onChange(e.target.checked ? null : 1.5)}
        />
        beibehalten
      </span>
      {value !== null && (
        <span className="flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            aria-label="Spielergröße in Prozent"
            title={`${Math.round(MIN_ITEM_SIZE * 100)}–${Math.round(MAX_ITEM_SIZE * 100)} %, 150 % = übliche Spielergröße`}
            className={`${inputClass} w-20`}
            disabled={disabled}
            min={Math.round(MIN_ITEM_SIZE * 100)}
            max={Math.round(MAX_ITEM_SIZE * 100)}
            step={5}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              const percent = Number(e.target.value)
              // Arrow keys and spinner: take valid values right away; typing finishes on leaving the field.
              if (e.target.value && percent >= MIN_ITEM_SIZE * 100 && percent <= MAX_ITEM_SIZE * 100) onChange(clampItemSize(percent / 100))
            }}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
          />
          %
        </span>
      )}
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border border-slate-700 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</legend>
      {children}
    </fieldset>
  )
}

/** Name tags of the players in this drill: add, change or remove (applied together with the design). */
function NameTagEditor({
  players,
  names,
  onChange,
}: {
  players: PlayerNameEntry[]
  names: Record<string, string>
  onChange: (names: Record<string, string>) => void
}) {
  if (players.length === 0) return null
  const value = (id: string, name: string) => names[id] ?? name
  function set(id: string, original: string, name: string) {
    const next = { ...names }
    if (name === original) delete next[id]
    else next[id] = name
    onChange(next)
  }
  const anyName = players.some((p) => value(p.id, p.name).trim())
  return (
    <Section title="Namensschilder dieser Übung">
      <p className="text-xs text-slate-400">
        Namen eintippen, ändern oder mit ✕ löschen. Sie werden mit dem Design übernommen und gelten in allen Szenen; danach gilt die Einstellung
        „Namensschilder“ oben.
      </p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {players.map((p) => {
          const v = value(p.id, p.name)
          const who = p.label || 'ohne Nummer'
          return (
            <div key={p.id} className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                style={{ background: p.color }}
                aria-hidden="true"
              >
                {p.label}
              </span>
              <input
                className={`${inputClass} min-w-0 flex-1`}
                value={v}
                maxLength={40}
                placeholder="Name hinzufügen"
                aria-label={`Name für Spieler ${who}`}
                onChange={(e) => set(p.id, p.name, e.target.value)}
              />
              <button
                type="button"
                className={`${buttonClass} w-9 justify-center px-0`}
                disabled={!v}
                aria-label={`Name von Spieler ${who} löschen`}
                onClick={() => set(p.id, p.name, '')}
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonClass}
          disabled={!anyName}
          onClick={() => onChange(Object.fromEntries(players.filter((p) => p.name).map((p) => [p.id, ''])))}
        >
          Alle Namen löschen
        </button>
        <button type="button" className={buttonClass} disabled={Object.keys(names).length === 0} onClick={() => onChange({})}>
          Änderungen verwerfen
        </button>
      </div>
    </Section>
  )
}

/** All settings of one design (read-only for ready-made designs). */
function DesignEditor({ design, onChange }: { design: Design; onChange: (update: (d: Design) => Design) => void }) {
  const ro = design.builtIn === true
  const pitch = design.pitch
  const lineColorKnown = PITCH_LINE_COLORS.some((c) => (c.value ?? undefined) === pitch.lineColor)
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3">
      <Row label="Name">
        <input
          className={`${inputClass} w-56`}
          value={design.name}
          disabled={ro}
          maxLength={80}
          onChange={(e) => onChange((d) => ({ ...d, name: e.target.value }))}
        />
      </Row>
      {ro && <p className="text-xs text-amber-300">Fertige Designs lassen sich nicht ändern. „Kopieren und ändern“ macht eine eigene Fassung.</p>}

      <div className="grid gap-3 lg:grid-cols-2">
        <Section title="Spielfeld">
          <Row label="Farbe / Belag">
            <select
              className={selectClass}
              disabled={ro}
              value={pitch.color}
              onChange={(e) => onChange((d) => ({ ...d, pitch: { ...d.pitch, color: e.target.value as PitchColor, gradient: undefined } }))}
            >
              {PITCH_COLOR_ORDER.map((c) => (
                <option key={c} value={c}>
                  {PITCH_COLORS[c].label}
                </option>
              ))}
            </select>
          </Row>
          <div className="grid grid-cols-8 gap-1" role="group" aria-label="Farbpalette des Spielfelds">
            {PITCH_COLOR_ORDER.map((c) => {
              const active = !pitch.gradient && pitch.color === c
              return (
                <button
                  key={c}
                  type="button"
                  disabled={ro}
                  title={PITCH_COLORS[c].label}
                  aria-label={`Feldfarbe: ${PITCH_COLORS[c].label}`}
                  aria-pressed={active}
                  onClick={() => onChange((d) => ({ ...d, pitch: { ...d.pitch, color: c, gradient: undefined } }))}
                  className={`aspect-square rounded border-2 disabled:cursor-not-allowed ${active ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-slate-600'}`}
                  style={{
                    background:
                      PITCH_COLORS[c].stripe && pitch.mowing !== 'none'
                        ? `repeating-linear-gradient(90deg, ${PITCH_COLORS[c].base} 0 4px, ${PITCH_COLORS[c].stripe} 4px 8px)`
                        : PITCH_COLORS[c].base,
                  }}
                />
              )
            })}
          </div>
          <Row label="Eigene Farbe">
            <input
              type="checkbox"
              disabled={ro}
              aria-label="Eigene Feldfarbe verwenden"
              checked={Boolean(pitch.gradient)}
              onChange={(e) =>
                onChange((d) => ({
                  ...d,
                  pitch: {
                    ...d.pitch,
                    gradient: e.target.checked ? { from: PITCH_COLORS[d.pitch.color].base, to: PITCH_COLORS[d.pitch.color].base, direction: 'leftRight' } : undefined,
                  },
                }))
              }
            />
            {pitch.gradient && (
              <ColorInput
                label="Eigene Feldfarbe"
                disabled={ro}
                value={pitch.gradient.from}
                onChange={(v) => onChange((d) => ({ ...d, pitch: { ...d.pitch, gradient: { from: v, to: v, direction: 'leftRight' } } }))}
              />
            )}
          </Row>
          <Row label="Muster">
            <select
              className={selectClass}
              disabled={ro}
              value={pitch.mowing ?? ''}
              title="Mähmuster des Rasens; „Keine Streifen“ = nur die Farbe"
              onChange={(e) => onChange((d) => ({ ...d, pitch: { ...d.pitch, mowing: (e.target.value || undefined) as Mowing | undefined } }))}
            >
              {MOWING_OPTIONS.map((m) => (
                <option key={m.label} value={m.value ?? ''}>
                  {m.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Linienfarbe">
            <select
              className={selectClass}
              disabled={ro}
              value={lineColorKnown ? (pitch.lineColor ?? '') : 'own'}
              onChange={(e) => {
                const v = e.target.value
                if (v === 'own') return
                onChange((d) => ({ ...d, pitch: { ...d.pitch, lineColor: v || undefined } }))
              }}
            >
              {PITCH_LINE_COLORS.map((c) => (
                <option key={c.label} value={c.value ?? ''}>
                  {c.label}
                </option>
              ))}
              {!lineColorKnown && <option value="own">Eigene Farbe</option>}
            </select>
            <ColorInput
              label="Eigene Linienfarbe"
              disabled={ro}
              value={markingColor(pitch)}
              onChange={(v) => onChange((d) => ({ ...d, pitch: { ...d.pitch, lineColor: v } }))}
            />
          </Row>
          <Row label="Linienstärke">
            <select
              className={selectClass}
              disabled={ro}
              value={pitch.lineWidth ?? 'normal'}
              onChange={(e) => onChange((d) => ({ ...d, pitch: { ...d.pitch, lineWidth: e.target.value as PitchLineWidth } }))}
            >
              {PITCH_LINE_WIDTHS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Ecken abgerundet">
            <input
              type="checkbox"
              className="h-5 w-5"
              disabled={ro}
              checked={pitch.roundedCorners === true}
              onChange={(e) => onChange((d) => ({ ...d, pitch: { ...d.pitch, roundedCorners: e.target.checked || undefined } }))}
            />
          </Row>
        </Section>

        <Section title="Teams und Material">
          {design.teams.map((color, i) => (
            <Row key={i} label={TEAM_LABELS[i]}>
              <ColorInput
                label={`Farbe ${TEAM_LABELS[i]}`}
                disabled={ro}
                value={color}
                onChange={(v) =>
                  onChange((d) => {
                    const teams = [...d.teams] as Design['teams']
                    teams[i] = v
                    return { ...d, teams }
                  })
                }
              />
            </Row>
          ))}
          <Row label="Hütchen und Teller">
            <ColorInput label="Farbe Hütchen" disabled={ro} value={design.coneColor} onChange={(v) => onChange((d) => ({ ...d, coneColor: v }))} />
          </Row>
          <Row label="Tore">
            <label className="flex items-center gap-1 text-xs text-slate-400">
              <input
                type="checkbox"
                className="h-4 w-4"
                disabled={ro}
                checked={design.goalColor === null}
                onChange={(e) => onChange((d) => ({ ...d, goalColor: e.target.checked ? null : '#ffffff' }))}
              />
              beibehalten
            </label>
            {design.goalColor !== null && (
              <ColorInput label="Farbe der Tore" disabled={ro} value={design.goalColor} onChange={(v) => onChange((d) => ({ ...d, goalColor: v }))} />
            )}
          </Row>
          <p className="text-xs text-slate-500">Die häufigste Spielerfarbe der Übung wird Team A, die zweite Team B, alle weiteren Neutrale.</p>
        </Section>

        <Section title="Spieler">
          <Row label="Form">
            <select
              className={selectClass}
              disabled={ro}
              value={design.player.shape}
              onChange={(e) => onChange((d) => ({ ...d, player: { ...d.player, shape: e.target.value as PlayerShape } }))}
            >
              {(Object.keys(SHAPE_LABELS) as PlayerShape[]).map((s) => (
                <option key={s} value={s}>
                  {SHAPE_LABELS[s]}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Darstellung">
            <select
              className={selectClass}
              disabled={ro}
              value={design.player.symbol ?? ''}
              onChange={(e) => onChange((d) => ({ ...d, player: { ...d.player, symbol: (e.target.value || null) as SymbolStyle | null } }))}
            >
              <option value="">Mit Rand</option>
              <option value="flat">Vollfarbe</option>
              <option value="outline">Umriss</option>
            </select>
          </Row>
          <Row label="Größe">
            <PercentInput
              disabled={ro}
              value={design.player.size}
              onChange={(size) => onChange((d) => ({ ...d, player: { ...d.player, size } }))}
            />
          </Row>
          <Row label="Nummer">
            <select
              className={selectClass}
              disabled={ro}
              value={design.player.numbers}
              onChange={(e) => onChange((d) => ({ ...d, player: { ...d.player, numbers: e.target.value as NumberMode } }))}
            >
              {NUMBER_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Namensschilder">
            <select
              className={selectClass}
              disabled={ro}
              value={design.player.names}
              onChange={(e) => onChange((d) => ({ ...d, player: { ...d.player, names: e.target.value as NameTagMode } }))}
            >
              {NAME_TAG_MODES.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Richtungspfeil">
            <input
              type="checkbox"
              className="h-5 w-5"
              disabled={ro}
              checked={design.player.facing}
              onChange={(e) => onChange((d) => ({ ...d, player: { ...d.player, facing: e.target.checked } }))}
            />
          </Row>
        </Section>

        <Section title="Zonen (mit Füllung)">
          <Row label="Rand">
            <ColorInput label="Randfarbe der Zonen" disabled={ro} value={design.zone.color} onChange={(v) => onChange((d) => ({ ...d, zone: { ...d.zone, color: v } }))} />
          </Row>
          <Row label="Füllung">
            <ColorInput label="Füllfarbe der Zonen" disabled={ro} value={design.zone.fillColor} onChange={(v) => onChange((d) => ({ ...d, zone: { ...d.zone, fillColor: v } }))} />
          </Row>
          <Row label={`Deckkraft ${Math.round(design.zone.fillOpacity * 100)} %`}>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              disabled={ro}
              value={Math.round(design.zone.fillOpacity * 100)}
              onChange={(e) => onChange((d) => ({ ...d, zone: { ...d.zone, fillOpacity: Number(e.target.value) / 100 } }))}
            />
          </Row>
          <p className="text-xs text-slate-500">Zonen ohne Füllung (z. B. Feldrand) bekommen die Linienfarbe des Spielfelds.</p>
        </Section>
      </div>

      <Section title="Linien">
        <div className="grid gap-2">
          {DESIGN_LINE_TYPES.map((type) => {
            const style = design.lines[type]
            const set = (change: Partial<typeof style>) =>
              onChange((d) => ({ ...d, lines: { ...d.lines, [type]: { ...d.lines[type], ...change } } }))
            return (
              <div key={type} className="flex items-center gap-1.5 text-sm text-slate-300">
                <span className="w-20 shrink-0">{LINE_TYPE_LABELS[type]}</span>
                <ColorInput label={`Farbe ${LINE_TYPE_LABELS[type]}`} disabled={ro} value={style.color} onChange={(v) => set({ color: v })} />
                <select
                  className={`${selectClass} flex-1`}
                  aria-label={`Muster ${LINE_TYPE_LABELS[type]}`}
                  disabled={ro}
                  value={style.pattern}
                  onChange={(e) => set({ pattern: e.target.value as LinePattern })}
                >
                  {LINE_PATTERNS.map((p) => (
                    <option key={p} value={p}>
                      {LINE_PATTERN_LABELS[p]}
                    </option>
                  ))}
                </select>
                <select
                  className={`${selectClass} flex-1`}
                  aria-label={`Stärke ${LINE_TYPE_LABELS[type]}`}
                  disabled={ro}
                  value={style.weight}
                  onChange={(e) => set({ weight: e.target.value as LineWeight })}
                >
                  {LINE_WEIGHTS.map((w) => (
                    <option key={w} value={w}>
                      {LINE_WEIGHT_LABELS[w]}
                    </option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-slate-500">Linien ohne Pfeil und Freihand bekommen die Farbe der Pässe, fixierte Linien die Linienfarbe des Spielfelds.</p>
      </Section>
    </div>
  )
}
