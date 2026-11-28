import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  copyDesign,
  createDesignId,
  DESIGN_LINE_TYPES,
  designFromDrill,
  markingColor,
  NAME_TAG_MODES,
  type Design,
  type DesignLineType,
  type NameTagMode,
} from '../design/design'
import { deleteDesign, listDesigns, putDesigns } from '../design/designDb'
import { PITCH_COLOR_ORDER, PITCH_COLORS, PITCH_LINE_COLORS, PITCH_LINE_WIDTHS, type PitchColor, type PitchLineWidth } from '../field/pitchStyle'
import { useFocusTrap } from '../hooks/useFocusTrap'
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
  /** 'apply': design window of the editor; 'open': choose a design while opening a file */
  mode: 'apply' | 'open'
  /** Chosen design, or null = keep the look (only when opening) */
  onChoose: (design: Design | null) => void
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
            {mode === 'open' ? 'Datei öffnen – Design wählen' : 'Design'}
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'open'
              ? 'Die Übung aus der Datei so lassen, wie sie ist, oder gleich in ein Design umstellen.'
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

            {selected && <DesignEditor design={selected} onChange={change} />}
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
          {mode === 'open' ? (
            <button type="button" className={buttonClass} onClick={() => onChoose(null)}>
              Wie in der Datei
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
            onClick={() => selected && onChoose(selected)}
          >
            {mode === 'open' ? 'Mit diesem Design öffnen' : 'Auf diese Übung anwenden'}
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2 rounded-lg border border-slate-700 p-3">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</legend>
      {children}
    </fieldset>
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
            <select
              className={selectClass}
              disabled={ro}
              value={design.player.size === null ? '' : String(design.player.size)}
              onChange={(e) => onChange((d) => ({ ...d, player: { ...d.player, size: e.target.value ? Number(e.target.value) : null } }))}
            >
              <option value="">Beibehalten</option>
              {[1, 1.25, 1.5, 1.75, 2].map((s) => (
                <option key={s} value={s}>
                  {s.toLocaleString('de-DE')}
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
