import { useContext } from 'react'
import { Ellipse, Group, Line, Rect } from 'react-konva'
import { MeterText } from './MeterText'
import { displayColor } from '../field/pitchStyle'
import { MINIGOAL } from '../items/equipment'
import { ELLIPSE_TENSION, zoneCorners, zoneCornerRadius, zoneExtent, zoneGoalPositions, zonePattern } from '../items/zones'
import { flatten } from '../lines/geometry'
import { dashStyle, weightFactor } from '../lines/styles'
import type { Zone } from '../model/types'
import { GoalShape } from './EquipmentShapes'
import { PitchColorContext } from './pitchColorContext'
import { ViewRotationContext } from './viewRotationContext'

type ZoneShapeProps = Pick<
  Zone,
  'shape' | 'width' | 'height' | 'corners' | 'color' | 'fillColor' | 'fillOpacity' | 'dashed' | 'label' | 'goals'
> &
  Partial<Pick<Zone, 'pattern' | 'weight' | 'rounded'>> & {
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
  pattern: chosenPattern,
  weight,
  rounded,
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
  const strokeWidth = Math.max(0.15, 1.5 / scale) * weightFactor(weight ?? 'medium')
  const pattern = zonePattern({ dashed, pattern: chosenPattern })
  const { dash, lineCap } = dashStyle(pattern, strokeWidth)
  // Fill and outline are separate shapes: only the fill is see-through.
  const outline = {
    stroke: color,
    strokeWidth,
    // The usual dashes of a zone are a little longer than those of a line.
    dash: pattern === 'dashed' ? [strokeWidth * 5, strokeWidth * 3] : dash,
    lineCap,
  }
  const radius = zoneCornerRadius({ shape, width, height, corners, rounded })
  // A reshaped circle is a smooth curve through its points.
  const smooth = shape === 'ellipse' ? ELLIPSE_TENSION : 0
  const outlinePoints = flatten(zoneCorners({ shape, width, height, corners }))
  const fontSize = Math.min(
    2,
    (upright === 0 ? extent.height : extent.width) / 3,
    labelWidth / Math.max(label.length * 0.6, 1),
  )

  return (
    <>
      {radius > 0 ? (
        <>
          <Rect x={-width / 2} y={-height / 2} width={width} height={height} cornerRadius={radius} fill={fill} opacity={fillOpacity} />
          <Rect x={-width / 2} y={-height / 2} width={width} height={height} cornerRadius={radius} {...outline} />
        </>
      ) : shape === 'ellipse' && !corners ? (
        <>
          <Ellipse radiusX={width / 2} radiusY={height / 2} fill={fill} opacity={fillOpacity} />
          <Ellipse radiusX={width / 2} radiusY={height / 2} {...outline} />
        </>
      ) : (
        <>
          <Line points={outlinePoints} closed tension={smooth} fill={fill} opacity={fillOpacity} />
          <Line points={outlinePoints} closed tension={smooth} {...outline} lineJoin="round" />
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
