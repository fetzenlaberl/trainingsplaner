import type { ReactNode } from 'react'
import { LINE_COLORS } from '../lines/styles'
import { currentScene, useDrillStore } from '../store/drillStore'
import { usePlaybackStore } from '../store/playbackStore'
import { useToolStore, type Tool } from '../store/toolStore'
import { LineStylePicker } from './LineStylePicker'
import { SelectionBar } from './SelectionBar'
import { Popover, PopoverSection } from './Popover'


/** Small line style samples for the tool buttons. */
const ICON_PROPS = {
  width: 28,
  height: 14,
  viewBox: '0 0 28 14',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
}
const ARROW = <path d="M20 3 L26 7 L20 11 Z" fill="currentColor" strokeWidth={1} />

const TOOLS: { tool: Tool; name: string; icon: ReactNode }[] = [
  {
    tool: 'select',
    name: 'Auswählen',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M10 1 L10 13 L13 10 L16 13.5 L17.5 12.5 L15 9 L19 9 Z" fill="currentColor" strokeWidth={1} />
      </svg>
    ),
  },
  {
    tool: 'pass',
    name: 'Pass',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M2 7 H21" />
        {ARROW}
      </svg>
    ),
  },
  {
    tool: 'run',
    name: 'Laufweg',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M2 7 H21" strokeDasharray="4 3" strokeLinecap="butt" />
        {ARROW}
      </svg>
    ),
  },
  {
    tool: 'dribble',
    name: 'Dribbling',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M2 7 Q4.5 2 7 7 T12 7 T17 7 L21 7" />
        {ARROW}
      </svg>
    ),
  },
  {
    tool: 'shot',
    name: 'Schuss',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M2 5 H20 M2 9 H20" strokeWidth={1.6} />
        <path d="M19 1.5 L26 7 L19 12.5 Z" fill="currentColor" strokeWidth={1} />
      </svg>
    ),
  },
  {
    tool: 'line',
    name: 'Linie',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 7 H25" />
      </svg>
    ),
  },
  {
    tool: 'free',
    name: 'Freihand',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M2 10 C5 2 8 2 10 7 S15 13 18 6 S23 3 25 5" />
      </svg>
    ),
  },
]

/**
 * Shown when the scene has fixed elements: lets them be selected (to free them or change
 * their look); while it is off they ignore taps and drags.
 */
