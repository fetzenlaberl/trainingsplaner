import { useState } from 'react'
import type { Orientation } from '../field/orientation'
import {
  GRID_LABELS,
  GRID_ORDER,
  ORIENTATION_LABELS,
  PITCH_COLOR_ORDER,
  PITCH_COLORS,
  LIGHTING_OPTIONS,
  MOWING_OPTIONS,
  PITCH_LINE_COLORS,
  PITCH_LINE_WIDTHS,
} from '../field/pitchStyle'
import { useDrillStore } from '../store/drillStore'
import { CustomGridDialog } from './CustomGridDialog'
import { Dropdown } from './Dropdown'

const ORIENTATIONS: Orientation[] = ['landscape', 'portrait']

/** Menus for the pitch look (orientation, grass, mowing, light), its lines and the grid overlay. */
export function PitchStyleMenu() {
  const pitch = useDrillStore((s) => s.pitch)
  const setPitchColor = useDrillStore((s) => s.setPitchColor)
  const setGrid = useDrillStore((s) => s.setGrid)
  const setOrientation = useDrillStore((s) => s.setOrientation)
  const setPitchLines = useDrillStore((s) => s.setPitchLines)
  const [customOpen, setCustomOpen] = useState(false)

  return (
    <>
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
          ...MOWING_OPTIONS.map((o) => ({
            section: 'Mähmuster',
            label: o.label,
            checked: (pitch.mowing ?? null) === o.value,
            onSelect: () => setPitchLines({ mowing: o.value ?? undefined }),
          })),
          ...LIGHTING_OPTIONS.map((o) => ({
            section: 'Lichtverlauf',
            label: o.label,
            checked: (pitch.lighting ?? null) === o.value,
            onSelect: () => setPitchLines({ lighting: o.value ?? undefined }),
          })),
        ]}
      />
      <Dropdown
        label="Linien"
        align="right"
        items={[
          ...PITCH_LINE_WIDTHS.map((w) => ({
            section: 'Stärke',
            label: w.label,
            checked: (pitch.lineWidth ?? 'normal') === w.value,
            onSelect: () => setPitchLines({ lineWidth: w.value }),
          })),
          ...PITCH_LINE_COLORS.map((c) => ({
            section: 'Linienfarbe',
            label: c.label,
            checked: (pitch.lineColor ?? null) === c.value,
            onSelect: () => setPitchLines({ lineColor: c.value ?? undefined }),
          })),
          {
            section: 'Ecken',
            label: 'Abgerundete Außenlinien',
            checked: pitch.roundedCorners === true,
            onSelect: () => setPitchLines({ roundedCorners: !pitch.roundedCorners }),
          },
        ]}
      />
      <Dropdown
        label="Raster"
        align="right"
        items={[
          ...GRID_ORDER.map((grid) => ({
            section: 'Raster',
            label: GRID_LABELS[grid],
            checked: pitch.grid === grid,
            // The own grid asks for its sizes first.
            onSelect: () => (grid === 'custom' ? setCustomOpen(true) : setGrid(grid)),
          })),
        ]}
      />
      {customOpen && <CustomGridDialog onClose={() => setCustomOpen(false)} />}
    </>
  )
}
