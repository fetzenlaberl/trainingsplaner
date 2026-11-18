import { useContext } from 'react'
import { Ellipse, Line, Rect, Text } from 'react-konva'
import { displayColor } from '../field/pitchStyle'
import type { Zone } from '../model/types'
import { PitchColorContext } from './pitchColorContext'

type ZoneShapeProps = Pick<
  Zone,
  'shape' | 'width' | 'height' | 'color' | 'fillColor' | 'fillOpacity' | 'dashed' | 'label'
> & {
  /** Pixels per meter, keeps the outline visible at small sizes */
  scale: number
}

/** Draws a zone centered at (0, 0) in meter units (rotation is applied by the parent). */
export function ZoneShape({
  shape,
  width,
  height,
  color: chosenColor,
  fillColor: chosenFill,
  fillOpacity,
  dashed,
  label,
  scale,
}: ZoneShapeProps) {
  const pitchColor = useContext(PitchColorContext)
  const color = displayColor(chosenColor, pitchColor)
  const fill = displayColor(chosenFill, pitchColor)
  const strokeWidth = Math.max(0.15, 1.5 / scale)
  // Fill and outline are separate shapes: only the fill is see-through.
  const outline = {
    stroke: color,
    strokeWidth,
    dash: dashed ? [strokeWidth * 5, strokeWidth * 3] : undefined,
  }
  const halfW = width / 2
  const halfH = height / 2
  const fontSize = Math.min(2, height / 3, width / Math.max(label.length * 0.6, 1))

  return (
    <>
      {shape === 'rect' && (
        <>
          <Rect x={-halfW} y={-halfH} width={width} height={height} fill={fill} opacity={fillOpacity} />
          <Rect x={-halfW} y={-halfH} width={width} height={height} {...outline} />
        </>
      )}
      {shape === 'ellipse' && (
        <>
          <Ellipse radiusX={halfW} radiusY={halfH} fill={fill} opacity={fillOpacity} />
          <Ellipse radiusX={halfW} radiusY={halfH} {...outline} />
        </>
      )}
      {shape === 'triangle' && (
        <>
          <Line points={[0, -halfH, halfW, halfH, -halfW, halfH]} closed fill={fill} opacity={fillOpacity} />
          <Line points={[0, -halfH, halfW, halfH, -halfW, halfH]} closed {...outline} lineJoin="round" />
        </>
      )}
      {label && (
        <Text
          text={label}
          width={width}
          offsetX={halfW}
          // Inside a triangle the label sits lower, where there is more room.
          y={shape === 'triangle' ? halfH / 3 - fontSize / 2 : -fontSize / 2}
          align="center"
          fontSize={fontSize}
          fontStyle="bold"
          fill={color}
          listening={false}
        />
      )}
    </>
  )
}
