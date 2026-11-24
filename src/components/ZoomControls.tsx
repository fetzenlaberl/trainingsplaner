import { MAX_ZOOM, MIN_ZOOM } from '../field/zoom'

interface ZoomControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onFit: () => void
  /** Waiting for a rectangle to zoom into */
  areaMode: boolean
  onToggleArea: () => void
}

const BUTTON =
  'flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent'

/** Zoom buttons in the corner of the pitch. */
export function ZoomControls({ zoom, onZoomIn, onZoomOut, onFit, areaMode, onToggleArea }: ZoomControlsProps) {
  return (
    <div
      role="group"
      aria-label="Ansicht zoomen"
      className="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-lg bg-slate-900/85 p-1 shadow-lg"
    >
      <button type="button" className={BUTTON} aria-label="Herauszoomen" disabled={zoom <= MIN_ZOOM} onClick={onZoomOut}>
        −
      </button>
      <span className="w-12 text-center text-xs text-slate-300 tabular-nums">{Math.round(zoom * 100)} %</span>
      <button type="button" className={BUTTON} aria-label="Hineinzoomen" disabled={zoom >= MAX_ZOOM} onClick={onZoomIn}>
        +
      </button>
      <button
        type="button"
        aria-pressed={areaMode}
        title="Rechteck über den gewünschten Bereich ziehen, um dorthin zu zoomen"
        className={`${BUTTON} ${areaMode ? 'bg-emerald-600 hover:bg-emerald-500' : ''}`}
        onClick={onToggleArea}
      >
        ⬚<span className="hidden xl:inline"> Bereich</span>
      </button>
      <button type="button" className={BUTTON} title="Ganzes Feld zeigen" aria-label="Einpassen" disabled={zoom <= MIN_ZOOM} onClick={onFit}>
        ⤢<span className="hidden xl:inline"> Einpassen</span>
      </button>
    </div>
  )
}
