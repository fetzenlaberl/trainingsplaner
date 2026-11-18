import type { Orientation } from '../field/orientation'
import { GRID_LABELS, GRID_ORDER, ORIENTATION_LABELS, PITCH_COLOR_ORDER, PITCH_COLORS } from '../field/pitchStyle'
import { useDrillStore } from '../store/drillStore'
import { Dropdown } from './Dropdown'

const ORIENTATIONS: Orientation[] = ['landscape', 'portrait']

/** Menu for orientation, pitch color and grid overlay. */
export function PitchStyleMenu() {
  const pitch = useDrillStore((s) => s.pitch)
  const setPitchColor = useDrillStore((s) => s.setPitchColor)
  const setGrid = useDrillStore((s) => s.setGrid)
  const setOrientation = useDrillStore((s) => s.setOrientation)

  return (
    <Dropdown
      label="Feld"
      align="right"
      items={[
        ...ORIENTATIONS.map((orientation) => ({
          section: 'Ausrichtung',
          label: ORIENTATION_LABELS[orientation],
          checked: pitch.orientation === orientation,
          onSelect: () => setOrientation(orientation),
        })),
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
