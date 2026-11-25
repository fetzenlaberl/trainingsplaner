import type { Ref } from 'react'
import { inputClass } from './ui'

/**
 * Text field that starts with one line (or `minLines`) and grows with its text. An invisible copy of the text
 * in the same grid cell gives the height, so it also fits after rotating the device.
 * With `maxHeightClass` it stops growing there and scrolls inside.
 */
export function AutoTextarea({
  ref,
  value,
  onChange,
  label,
  placeholder,
  minLines = 1,
  maxLength,
  maxHeightClass,
  onFocus,
  onBlur,
}: {
  ref?: Ref<HTMLTextAreaElement>
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  minLines?: number
  maxLength?: number
  maxHeightClass?: string
  onFocus?: () => void
  onBlur?: () => void
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)]">
      <textarea
        ref={ref}
        rows={minLines}
        maxLength={maxLength}
        className={`${inputClass} col-start-1 row-start-1 resize-none py-2 leading-5.5 ${
          maxHeightClass ? `scheme-dark overflow-y-auto ${maxHeightClass}` : 'overflow-hidden'
        }`}
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {/* Slightly narrower than the field, as Safari on the iPad adds inner space to text fields.
          The added space keeps a line break at the end of the text visible. */}
      <div
        aria-hidden
        className={`invisible col-start-1 row-start-1 min-h-10 overflow-hidden border px-3 py-2 text-sm leading-5.5 break-words whitespace-pre-wrap ${maxHeightClass ?? ''}`}
      >
        {value || placeholder}{' '}
      </div>
    </div>
  )
}
