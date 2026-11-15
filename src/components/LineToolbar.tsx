import type { ReactNode } from 'react'
import { useDrillStore } from '../store/drillStore'
import { usePlaybackStore } from '../store/playbackStore'
import { useToolStore, type Tool } from '../store/toolStore'
import { SelectionBar } from './SelectionBar'

const LINE_COLORS: { value: string; name: string }[] = [
  { value: '#ffffff', name: 'Weiß' },
  { value: '#111827', name: 'Schwarz' },
  { value: '#facc15', name: 'Gelb' },
  { value: '#dc2626', name: 'Rot' },
  { value: '#2563eb', name: 'Blau' },
]

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
]

export function LineToolbar() {
  const tool = useToolStore((s) => s.tool)
  const setTool = useToolStore((s) => s.setTool)
  const lineColor = useToolStore((s) => s.lineColor)
  const setLineColor = useToolStore((s) => s.setLineColor)
  const select = useDrillStore((s) => s.select)

  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-700 bg-slate-900 px-3 py-2">
      <div role="group" aria-label="Werkzeug" className="flex flex-wrap gap-1 rounded-lg bg-slate-800 p-1">
        {TOOLS.map((t) => {
          const active = t.tool === tool
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
              className={`flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors ${
                active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {t.icon}
              {t.name}
            </button>
          )
        })}
      </div>

      <div role="group" aria-label="Linienfarbe" className="flex items-center gap-1.5">
        <span className="text-sm text-slate-400">Linienfarbe</span>
        {LINE_COLORS.map((c) => {
          const active = c.value === lineColor
          return (
            <button
              key={c.value}
              type="button"
              title={c.name}
              aria-label={c.name}
              aria-pressed={active}
              onClick={() => setLineColor(c.value)}
              className={`h-8 w-8 rounded-full border-2 ${
                active ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-slate-600'
              }`}
              style={{ backgroundColor: c.value }}
            />
          )
        })}
      </div>

      {tool === 'select' && (
        <div className="ml-auto">
          <SelectionBar />
        </div>
      )}
    </div>
  )
}
