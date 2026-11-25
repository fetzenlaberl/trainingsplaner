import { useState, type ReactNode } from 'react'
import { FIELD_TYPE_LABELS, FIELD_TYPES } from '../field/dimensions'
import type { Orientation } from '../field/orientation'
import {
  GRID_LABEL_KINDS,
  GRID_LABEL_POSITIONS,
  GRID_LABEL_SIZES,
  GRID_LABELS,
  GRID_ORDER,
  LIGHT_SOURCES,
  LIGHTING_OPTIONS,
  MOWING_OPTIONS,
  ORIENTATION_LABELS,
  PITCH_COLOR_ORDER,
  PITCH_COLORS,
  PITCH_LINE_COLORS,
  PITCH_LINE_WIDTHS,
  resolveLighting,
  type GridLabelStyle,
  type GridType,
  type Mowing,
} from '../field/pitchStyle'
import { useDrillStore } from '../store/drillStore'
import { useLayoutStore } from '../store/layoutStore'
import { CustomGridDialog } from './CustomGridDialog'
import { AreaInputs } from './EmptyFieldControls'
import { GradientDialog } from './GradientDialog'
import { LightingDialog } from './LightingDialog'
import { buttonClass } from './ui'

const SECTIONS_KEY = 'trainingsplaner.fieldPanelSections'
type SectionKey = 'type' | 'look' | 'lines' | 'grid' | 'extras'
const DEFAULT_OPEN: Record<SectionKey, boolean> = { type: true, look: true, lines: false, grid: false, extras: false }

function loadOpen(): Record<SectionKey, boolean> {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(SECTIONS_KEY) ?? 'null')
    if (typeof data !== 'object' || data === null) return DEFAULT_OPEN
    const r = data as Record<string, unknown>
    return Object.fromEntries(
      (Object.keys(DEFAULT_OPEN) as SectionKey[]).map((k) => [k, typeof r[k] === 'boolean' ? r[k] : DEFAULT_OPEN[k]]),
    ) as Record<SectionKey, boolean>
  } catch {
    return DEFAULT_OPEN
  }
}

const ORIENTATIONS: Orientation[] = ['landscape', 'portrait']
const BACKGROUND_OPACITIES = [
  { value: 1, label: 'Deckend' },
  { value: 0.7, label: '70 %' },
  { value: 0.4, label: '40 %' },
]

const chip = (active: boolean) =>
  `min-h-9 rounded-md px-2.5 text-sm font-medium transition-colors ${
    active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
  }`
const selectClass = 'min-h-9 w-full rounded-md border border-slate-700 bg-slate-800 px-2 text-sm text-slate-200'
const label = 'text-xs font-medium text-slate-400'

/**
 * Everything about the pitch in one place, next to the pitch (so changes stay visible):
 * field type and own size, colour and surface, lines, grid and notes. Sections fold away
 * and stay as they were on this device.
 */
