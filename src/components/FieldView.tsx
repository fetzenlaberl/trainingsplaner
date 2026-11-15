import type { ReactNode } from 'react'
import { Group } from 'react-konva'
import type { FieldType, Rect as ViewRect } from '../field/dimensions'
import type { Item, Line } from '../model/types'
import { FieldItems } from './FieldItems'
import { FieldLines } from './FieldLines'
import { Pitch } from './Pitch'

interface FieldViewProps {
  fieldType: FieldType
  items: (Item & { opacity?: number })[]
  lines: Line[]
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
  items,
  lines,
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
      <Pitch fieldType={fieldType} viewport={viewport} scale={scale} />
      <FieldLines lines={lines} scale={scale} interactive={interactive} />
      <FieldItems items={items} viewport={viewport} scale={scale} interactive={interactive} />
      {children}
    </Group>
  )
}