function LockedToggle() {
  const count = useDrillStore((s) => {
    const scene = currentScene(s)
    return [...scene.items, ...scene.lines, ...scene.zones].filter((e) => e.locked).length
  })
  const showLocked = useToolStore((s) => s.showLocked)
  const setShowLocked = useToolStore((s) => s.setShowLocked)
  if (count === 0 && !showLocked) return null
  return (
    <button
      type="button"
      aria-pressed={showLocked}
      title={
        showLocked
          ? 'Fixierte Teile lassen sich jetzt antippen (zum Lösen), aber nicht verschieben. Antippen zum Beenden.'
          : 'Fixierte Teile antippbar machen, um sie zu lösen oder zu ändern'
      }
      onClick={() => setShowLocked(!showLocked)}
      className={`flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm ${
        showLocked ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
    >
      🔒 Fixierte ({count}) {showLocked ? 'auswählbar' : 'auswählen'}
    </button>
  )
}

export function LineToolbar() {
  const tool = useToolStore((s) => s.tool)
  const setTool = useToolStore((s) => s.setTool)
  const lineColor = useToolStore((s) => s.lineColor)
  const setLineColor = useToolStore((s) => s.setLineColor)
  const linePattern = useToolStore((s) => s.linePattern)
  const setLinePattern = useToolStore((s) => s.setLinePattern)
  const lineWeight = useToolStore((s) => s.lineWeight)
  const setLineWeight = useToolStore((s) => s.setLineWeight)
  const numberSteps = useToolStore((s) => s.numberSteps)
  const sameStepOn = useToolStore((s) => s.sameStep)
  const setSameStep = useToolStore((s) => s.setSameStep)
  const setNumberSteps = useToolStore((s) => s.setNumberSteps)
  const renumberLineSteps = useDrillStore((s) => s.renumberLineSteps)
  const multiSelect = useToolStore((s) => s.multiSelect)
  const setMultiSelect = useToolStore((s) => s.setMultiSelect)
  const select = useDrillStore((s) => s.select)
  const penOnly = useToolStore((s) => s.penOnly)
  const setPenOnly = useToolStore((s) => s.setPenOnly)
  const freehand = tool === 'free' || tool === 'freeArrow'

  return (
    <div className="flex flex-col gap-2 border-b border-slate-700 bg-slate-900 py-2 pr-12 pl-3">
    <div className="flex flex-wrap items-center gap-2">
      <div role="group" aria-label="Werkzeug" className="flex flex-wrap gap-1 rounded-lg bg-slate-800 p-1">
        {TOOLS.map((t) => {
          const active = t.tool === tool || (t.tool === 'free' && tool === 'freeArrow')
          return (
            <button
              key={t.tool}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setTool(t.tool)
                usePlaybackStore.getState().stop()
                if (t.tool !== 'select') select(null)
              }}
              title={t.name}
              aria-label={t.name}
              className={`flex min-h-10 items-center gap-2 rounded-md px-2.5 text-sm font-medium transition-colors ${
                active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t.icon}
              <span className="hidden lg:inline">{t.name}</span>
            </button>
          )
        })}
      </div>

      {tool !== 'select' && (
        <Popover
          title="Farbe, Art und Schritt-Nummern der neuen Linien"
          label={
            <>
              <span aria-hidden className="h-5 w-5 rounded-full border-2 border-slate-500" style={{ background: lineColor }} />
              Stil
            </>
          }
        >
          <PopoverSection title="Farbe">
            <div className="grid w-full grid-cols-9 gap-1.5">
              {LINE_COLORS.map((c) => {
                const active = c.value === lineColor
                return (
                  <button
                    key={c.value}
                    type="button"
                    title={c.name}
                    aria-label={`Linienfarbe ${c.name}`}
                    aria-pressed={active}
                    onClick={() => setLineColor(c.value)}
                    className={`aspect-square rounded-full border-2 ${active ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-slate-600'}`}
                    style={{ backgroundColor: c.value }}
                  />
                )
              })}
            </div>
          </PopoverSection>
          <PopoverSection title="Art und Stärke">
            <LineStylePicker allowAuto pattern={linePattern} weight={lineWeight} onPattern={setLinePattern} onWeight={setLineWeight} />
          </PopoverSection>
          <PopoverSection title="Schritt-Nummern">
            <button
              type="button"
              aria-pressed={numberSteps}
              title="Neue Linien bekommen automatisch die nächste Schritt-Nummer"
              onClick={() => setNumberSteps(!numberSteps)}
              className={`flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm ${
                numberSteps ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}
            >
              ①②③ Nummerieren
            </button>
            {numberSteps && (
              <button
                type="button"
                aria-pressed={sameStepOn}
                title="Neue Linien bekommen dieselbe Nummer wie die letzte (gleichzeitige Aktionen); aus = nächste Nummer"
                onClick={() => setSameStep(!sameStepOn)}
                className={`flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm ${
                  sameStepOn ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                }`}
              >
                ①① Gleiche Nummer
              </button>
            )}
            <button
              type="button"
              title="Lücken in den Schritt-Nummern schließen"
              onClick={renumberLineSteps}
              className="flex min-h-10 items-center rounded-md bg-slate-700 px-3 text-sm text-slate-200 hover:bg-slate-600"
            >
              Neu nummerieren
            </button>
          </PopoverSection>
        </Popover>
      )}

      {freehand && (
        <button
          type="button"
          aria-pressed={tool === 'freeArrow'}
          title="Freihandlinien mit Pfeilspitze am Ende zeichnen"
          onClick={() => setTool(tool === 'freeArrow' ? 'free' : 'freeArrow')}
          className={`flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm ${
            tool === 'freeArrow' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          ➝ Pfeil
        </button>
      )}
      {tool !== 'select' && (
        <button
          type="button"
          aria-pressed={penOnly}
          title="Am Tablet: nur der Stift (z. B. Apple Pencil) zeichnet, mit dem Finger verschiebst und zoomst du"
          onClick={() => setPenOnly(!penOnly)}
          className={`flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm ${
            penOnly ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          ✎ <span className="hidden xl:inline">Nur Stift zeichnet</span>
        </button>
      )}
      {tool === 'select' && (
        <button
          type="button"
          aria-pressed={multiSelect}
          title="Jedes Antippen fügt hinzu oder entfernt (am PC auch mit Umschalt- oder Strg-Taste + Klick)"
          onClick={() => setMultiSelect(!multiSelect)}
          className={`flex min-h-10 items-center gap-1.5 rounded-md px-3 text-sm ${
            multiSelect ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          ⧉ Mehrfach
        </button>
      )}
      {tool === 'select' && <LockedToggle />}

    </div>
      {tool === 'select' && <SelectionBar />}
    </div>
  )
}