export function FieldPanel({ fullWidth = false }: { fullWidth?: boolean } = {}) {
  const pitch = useDrillStore((s) => s.pitch)
  const fieldType = useDrillStore((s) => s.fieldType)
  const setFieldType = useDrillStore((s) => s.setFieldType)
  const setPitchColor = useDrillStore((s) => s.setPitchColor)
  const setGrid = useDrillStore((s) => s.setGrid)
  const setOrientation = useDrillStore((s) => s.setOrientation)
  const setPitchLines = useDrillStore((s) => s.setPitchLines)
  const setPitchBackground = useDrillStore((s) => s.setPitchBackground)
  const close = () => useLayoutStore.getState().setFieldPanel(false)
  const [open, setOpenState] = useState(loadOpen)
  const [customOpen, setCustomOpen] = useState(false)
  const [gradientOpen, setGradientOpen] = useState(false)
  const [lightingOpen, setLightingOpen] = useState(false)

  const toggle = (key: SectionKey) =>
    setOpenState((o) => {
      const next = { ...o, [key]: !o[key] }
      try {
        localStorage.setItem(SECTIONS_KEY, JSON.stringify(next))
      } catch {
        // Only a convenience.
      }
      return next
    })

  const lighting = resolveLighting(pitch)
  const lightingSummary =
    lighting === 'none'
      ? 'aus'
      : `${LIGHTING_OPTIONS.find((o) => o.value === lighting)?.label ?? ''}, ${
          LIGHT_SOURCES.find((o) => o.value === (pitch.lightSource ?? 'center'))?.label ?? ''
        }`
  const usualKind = pitch.grid.startsWith('letters') ? 'letters' : 'numbers'
  const labelStyle: GridLabelStyle = pitch.gridLabelStyle ?? {
    kind: usualKind,
    position: pitch.grid.startsWith('letters') ? 'outside' : 'corner',
    size: 'medium',
  }
  const setLabels = (change: Partial<GridLabelStyle>) =>
    setPitchLines({ gridLabelStyle: { ...labelStyle, ...change, ...(labelStyle.kind === 'none' && !change.kind ? { kind: usualKind } : {}) } })
  const colorName = pitch.gradient ? 'Eigener Farbverlauf' : PITCH_COLORS[pitch.color].label

  return (
    <aside
      aria-label="Feld einstellen"
      // Below 1024 px (iPad upright) it lies over the pitch; wider it sits next to it.
      // On the phone it is a sheet at the bottom; the pitch above shrinks so it stays fully visible.
      className={
        fullWidth
          ? 'flex h-[60%] shrink-0 flex-col rounded-t-2xl border-t border-slate-600 bg-slate-900 shadow-2xl'
          : 'absolute inset-y-0 right-0 z-30 flex w-80 max-w-[90%] shrink-0 flex-col border-l border-slate-700 bg-slate-900 shadow-2xl lg:static lg:z-auto lg:w-96 lg:max-w-none lg:shadow-none'
      }
    >
      <div className="flex items-center justify-between border-b border-slate-700 px-3 py-2">
        <h2 className="text-sm font-semibold text-white">Feld</h2>
        <button type="button" className={`${buttonClass} w-10 justify-center px-0`} aria-label="Feld-Fenster schließen" title="Schließen" onClick={close}>
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Feldart" summary={FIELD_TYPE_LABELS[fieldType]} open={open.type} onToggle={() => toggle('type')}>
          <div className="grid grid-cols-2 gap-1">
            {FIELD_TYPES.map((type) => (
              <button key={type} type="button" aria-pressed={type === fieldType} className={chip(type === fieldType)} onClick={() => setFieldType(type)}>
                {FIELD_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className={`${label} mr-1`}>Ausrichtung</span>
            {ORIENTATIONS.map((o) => (
              <button key={o} type="button" aria-pressed={pitch.orientation === o} className={chip(pitch.orientation === o)} onClick={() => setOrientation(o)}>
                {ORIENTATION_LABELS[o]}
              </button>
            ))}
          </div>
          {fieldType === 'empty' && (
            <div className="rounded-lg border border-slate-700 bg-slate-950/40 p-2">
              <AreaInputs />
            </div>
          )}
        </Section>

        <Section title="Farbe und Belag" summary={colorName} open={open.look} onToggle={() => toggle('look')}>
          <div className="grid grid-cols-7 gap-1.5">
            {PITCH_COLOR_ORDER.map((c) => {
              const active = !pitch.gradient && pitch.color === c
              return (
                <button
                  key={c}
                  type="button"
                  title={PITCH_COLORS[c].label}
                  aria-label={`Feldfarbe: ${PITCH_COLORS[c].label}`}
                  aria-pressed={active}
                  onClick={() => setPitchColor(c)}
                  className={`aspect-square rounded-md border-2 ${active ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-slate-600'}`}
                  style={{
                    background: PITCH_COLORS[c].stripe
                      ? `repeating-linear-gradient(90deg, ${PITCH_COLORS[c].base} 0 5px, ${PITCH_COLORS[c].stripe} 5px 10px)`
                      : PITCH_COLORS[c].base,
                  }}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-1">
            <button type="button" className={chip(Boolean(pitch.gradient))} onClick={() => setGradientOpen(true)}>
              {pitch.gradient ? 'Farbverlauf ändern …' : 'Farbverlauf …'}
            </button>
            <button type="button" className={chip(lighting !== 'none')} onClick={() => setLightingOpen(true)}>
              Licht: {lightingSummary} …
            </button>
          </div>
          <label className="flex flex-col gap-1">
            <span className={label}>Mähmuster</span>
            <select
              className={selectClass}
              value={pitch.mowing ?? ''}
              onChange={(e) => setPitchLines({ mowing: (e.target.value || undefined) as Mowing | undefined })}
            >
              {MOWING_OPTIONS.map((o) => (
                <option key={o.value ?? ''} value={o.value ?? ''}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {pitch.background && (
            <div className="flex flex-wrap items-center gap-1">
              <span className={`${label} mr-1`}>Hintergrundbild</span>
              {BACKGROUND_OPACITIES.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={chip((pitch.backgroundOpacity ?? 1) === o.value)}
                  onClick={() => setPitchBackground({ backgroundOpacity: o.value })}
                >
                  {o.label}
                </button>
              ))}
              <button type="button" className={chip(false)} onClick={() => setPitchBackground({ background: undefined })}>
                Entfernen
              </button>
            </div>
          )}
        </Section>

        <Section
          title="Linien"
          summary={PITCH_LINE_WIDTHS.find((w) => w.value === (pitch.lineWidth ?? 'normal'))?.label}
          open={open.lines}
          onToggle={() => toggle('lines')}
        >
          <div className="flex flex-wrap gap-1">
            {PITCH_LINE_WIDTHS.map((w) => (
              <button
                key={w.value}
                type="button"
                className={chip((pitch.lineWidth ?? 'normal') === w.value)}
                onClick={() => setPitchLines({ lineWidth: w.value })}
              >
                {w.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`${label} mr-1`}>Farbe</span>
            {PITCH_LINE_COLORS.map((c) => {
              const active = (pitch.lineColor ?? null) === c.value
              return (
                <button
                  key={c.label}
                  type="button"
                  title={c.label}
                  aria-label={`Linienfarbe: ${c.label}`}
                  aria-pressed={active}
                  onClick={() => setPitchLines({ lineColor: c.value ?? undefined })}
                  className={`h-7 w-7 rounded-full border-2 ${active ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-slate-600'}`}
                  style={{ background: c.value ?? 'linear-gradient(135deg, #ffffff 50%, #1f2937 50%)' }}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-1">
            <button type="button" aria-pressed={pitch.roundedCorners === true} className={chip(pitch.roundedCorners === true)} onClick={() => setPitchLines({ roundedCorners: !pitch.roundedCorners })}>
              Ecken abgerundet
            </button>
            <button
              type="button"
              aria-pressed={pitch.retreatLines === true}
              title="Nur auf dem Großfeld (Ganzfeld, Halbfeld, Strafraum, Ecken)"
              className={chip(pitch.retreatLines === true)}
              onClick={() => setPitchLines({ retreatLines: !pitch.retreatLines })}
            >
              Rückzugslinien 22 m
            </button>
          </div>
        </Section>

        <Section title="Raster" summary={GRID_LABELS[pitch.grid]} open={open.grid} onToggle={() => toggle('grid')}>
          <select
            className={selectClass}
            aria-label="Raster"
            value={pitch.grid}
            onChange={(e) => {
              const grid = e.target.value as GridType
              // The own grid asks for its sizes first.
              if (grid === 'custom') setCustomOpen(true)
              else setGrid(grid)
            }}
          >
            {GRID_ORDER.map((g) => (
              <option key={g} value={g}>
                {GRID_LABELS[g]}
              </option>
            ))}
          </select>
          {pitch.grid === 'custom' && (
            <button type="button" className={chip(false)} onClick={() => setCustomOpen(true)}>
              Eigenes Raster ändern …
            </button>
          )}
          {pitch.grid !== 'none' && (
            <div className="grid grid-cols-2 gap-1.5">
              <label className="flex flex-col gap-1">
                <span className={label}>Beschriftung</span>
                <select
                  className={selectClass}
                  value={pitch.gridLabelStyle?.kind ?? ''}
                  onChange={(e) =>
                    e.target.value === ''
                      ? setPitchLines({ gridLabelStyle: undefined })
                      : setLabels({ kind: e.target.value as GridLabelStyle['kind'] })
                  }
                >
                  {GRID_LABEL_KINDS.map((k) => (
                    <option key={k.value ?? ''} value={k.value ?? ''}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="order-last col-span-2 flex flex-col gap-1">
                <span className={label}>Position</span>
                <select className={selectClass} value={labelStyle.position} onChange={(e) => setLabels({ position: e.target.value as GridLabelStyle['position'] })}>
                  {GRID_LABEL_POSITIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className={label}>Größe</span>
                <select className={selectClass} value={labelStyle.size} onChange={(e) => setLabels({ size: e.target.value as GridLabelStyle['size'] })}>
                  {GRID_LABEL_SIZES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </Section>

        <Section title="Notizen" summary={pitch.showNotes ? 'an' : 'aus'} open={open.extras} onToggle={() => toggle('extras')}>
          <button
            type="button"
            aria-pressed={pitch.showNotes === true}
            className={chip(pitch.showNotes === true)}
            onClick={() => setPitchLines({ showNotes: !pitch.showNotes })}
          >
            📝 Notizen unter dem Feld
          </button>
          <p className="text-xs text-slate-400">Die Notizen kommen beim Export als PNG und PDF mit.</p>
        </Section>
      </div>
      {customOpen && <CustomGridDialog onClose={() => setCustomOpen(false)} />}
      {gradientOpen && <GradientDialog onClose={() => setGradientOpen(false)} />}
      {lightingOpen && <LightingDialog onClose={() => setLightingOpen(false)} />}
    </aside>
  )
}

/** A foldable part of a panel: title with a short summary of the current choice. */
export function Section({
  title,
  summary,
  open,
  onToggle,
  children,
}: {
  title: string
  summary?: string
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <section className="border-b border-slate-800">
      <button
        type="button"
        aria-expanded={open}
        onClick={onToggle}
        className="flex min-h-11 w-full items-center gap-2 px-3 text-left hover:bg-slate-800/60"
      >
        <span aria-hidden className="w-3 text-xs text-slate-400">
          {open ? '▾' : '▸'}
        </span>
        <span className="text-sm font-semibold text-slate-100">{title}</span>
        {summary && <span className="ml-auto truncate text-xs text-slate-400">{summary}</span>}
      </button>
      {open && <div className="flex flex-col gap-2 px-3 pb-3">{children}</div>}
    </section>
  )
}
