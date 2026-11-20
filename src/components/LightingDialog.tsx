import { useEffect } from 'react'
import {
  LIGHTING_OPTIONS,
  LIGHT_KINDS,
  LIGHT_SOURCES,
  resolveLighting,
  type LightSource,
  type PitchStyle,
} from '../field/pitchStyle'
import { useDrillStore } from '../store/drillStore'
import { buttonClass } from './ui'

/** Arrows for the 3 × 3 light source buttons (laid out as on screen); ︎ keeps them plain text, not emoji */
const SOURCE_SYMBOLS: Record<LightSource, string> = {
  topLeft: '↖︎',
  top: '↑︎',
  topRight: '↗︎',
  left: '←︎',
  center: '●',
  right: '→︎',
  bottomLeft: '↙︎',
  bottom: '↓︎',
  bottomRight: '↘︎',
}
const SOURCE_GRID: LightSource[] = ['topLeft', 'top', 'topRight', 'left', 'center', 'right', 'bottomLeft', 'bottom', 'bottomRight']

const choiceClass = (active: boolean) =>
  `min-h-9 rounded-md px-2 text-sm ${active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`

/**
 * Small window for the light over the pitch. Changes show at once; the pitch stays visible
 * (no dark backdrop), a tap beside the window closes it.
 */
export function LightingDialog({ onClose }: { onClose: () => void }) {
  const pitch = useDrillStore((s) => s.pitch)
  const setPitchLines = useDrillStore((s) => s.setPitchLines)
  const lighting = resolveLighting(pitch)
  const off = lighting === 'none'

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Choosing a direction or kind turns the light on if it is off.
  const change = (patch: Partial<Pick<PitchStyle, 'lightSource' | 'lightKind'>>) =>
    setPitchLines({ ...patch, ...(off ? { lighting: 'medium' as const } : {}) })

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end p-4 md:items-start md:pt-28"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-label="Lichtverlauf"
        className="flex max-h-full w-full max-w-xs flex-col gap-3 overflow-y-auto rounded-xl border border-slate-600 bg-slate-900/95 p-4 shadow-2xl"
      >
        <h2 className="text-base font-semibold text-white">Lichtverlauf</h2>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm text-slate-400">Stärke</legend>
          <div className="grid grid-cols-3 gap-1">
            {LIGHTING_OPTIONS.map((o) => (
              <button
                key={o.value ?? 'design'}
                type="button"
                aria-pressed={(pitch.lighting ?? null) === o.value}
                className={choiceClass((pitch.lighting ?? null) === o.value)}
                onClick={() => setPitchLines({ lighting: o.value ?? undefined })}
              >
                {o.value === 'none' ? 'Aus' : o.label}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm text-slate-400">Licht von (wie auf dem Bildschirm)</legend>
          <div className={`grid w-36 grid-cols-3 gap-1 self-center ${off ? 'opacity-60' : ''}`}>
            {SOURCE_GRID.map((source) => {
              const active = (pitch.lightSource ?? 'center') === source
              return (
                <button
                  key={source}
                  type="button"
                  aria-pressed={active}
                  aria-label={LIGHT_SOURCES.find((s) => s.value === source)?.label}
                  title={LIGHT_SOURCES.find((s) => s.value === source)?.label}
                  className={`${choiceClass(active)} h-11 text-lg`}
                  onClick={() => change({ lightSource: source })}
                >
                  {SOURCE_SYMBOLS[source]}
                </button>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm text-slate-400">Lichtart</legend>
          <div className="grid grid-cols-2 gap-1">
            {LIGHT_KINDS.map((o) => {
              const active = (pitch.lightKind ?? 'spot') === o.value
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={active}
                  className={`${choiceClass(active)}`}
                  onClick={() => change({ lightKind: o.value })}
                >
                  {o.label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <button type="button" className={`${buttonClass} justify-center bg-emerald-700 hover:bg-emerald-600`} onClick={onClose}>
          Fertig
        </button>
      </div>
    </div>
  )
}
