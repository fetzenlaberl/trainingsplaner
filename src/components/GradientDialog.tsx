import { useEffect, useState } from 'react'
import {
  GRADIENT_DIRECTIONS,
  PITCH_COLORS,
  type GradientDirection,
  type PitchGradient,
} from '../field/pitchStyle'
import { useDrillStore } from '../store/drillStore'
import { buttonClass, inputClass } from './ui'

/** Quick picks; any other color can be chosen with the color field. */
const SWATCHES = [
  '#2f7d32',
  '#1d5524',
  '#4caf50',
  '#8bc34a',
  '#0f3d1a',
  '#1f5aa6',
  '#152a4d',
  '#47286f',
  '#a23b2f',
  '#cdb27e',
  '#5b6470',
  '#30353c',
  '#111214',
  '#ffffff',
]

function ColorPick({ label, value, onChange }: { label: string; value: string; onChange: (color: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm text-slate-400">{label}</legend>
      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={color}
            aria-pressed={value.toLowerCase() === color}
            onClick={() => onChange(color)}
            className={`h-8 w-8 rounded-md border ${
              value.toLowerCase() === color ? 'border-emerald-400 ring-2 ring-emerald-400' : 'border-slate-500'
            }`}
            style={{ background: color }}
          />
        ))}
        <label className="flex items-center gap-1 text-sm text-slate-400" title="Eigene Farbe wählen">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-slate-500 bg-transparent"
          />
          eigene
        </label>
      </div>
    </fieldset>
  )
}

/** Own pitch surface: two colors running into each other. */
export function GradientDialog({ onClose }: { onClose: () => void }) {
  const pitch = useDrillStore((s) => s.pitch)
  const setPitchLines = useDrillStore((s) => s.setPitchLines)
  const base = PITCH_COLORS[pitch.color].base
  const [from, setFrom] = useState(pitch.gradient?.from ?? base)
  const [to, setTo] = useState(pitch.gradient?.to ?? '#111214')
  const [direction, setDirection] = useState<GradientDirection>(pitch.gradient?.direction ?? 'leftRight')

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  function apply() {
    const gradient: PitchGradient = { from, to, direction }
    setPitchLines({ gradient })
    onClose()
  }

  const preview =
    direction === 'radial'
      ? `radial-gradient(circle, ${from}, ${to})`
      : `linear-gradient(${direction === 'leftRight' ? 'to right' : direction === 'topBottom' ? 'to bottom' : 'to bottom right'}, ${from}, ${to})`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form
        role="dialog"
        aria-label="Farbverlauf"
        className="flex max-h-full w-full max-w-md flex-col gap-3 overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 p-5 shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
      >
        <h2 className="text-lg font-semibold text-white">Farbverlauf</h2>
        <p className="text-sm text-slate-400">
          Zwei Farben, die ineinander übergehen. Mähmuster und Lichtverlauf werden darüber gezeichnet.
        </p>
        <ColorPick label="Erste Farbe" value={from} onChange={setFrom} />
        <ColorPick label="Zweite Farbe" value={to} onChange={setTo} />
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Richtung (wie auf dem Bildschirm)
          <select
            className={inputClass}
            value={direction}
            onChange={(e) => setDirection(e.target.value as GradientDirection)}
          >
            {GRADIENT_DIRECTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <div aria-hidden className="h-12 rounded-md border border-slate-600" style={{ background: preview }} />
        <div className="flex flex-wrap justify-end gap-2">
          {pitch.gradient && (
            <button
              type="button"
              className={`${buttonClass} mr-auto`}
              onClick={() => {
                setPitchLines({ gradient: undefined })
                onClose()
              }}
            >
              Verlauf entfernen
            </button>
          )}
          <button type="button" className={buttonClass} onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className={`${buttonClass} bg-emerald-700 hover:bg-emerald-600`}>
            Übernehmen
          </button>
        </div>
      </form>
    </div>
  )
}
