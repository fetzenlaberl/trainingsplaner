import { useState } from 'react'
import type { Orientation } from '../field/orientation'
import {
  GRID_LABELS,
  GRID_LABEL_KINDS,
  GRID_LABEL_POSITIONS,
  GRID_LABEL_SIZES,
  type GridLabelStyle,
  GRID_ORDER,
  ORIENTATION_LABELS,
  PITCH_COLOR_ORDER,
  PITCH_COLORS,
  LIGHTING_OPTIONS,
  LIGHT_SOURCES,
  resolveLighting,
  MOWING_OPTIONS,
  PITCH_LINE_COLORS,
  PITCH_LINE_WIDTHS,
} from '../field/pitchStyle'
import { useDrillStore } from '../store/drillStore'
import { CustomGridDialog } from './CustomGridDialog'
import { GradientDialog } from './GradientDialog'
import { LightingDialog } from './LightingDialog'
import { Dropdown } from './Dropdown'

const ORIENTATIONS: Orientation[] = ['landscape', 'portrait']

const BACKGROUND_OPACITIES = [
  { value: 1, label: 'Deckend' },
  { value: 0.7, label: 'Leicht durchscheinend (70 %)' },
  { value: 0.4, label: 'Durchscheinend (40 %)' },
]

/** Menus for the pitch look (orientation, grass, mowing, light), its lines and the grid overlay. */
export function PitchStyleMenu() {
  const pitch = useDrillStore((s) => s.pitch)
  const setPitchColor = useDrillStore((s) => s.setPitchColor)
  const setGrid = useDrillStore((s) => s.setGrid)
  const setOrientation = useDrillStore((s) => s.setOrientation)
  const setPitchLines = useDrillStore((s) => s.setPitchLines)
  const setPitchBackground = useDrillStore((s) => s.setPitchBackground)
  const [customOpen, setCustomOpen] = useState(false)
  const [gradientOpen, setGradientOpen] = useState(false)
  const [lightingOpen, setLightingOpen] = useState(false)
  const lighting = resolveLighting(pitch)
  const lightingSummary =
    lighting === 'none'
      ? 'aus'
      : `${LIGHTING_OPTIONS.find((o) => o.value === lighting)?.label ?? ''}, ${
          LIGHT_SOURCES.find((o) => o.value === (pitch.lightSource ?? 'center'))?.label ?? ''
        }`.toLowerCase()
  // Own zone labels; position and size start from the grid's usual kind of label.
  const usualKind = pitch.grid.startsWith('letters') ? 'letters' : 'numbers'
  const labelStyle: GridLabelStyle = pitch.gridLabelStyle ?? {
    kind: usualKind,
    position: pitch.grid.startsWith('letters') ? 'outside' : 'corner',
    size: 'medium',
  }
  const setLabels = (change: Partial<GridLabelStyle>) =>
    setPitchLines({ gridLabelStyle: { ...labelStyle, ...change } })

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
            checked: !pitch.gradient && pitch.color === color,
            onSelect: () => setPitchColor(color),
          })),
          {
            section: 'Farbe',
            label: pitch.gradient ? 'Farbverlauf ändern …' : 'Farbverlauf (zwei Farben) …',
            checked: Boolean(pitch.gradient),
            onSelect: () => setGradientOpen(true),
          },
          ...MOWING_OPTIONS.map((o) => ({
            section: 'Mähmuster',
            label: o.label,
            checked: (pitch.mowing ?? null) === o.value,
            onSelect: () => setPitchLines({ mowing: o.value ?? undefined }),
          })),
          ...(pitch.background
            ? [
                ...BACKGROUND_OPACITIES.map((o) => ({
                  section: 'Hintergrundbild',
                  label: o.label,
                  checked: (pitch.backgroundOpacity ?? 1) === o.value,
                  onSelect: () => setPitchBackground({ backgroundOpacity: o.value }),
                })),
                {
                  section: 'Hintergrundbild',
                  label: 'Hintergrundbild entfernen',
                  onSelect: () => setPitchBackground({ background: undefined }),
                },
              ]
            : []),
          {
            section: 'Licht',
            label: `Lichtverlauf: ${lightingSummary} …`,
            onSelect: () => setLightingOpen(true),
          },
          {
            section: 'Notizen',
            label: 'Notizen unter dem Feld',
            hint: 'Kommen beim Export (PNG, PDF) mit',
            checked: pitch.showNotes === true,
            onSelect: () => setPitchLines({ showNotes: !pitch.showNotes }),
          },
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
          {
            section: 'Zusätzliche Linien',
            label: 'Rückzugslinien 22 m',
            hint: 'Nur auf dem Großfeld (Ganzfeld, Halbfeld, Strafraum, Ecken)',
            checked: pitch.retreatLines === true,
            onSelect: () => setPitchLines({ retreatLines: !pitch.retreatLines }),
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
          ...GRID_LABEL_KINDS.map((k) => ({
            section: 'Beschriftung',
            label: k.label,
            checked: (pitch.gridLabelStyle?.kind ?? null) === k.value,
            onSelect: () =>
              k.value === null ? setPitchLines({ gridLabelStyle: undefined }) : setLabels({ kind: k.value }),
          })),
          ...GRID_LABEL_POSITIONS.map((o) => ({
            section: 'Position der Beschriftung',
            label: o.label,
            checked: pitch.gridLabelStyle !== undefined && labelStyle.position === o.value,
            onSelect: () => setLabels({ position: o.value, ...(labelStyle.kind === 'none' ? { kind: usualKind } : {}) }),
          })),
          ...GRID_LABEL_SIZES.map((o) => ({
            section: 'Größe der Beschriftung',
            label: o.label,
            checked: pitch.gridLabelStyle !== undefined && labelStyle.size === o.value,
            onSelect: () => setLabels({ size: o.value, ...(labelStyle.kind === 'none' ? { kind: usualKind } : {}) }),
          })),
        ]}
      />
      {customOpen && <CustomGridDialog onClose={() => setCustomOpen(false)} />}
      {gradientOpen && <GradientDialog onClose={() => setGradientOpen(false)} />}
      {lightingOpen && <LightingDialog onClose={() => setLightingOpen(false)} />}
    </>
  )
}
