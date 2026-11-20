import { useRef } from 'react'
import { useDrillStore, type DrillContent } from '../store/drillStore'
import { inputClass } from './ui'

/** Text field that edits live and records one undo step when typing is finished. */
export function LabelInput({
  value,
  onChange,
  placeholder,
  caption = 'Beschriftung',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  caption?: string
}) {
  const snapshot = useDrillStore((s) => s.snapshot)
  const pushHistory = useDrillStore((s) => s.pushHistory)
  const beforeRef = useRef<DrillContent | null>(null)

  return (
    <label className="flex items-center gap-1.5 text-sm text-slate-400">
      {caption}
      <input
        className={`${inputClass} w-28`}
        value={value}
        placeholder={placeholder}
        maxLength={24}
        onFocus={() => {
          beforeRef.current = snapshot()
        }}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          if (beforeRef.current) pushHistory(beforeRef.current)
          beforeRef.current = null
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
        }}
      />
    </label>
  )
}

/** Row of round color buttons. */
export function ColorSwatches({
  label,
  colors,
  value,
  onSelect,
}: {
  label: string
  /** swatch: CSS background for the button when the value is not a plain color */
  colors: { value: string; name: string; swatch?: string }[]
  value: string
  onSelect: (color: string) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1">
      <span className="text-sm text-slate-400">{label}</span>
      {colors.map((c) => (
        <button
          key={c.value}
          type="button"
          title={c.name}
          aria-label={`${label}: ${c.name}`}
          aria-pressed={value === c.value}
          onClick={() => onSelect(c.value)}
          className={`h-7 w-7 rounded-full border-2 ${
            value === c.value ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-slate-600'
          }`}
          style={{ background: c.swatch ?? c.value }}
        />
      ))}
    </div>
  )
}
