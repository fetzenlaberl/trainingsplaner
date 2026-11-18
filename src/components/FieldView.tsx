import type { ReactNode } from 'react'
import { Group } from 'react-konva'
import type { FieldType, Rect as ViewRect } from '../field/dimensions'
import type { PitchStyle } from '../field/pitchStyle'
import type { Item, Line, Zone } from '../model/types'
import { FieldItems } from './FieldItems'
import { FieldLines } from './FieldLines'
import { FieldZones } from './FieldZones'
import { Pitch } from './Pitch'
import { PitchColorContext } from './pitchColorContext'

interface FieldViewProps {
  fieldType: FieldType
  pitch: PitchStyle
  items: (Item & { opacity?: number; glow?: number })[]
  lines: Line[]
  zones: (Zone & { opacity?: number })[]
  viewport: ViewRect
  /** Pixels per meter */
  scale: number
  /** Pixel position of the viewport's top-left corner */
  offsetX: number
  offsetY: number
  /** False for the export: no selection, no dragging */
  interactive: boolean
  /** Extra content drawn on top, in meter units (e.g. drawing preview, handles) */
  children?: ReactNode
}

/** Pitch, lines and items, converted from meters to pixels. Used on screen and for export. */
export function FieldView({
  fieldType,
  pitch,
  items,
  lines,
  zones,
  viewport,
  scale,
  offsetX,
  offsetY,
  interactive,
  children,
}: FieldViewProps) {
  return (
    <Group
      x={offsetX - viewport.x * scale}
      y={offsetY - viewport.y * scale}
      scaleX={scale}
      scaleY={scale}
      clipX={viewport.x}
      clipY={viewport.y}
      clipWidth={viewport.width}
      clipHeight={viewport.height}
    >
      <PitchColorContext.Provider value={pitch.color}>
        <Pitch fieldType={fieldType} pitch={pitch} viewport={viewport} scale={scale} />
        <FieldZones zones={zones} viewport={viewport} scale={scale} interactive={interactive} />
        <FieldLines lines={lines} scale={scale} interactive={interactive} />
        <FieldItems items={items} viewport={viewport} scale={scale} interactive={interactive} />
        {children}
      </PitchColorContext.Provider>
    </Group>
  )
}
