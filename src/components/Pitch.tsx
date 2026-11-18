import { Circle, Group, Line, Rect } from 'react-konva'
import { PITCH, type FieldType, type Rect as ViewRect } from '../field/dimensions'
import { getGoals, getPitchMarkings } from '../field/markings'
import { gridLines, PITCH_COLORS, type PitchStyle } from '../field/pitchStyle'

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

      {gridLines(pitch.grid).map((points, i) => (
        <Line
          key={`grid-${i}`}
          points={points}
          stroke={colors.grid}
          strokeWidth={gridWidth}
          dash={[gridWidth * 6, gridWidth * 4]}
        />
      ))}
    </Group>
  )
}
