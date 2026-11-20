import type { ReactNode } from 'react'
import { allCollapsed, useLayoutStore, type Bar } from '../store/layoutStore'

/** Small button that folds a bar away. */
export function CollapseButton({ bar, label, className = '' }: { bar: Bar; label: string; className?: string }) {
  const toggle = useLayoutStore((s) => s.toggle)
  return (
    <button
      type="button"
      title={`${label} einklappen`}
      aria-label={`${label} einklappen`}
      onClick={() => toggle(bar)}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white ${className}`}
    >
      <span aria-hidden>{bar === 'sidebar' ? '◂' : bar === 'timeline' ? '▾' : '▴'}</span>
    </button>
  )
}

/**
 * Thin strip shown instead of a folded bar; tapping it opens the bar again.
 * "side" is a narrow column next to the pitch on wide screens (a row on narrow ones).
 */
export function CollapsedStrip({
  bar,
  label,
  edge,
  children,
}: {
  bar: Bar
  label: string
  edge: 'top' | 'bottom' | 'side'
  children?: ReactNode
}) {
  const toggle = useLayoutStore((s) => s.toggle)
  const side = edge === 'side'
  const border =
    edge === 'bottom' ? 'border-t' : side ? 'border-b md:border-r md:border-b-0 md:w-9' : 'border-b'
  const arrow = side ? '▸' : edge === 'bottom' ? '▴' : '▾'
  return (
    <div className={`flex shrink-0 items-center gap-2 border-slate-700 bg-slate-900 ${side ? 'md:items-stretch' : 'pr-2'} ${border}`}>
      <button
        type="button"
        title={`${label} ausklappen`}
        onClick={() => toggle(bar)}
        className={`flex min-h-9 items-center gap-1.5 px-3 text-xs font-semibold text-slate-400 hover:text-white ${
          side ? 'md:h-full md:w-full md:justify-start md:px-0 md:py-3 md:[writing-mode:vertical-rl]' : ''
        }`}
      >
        <span aria-hidden>{arrow}</span>
        {label}
      </button>
      {children}
    </div>
  )
}

/** Overlay button on the pitch: fold all bars away for the biggest possible pitch, or open them again. */
export function MaximizeButton() {
  const maximized = useLayoutStore((s) => allCollapsed(s.collapsed))
  const toggleAll = useLayoutStore((s) => s.toggleAll)
  return (
    <button
      type="button"
      onClick={toggleAll}
      title={maximized ? 'Alle Leisten wieder anzeigen' : 'Alle Leisten einklappen – mehr Platz für das Feld'}
      className="absolute top-2 right-2 z-20 rounded-md bg-slate-900/80 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow hover:bg-slate-800"
    >
      {maximized ? '⤡ Leisten zeigen' : '⤢ Feld maximal'}
    </button>
  )
}
