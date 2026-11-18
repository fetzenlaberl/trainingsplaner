import { GRID_LABELS, GRID_ORDER, PITCH_COLOR_ORDER, PITCH_COLORS } from '../field/pitchStyle'
import { useDrillStore } from '../store/drillStore'
import { Dropdown } from './Dropdown'

/** Menu for the pitch color and the grid overlay. */
export function PitchStyleMenu() {
  const pitch = useDrillStore((s) => s.pitch)
  const setPitchColor = useDrillStore((s) => s.setPitchColor)
  const setGrid = useDrillStore((s) => s.setGrid)

  return (
    <Dropdown
      label="Feld"
      align="right"
      items={[
        ...PITCH_COLOR_ORDER.map((color) => ({
          section: 'Farbe',
          label: PITCH_COLORS[color].label,
          checked: pitch.color === color,
          onSelect: () => setPitchColor(color),
        })),
        ...GRID_ORDER.map((grid) => ({
          section: 'Raster',
          label: GRID_LABELS[grid],
          checked: pitch.grid === grid,
          onSelect: () => setGrid(grid),
        })),
      ]}
    />
  )
}
