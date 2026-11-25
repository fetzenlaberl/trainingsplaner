import { inputClass } from './ui'

/**
 * Text field that starts with one line (or `minLines`) and grows with its text. An invisible copy of the text
 * in the same grid cell gives the height, so it also fits after rotating the device.
 */
export function AutoTextarea({
  value,
  onChange,
  label,
  placeholder,
  minLines = 1,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  minLines?: number
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)]">
      <textarea
        rows={minLines}
        className={`${inputClass} col-start-1 row-start-1 resize-none overflow-hidden py-2 leading-5.5`}
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {/* Slightly narrower than the field, as Safari on the iPad adds inner space to text fields.
          The added space keeps a line break at the end of the text visible. */}
      <div
        aria-hidden
        className="invisible col-start-1 row-start-1 min-h-10 border px-3 py-2 text-sm leading-5.5 break-words whitespace-pre-wrap"
      >
        {value || placeholder}{' '}
      </div>
    </div>
  )
}
