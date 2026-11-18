import type { ReactNode } from 'react'
import { Group } from 'react-konva'
import type { FieldType, Rect as ViewRect } from '../field/dimensions'
import { viewRect, viewRotation } from '../field/orientation'
import type { PitchStyle } from '../field/pitchStyle'
import type { Item, Line, Zone } from '../model/types'
import { FieldItems } from './FieldItems'
import { FieldLines } from './FieldLines'
import { FieldZones } from './FieldZones'
import { Pitch } from './Pitch'
import { PitchColorContext } from './pitchColorContext'
import { ViewRotationContext } from './viewRotationContext'

interface FieldViewProps {
  fieldType: FieldType
  pitch: PitchStyle
  items: (Item & { opacity?: number; glow?: number })[]
  lines: Line[]
  zones: (Zone & { opacity?: number })[]
  viewport: ViewRect
  /** Pixels per meter */
  scale: number
  /** Pixel position of the visible area's top-left corner (after rotation in portrait) */
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
  // In portrait the field is drawn rotated; positions are fitted in view coordinates.
  const vr = viewRect(viewport, pitch.orientation)
  const rotation = viewRotation(pitch.orientation)
  return (
    <Group
      x={offsetX - vr.x * scale}
      y={offsetY - vr.y * scale}
      rotation={rotation}
      scaleX={scale}
      scaleY={scale}
      clipX={viewport.x}
      clipY={viewport.y}
      clipWidth={viewport.width}
      clipHeight={viewport.height}
    >
      <PitchColorContext.Provider value={pitch.color}>
        <ViewRotationContext.Provider value={rotation}>
          <Pitch fieldType={fieldType} pitch={pitch} viewport={viewport} scale={scale} />
          <FieldZones zones={zones} viewport={viewport} scale={scale} interactive={interactive} />
          <FieldLines lines={lines} scale={scale} interactive={interactive} />
          <FieldItems items={items} viewport={viewport} scale={scale} interactive={interactive} />
          {children}
        </ViewRotationContext.Provider>
      </PitchColorContext.Provider>
    </Group>
  )
}
