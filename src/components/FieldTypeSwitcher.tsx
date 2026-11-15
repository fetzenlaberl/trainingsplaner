import { FIELD_TYPE_LABELS, FIELD_TYPES } from '../field/dimensions'
import { useDrillStore } from '../store/drillStore'

export function FieldTypeSwitcher() {
  const fieldType = useDrillStore((s) => s.fieldType)
  const setFieldType = useDrillStore((s) => s.setFieldType)

  return (
    <div role="group" aria-label="Feldtyp" className="flex flex-wrap gap-1 rounded-lg bg-slate-800 p-1">
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
    </div>
  )
}
