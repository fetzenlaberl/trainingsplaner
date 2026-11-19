import { useContext } from 'react'
import { Ellipse, Group, Line } from 'react-konva'
import { MeterText } from './MeterText'
import { displayColor } from '../field/pitchStyle'
import { MINIGOAL } from '../items/equipment'
import { zoneCorners, zoneExtent, zoneGoalPositions } from '../items/zones'
import { flatten } from '../lines/geometry'
import type { Zone } from '../model/types'
import { GoalShape } from './EquipmentShapes'
import { PitchColorContext } from './pitchColorContext'
import { ViewRotationContext } from './viewRotationContext'

type ZoneShapeProps = Pick<
  Zone,
  'shape' | 'width' | 'height' | 'corners' | 'color' | 'fillColor' | 'fillOpacity' | 'dashed' | 'label' | 'goals'
> & {
  /** Pixels per meter, keeps the outline visible at small sizes */
  scale: number
}

/** Draws a zone centered at (0, 0) in meter units (rotation is applied by the parent). */
export function ZoneShape({
  shape,
  width,
  height,
  corners,
  color: chosenColor,
  fillColor: chosenFill,
  fillOpacity,
  dashed,
  label,
  goals,
  scale,
}: ZoneShapeProps) {
  const pitchColor = useContext(PitchColorContext)
  const color = displayColor(chosenColor, pitchColor)
  const fill = displayColor(chosenFill, pitchColor)
  const extent = zoneExtent({ shape, width, height, corners })
  // In portrait the label turns back upright; its box then spans the zone's height.
  const upright = -useContext(ViewRotationContext)
  const labelWidth = upright === 0 ? extent.width : extent.height
  const strokeWidth = Math.max(0.15, 1.5 / scale)
  // Fill and outline are separate shapes: only the fill is see-through.
  const outline = {
    stroke: color,
    strokeWidth,
    dash: dashed ? [strokeWidth * 5, strokeWidth * 3] : undefined,
  }
  const outlinePoints = flatten(zoneCorners({ shape, width, height, corners }))
  const fontSize = Math.min(
    2,
    (upright === 0 ? extent.height : extent.width) / 3,
    labelWidth / Math.max(label.length * 0.6, 1),
  )

  return (
    <>
      {shape === 'ellipse' ? (
        <>
          <Ellipse radiusX={width / 2} radiusY={height / 2} fill={fill} opacity={fillOpacity} />
          <Ellipse radiusX={width / 2} radiusY={height / 2} {...outline} />
        </>
      ) : (
        <>
          <Line points={outlinePoints} closed fill={fill} opacity={fillOpacity} />
          <Line points={outlinePoints} closed {...outline} lineJoin="round" />
        </>
      )}
      {shape === 'rect' &&
        zoneGoalPositions(zoneCorners({ shape, width, height, corners }), goals).map((goal, i) => (
          <Group key={i} x={goal.x} y={goal.y}>
            <GoalShape
              width={MINIGOAL.width}
              depth={MINIGOAL.depth}
              color="#ffffff"
              rotation={goal.rotation}
              anchor="posts"
            />
          </Group>
        ))}
      {label && (
        <MeterText
          text={label}
          rotation={upright}
          width={labelWidth}
          offsetX={labelWidth / 2}
          // Inside a regular triangle the label sits lower, where there is more room.
          y={shape === 'triangle' && !corners ? height / 6 - fontSize / 2 : -fontSize / 2}
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
