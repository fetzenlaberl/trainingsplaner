import { useEffect, useState } from 'react'
import { FIELD_TYPE_LABELS, FIELD_TYPES, MAX_AREA, MIN_AREA } from '../field/dimensions'
import { useDrillStore } from '../store/drillStore'

export function FieldTypeSwitcher() {
  const fieldType = useDrillStore((s) => s.fieldType)
  const setFieldType = useDrillStore((s) => s.setFieldType)

  return (
    <div role="group" aria-label="Feldtyp" className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-800 p-1">
      {FIELD_TYPES.map((type) => {
        const active = type === fieldType
        return (
          <button
            key={type}
            type="button"
            aria-pressed={active}
            onClick={() => setFieldType(type)}
            className={`min-h-10 rounded-md px-3 text-sm font-medium transition-colors ${
              active ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            {FIELD_TYPE_LABELS[type]}
          </button>
        )
      })}
      {fieldType === 'empty' && <AreaInputs />}
    </div>
  )
}

/** Own size of the empty field: length × width in meters (empty = as big as the big pitch). */
function AreaInputs() {
  const area = useDrillStore((s) => s.pitch.area)
  const setFieldArea = useDrillStore((s) => s.setFieldArea)
  const [length, setLength] = useState(area ? String(area.length) : '')
  const [width, setWidth] = useState(area ? String(area.width) : '')

  // Follow undo/redo and loaded drills.
  useEffect(() => {
    setLength(area ? String(area.length) : '')
    setWidth(area ? String(area.width) : '')
  }, [area])

  function commit(nextLength: string, nextWidth: string) {
    const l = Number(nextLength)
    const w = Number(nextWidth)
    if (nextLength.trim() === '' && nextWidth.trim() === '') setFieldArea(null)
    else if (l > 0 && w > 0) setFieldArea({ length: l, width: w })
  }

  const input =
    'min-h-10 w-16 rounded-md border border-slate-600 bg-slate-900 px-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'
  return (
    <label
      className="flex items-center gap-1 px-2 text-sm text-slate-300"
      title={`Eigene Größe der Fläche (${MIN_AREA}–${MAX_AREA} m); leer = so groß wie das Großfeld`}
    >
      Größe
      <input
        type="number"
        inputMode="numeric"
        min={MIN_AREA}
        max={MAX_AREA}
        aria-label="Länge der Fläche in Metern"
        placeholder="105"
        className={input}
        value={length}
        onChange={(e) => setLength(e.target.value)}
        onBlur={() => commit(length, width)}
        onKeyDown={(e) => e.key === 'Enter' && commit(length, width)}
      />
      ×
      <input
        type="number"
        inputMode="numeric"
        min={MIN_AREA}
        max={MAX_AREA}
        aria-label="Breite der Fläche in Metern"
        placeholder="68"
        className={input}
        value={width}
        onChange={(e) => setWidth(e.target.value)}
        onBlur={() => commit(length, width)}
        onKeyDown={(e) => e.key === 'Enter' && commit(length, width)}
      />
      m
    </label>
  )
}
