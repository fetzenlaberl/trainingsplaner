import {
  dashStyle,
  LINE_PATTERN_LABELS,
  LINE_PATTERNS,
  LINE_WEIGHT_LABELS,
  LINE_WEIGHTS,
  weightFactor,
  type LinePattern,
  type LineWeight,
} from '../lines/styles'

const OPTION_CLASS = 'flex min-h-8 items-center justify-center rounded-md px-1.5'

function optionClass(active: boolean): string {
  return `${OPTION_CLASS} ${active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`
}

/** Small sample of a pattern, drawn the same way as on the pitch. */
function PatternIcon({ pattern }: { pattern: LinePattern }) {
  const width = 2.5
  const { dash, lineCap } = dashStyle(pattern, width)
  return (
    <svg width={30} height={12} viewBox="0 0 30 12" aria-hidden>
      <line
        x1={3}
        y1={6}
        x2={27}
        y2={6}
        stroke="currentColor"
        strokeWidth={width}
        strokeLinecap={lineCap}
        strokeDasharray={dash?.join(' ')}
      />
    </svg>
  )
}

function WeightIcon({ weight }: { weight: LineWeight }) {
  return (
    <svg width={24} height={12} viewBox="0 0 24 12" aria-hidden>
      <line x1={3} y1={6} x2={21} y2={6} stroke="currentColor" strokeWidth={2.4 * weightFactor(weight)} strokeLinecap="round" />
    </svg>
  )
}

interface LineStylePickerProps {
  /** 'auto' = the usual pattern of the line type (only offered when allowAuto is set) */
  pattern: LinePattern | 'auto'
  weight: LineWeight
  allowAuto?: boolean
  onPattern: (pattern: LinePattern | 'auto') => void
  onWeight: (weight: LineWeight) => void
}

/** Choice of line pattern (solid, dashed, dotted, dash-dot) and line weight. */
export function LineStylePicker({ pattern, weight, allowAuto, onPattern, onWeight }: LineStylePickerProps) {
  return (
    <>
      <div role="group" aria-label="Linienmuster" className="flex items-center gap-0.5 rounded-lg bg-slate-800 p-1">
        {allowAuto && (
          <button
            type="button"
            title="Wie üblich für den Linientyp (Laufweg gestrichelt, sonst durchgezogen)"
            aria-pressed={pattern === 'auto'}
            onClick={() => onPattern('auto')}
            className={`${optionClass(pattern === 'auto')} text-xs`}
          >
            Auto
          </button>
        )}
        {LINE_PATTERNS.map((p) => (
          <button
            key={p}
            type="button"
            title={LINE_PATTERN_LABELS[p]}
            aria-label={LINE_PATTERN_LABELS[p]}
            aria-pressed={pattern === p}
            onClick={() => onPattern(p)}
            className={optionClass(pattern === p)}
          >
            <PatternIcon pattern={p} />
          </button>
        ))}
      </div>
      <div role="group" aria-label="Linienstärke" className="flex items-center gap-0.5 rounded-lg bg-slate-800 p-1">
        {LINE_WEIGHTS.map((w) => (
          <button
            key={w}
            type="button"
            title={LINE_WEIGHT_LABELS[w]}
            aria-label={LINE_WEIGHT_LABELS[w]}
            aria-pressed={weight === w}
            onClick={() => onWeight(w)}
            className={optionClass(weight === w)}
          >
            <WeightIcon weight={w} />
          </button>
        ))}
      </div>
    </>
  )
}
