import { useState } from 'react'
import { useCloseOnEscape } from '../hooks/useCloseOnEscape'
import { DEFAULT_CUSTOM_GRID, MAX_CUSTOM_PARTS, MAX_CUSTOM_SIZE, parseGridSizes } from '../field/pitchStyle'
import { useDrillStore } from '../store/drillStore'
import { buttonClass, inputClass } from './ui'

const format = (sizes: number[]) => sizes.map((n) => String(n).replace('.', ',')).join(' ')

/** Own grid: column widths and row heights in meters (e.g. "20 30 20"), centred on the pitch. */
export function CustomGridDialog({ onClose }: { onClose: () => void }) {
  const current = useDrillStore((s) => s.pitch.customGrid) ?? DEFAULT_CUSTOM_GRID
  const setCustomGrid = useDrillStore((s) => s.setCustomGrid)
  const [columns, setColumns] = useState(() => format(current.columns))
  const [rows, setRows] = useState(() => format(current.rows))
  const parsedColumns = parseGridSizes(columns)
  const parsedRows = parseGridSizes(rows)
  const valid = parsedColumns !== null && parsedRows !== null

  useCloseOnEscape(true, onClose)

  function apply() {
    if (!parsedColumns || !parsedRows) return
    setCustomGrid({ columns: parsedColumns, rows: parsedRows })
    onClose()
  }

  const total = (sizes: number[] | null) =>
    sizes ? `${String(sizes.reduce((a, b) => a + b, 0)).replace('.', ',')} m` : 'ungültig'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form
        role="dialog"
        aria-label="Eigenes Raster"
        className="flex w-full max-w-md flex-col gap-3 rounded-xl border border-slate-600 bg-slate-900 p-5 shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault()
          apply()
        }}
      >
        <h2 className="text-lg font-semibold text-white">Eigenes Raster</h2>
        <p className="text-sm text-slate-400">
          Größen in Metern, mit Leerzeichen getrennt. Ungleiche Werte ergeben ein asymmetrisches Raster. Es wird in
          der Feldmitte gezeichnet – ideal auf „Leere Fläche“.
        </p>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Spalten entlang der Feldlänge
          <input
            className={inputClass}
            value={columns}
            onChange={(e) => setColumns(e.target.value)}
            placeholder="z. B. 20 30 20"
            autoFocus
          />
          <span className={parsedColumns ? 'text-slate-500' : 'text-red-300'}>Gesamt: {total(parsedColumns)}</span>
        </label>
        <label className="flex flex-col gap-1 text-sm text-slate-400">
          Zeilen quer über das Feld
          <input
            className={inputClass}
            value={rows}
            onChange={(e) => setRows(e.target.value)}
            placeholder="z. B. 15 20 15"
          />
          <span className={parsedRows ? 'text-slate-500' : 'text-red-300'}>Gesamt: {total(parsedRows)}</span>
        </label>
        {!valid && (
          <p className="text-sm text-red-300">
            Bitte 1–{MAX_CUSTOM_PARTS} Zahlen zwischen 0 und {MAX_CUSTOM_SIZE} m eingeben.
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" className={buttonClass} onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className={`${buttonClass} bg-emerald-700 hover:bg-emerald-600`} disabled={!valid}>
            Raster zeigen
          </button>
        </div>
      </form>
    </div>
  )
}
