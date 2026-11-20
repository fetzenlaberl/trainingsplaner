import { useContext } from 'react'
import { Circle, Group, Line, Rect } from 'react-konva'
import { MeterText } from './MeterText'
import { PITCH, type FieldType, type Rect as ViewRect } from '../field/dimensions'
import { getGoals, getPitchMarkings } from '../field/markings'
import { gridLabels, gridLines, PITCH_COLORS, type PitchStyle } from '../field/pitchStyle'
import { ViewRotationContext } from './viewRotationContext'

const STRIPE_COUNT = 14

const MARKINGS = getPitchMarkings()
const GOALS = getGoals()

interface PitchProps {
  fieldType: FieldType
  pitch: PitchStyle
  viewport: ViewRect
  /** Pixels per meter, used to keep lines visible at small sizes */
  scale: number
}

/** Draws the pitch (surface, markings, grid) in meter coordinates; the parent group converts to pixels. */
export function Pitch({ fieldType, pitch, viewport, scale }: PitchProps) {
  const colors = PITCH_COLORS[pitch.color]
  const lineWidth = Math.max(PITCH.lineWidth, 1.5 / scale)
  const spotRadius = Math.max(PITCH.spotRadius, 2.5 / scale)
  const gridWidth = Math.max(0.08, 1.2 / scale)
  const stripeWidth = PITCH.length / STRIPE_COUNT
  const stroke = { stroke: colors.line, strokeWidth: lineWidth }
  // Zone numbers stay upright in portrait.
  const upright = -useContext(ViewRotationContext)
  const labelSize = 3.2

  return (
    <Group listening={false}>
      <Rect {...viewport} fill={colors.base} />
      {colors.stripe &&
        Array.from({ length: STRIPE_COUNT }, (_, i) =>
          i % 2 === 0 ? (
            <Rect
              key={i}
              x={i * stripeWidth}
              y={viewport.y}
              width={stripeWidth}
              height={viewport.height}
              fill={colors.stripe ?? undefined}
            />
          ) : null,
        )}

      {fieldType !== 'empty' && (
        <>
          {MARKINGS.map((m, i) => {
            switch (m.kind) {
              case 'rect':
                return <Rect key={i} x={m.x} y={m.y} width={m.width} height={m.height} {...stroke} />
              case 'line':
                return <Line key={i} points={m.points} {...stroke} lineCap="round" lineJoin="round" />
              case 'circle':
                return <Circle key={i} x={m.x} y={m.y} radius={m.radius} {...stroke} />
              case 'spot':
                return <Circle key={i} x={m.x} y={m.y} radius={spotRadius} fill={colors.line} />
            }
          })}
          {GOALS.map((g, i) => (
            <Rect key={`goal-${i}`} {...g} fill={colors.goalFill} stroke={colors.line} strokeWidth={lineWidth * 1.5} />
          ))}
        </>
      )}

      {gridLines(pitch.grid, pitch.customGrid).map((points, i) => (
        <Line
          key={`grid-${i}`}
          points={points}
          stroke={colors.grid}
          strokeWidth={gridWidth}
          // The own grid is an exercise field: solid lines; other grids are dashed guides.
          dash={pitch.grid === 'custom' ? undefined : [gridWidth * 6, gridWidth * 4]}
        />
      ))}
      {gridLabels(pitch.grid).map((label) => (
        <MeterText
          key={`zone-${label.text}`}
          text={label.text}
          x={label.x}
          y={label.y}
          rotation={upright}
          width={labelSize * 2}
          height={labelSize}
          offsetX={labelSize}
          offsetY={labelSize / 2}
          align="center"
          verticalAlign="middle"
          fontSize={labelSize}
          fontStyle="bold"
          fill={colors.grid}
        />
      ))}
    </Group>
  )
}
