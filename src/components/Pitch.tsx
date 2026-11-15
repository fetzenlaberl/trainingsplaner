import { Circle, Group, Line, Rect } from 'react-konva'
import { PITCH, type FieldType, type Rect as ViewRect } from '../field/dimensions'
import { getGoals, getPitchMarkings } from '../field/markings'

const GRASS_DARK = '#2f7d32'
const GRASS_LIGHT = '#388e3c'
const LINE_COLOR = '#ffffff'
const STRIPE_COUNT = 14

const MARKINGS = getPitchMarkings()
const GOALS = getGoals()

interface PitchProps {
  fieldType: FieldType
  viewport: ViewRect
  /** Pixels per meter, used to keep lines visible at small sizes */
  scale: number
}

/** Draws the pitch in meter coordinates; the parent group converts to pixels. */
export function Pitch({ fieldType, viewport, scale }: PitchProps) {
  const lineWidth = Math.max(PITCH.lineWidth, 1.5 / scale)
  const spotRadius = Math.max(PITCH.spotRadius, 2.5 / scale)
  const stripeWidth = PITCH.length / STRIPE_COUNT

  return (
    <Group listening={false}>
      <Rect {...viewport} fill={GRASS_DARK} />
      {Array.from({ length: STRIPE_COUNT }, (_, i) =>
        i % 2 === 0 ? (
          <Rect
            key={i}
            x={i * stripeWidth}
            y={viewport.y}
            width={stripeWidth}
            height={viewport.height}
            fill={GRASS_LIGHT}
          />
        ) : null,
      )}

      {fieldType !== 'empty' && (
        <>
          {MARKINGS.map((m, i) => {
            switch (m.kind) {
              case 'rect':
                return (
                  <Rect
                    key={i}
                    x={m.x}
                    y={m.y}
                    width={m.width}
                    height={m.height}
                    stroke={LINE_COLOR}
                    strokeWidth={lineWidth}
                  />
                )
              case 'line':
                return (
                  <Line
                    key={i}
                    points={m.points}
                    stroke={LINE_COLOR}
                    strokeWidth={lineWidth}
                    lineCap="round"
                    lineJoin="round"
                  />
                )
              case 'circle':
                return (
                  <Circle
                    key={i}
                    x={m.x}
                    y={m.y}
                    radius={m.radius}
                    stroke={LINE_COLOR}
                    strokeWidth={lineWidth}
                  />
                )
              case 'spot':
                return <Circle key={i} x={m.x} y={m.y} radius={spotRadius} fill={LINE_COLOR} />
            }
          })}
          {GOALS.map((g, i) => (
            <Rect
              key={`goal-${i}`}
              {...g}
              fill="rgba(255,255,255,0.25)"
              stroke={LINE_COLOR}
              strokeWidth={lineWidth * 1.5}
            />
          ))}
        </>
      )}
    </Group>
  )
}
