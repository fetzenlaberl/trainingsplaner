import { useContext } from 'react'
import { Circle, Group, Line, Rect } from 'react-konva'
import { MeterText } from './MeterText'
import { PITCH, type FieldType, type Rect as ViewRect } from '../field/dimensions'
import { getGoals, getPitchMarkings } from '../field/markings'
import { grassTextureTile, TEXTURE_TILE_METERS, TEXTURE_TILE_PX } from '../field/grassTexture'
import {
  gridLabels,
  gridLines,
  PITCH_COLORS,
  PITCH_LINE_WIDTHS,
  ROUNDED_CORNER_RADIUS,
  type PitchStyle,
} from '../field/pitchStyle'
import { ViewRotationContext } from './viewRotationContext'

const STRIPE_COUNT = 14
const FINE_STRIPE_COUNT = 28
/** Squares of the check pattern along the length */
const CHECK_COUNT = 14

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
  const widthFactor = PITCH_LINE_WIDTHS.find((w) => w.value === (pitch.lineWidth ?? 'normal'))?.factor ?? 1
  const lineWidth = Math.max(PITCH.lineWidth * widthFactor, (1.5 * widthFactor) / scale)
  const lineColor = pitch.lineColor ?? colors.line
  const rounded = pitch.roundedCorners === true
  const spotRadius = Math.max(PITCH.spotRadius, 2.5 / scale)
  const gridWidth = Math.max(0.08, 1.2 / scale)
  const stroke = { stroke: lineColor, strokeWidth: lineWidth }
  const texture = colors.texture ? grassTextureTile() : null
  // Zone numbers stay upright in portrait.
  const upright = -useContext(ViewRotationContext)
  const labelSize = 3.2

  return (
    <Group listening={false}>
      <Rect {...viewport} fill={colors.base} />
      {colors.stripe && <MowingPattern viewport={viewport} color={colors.stripe} pattern={colors.pattern ?? 'stripes'} />}
      {texture && (
        <Rect
          {...viewport}
          // Konva accepts any canvas image source here; its type only names HTMLImageElement.
          fillPatternImage={texture as unknown as HTMLImageElement}
          fillPatternRepeat="repeat"
          fillPatternScaleX={TEXTURE_TILE_METERS / TEXTURE_TILE_PX}
          fillPatternScaleY={TEXTURE_TILE_METERS / TEXTURE_TILE_PX}
        />
      )}
      {colors.lighting && (
        <Rect
          {...viewport}
          fillRadialGradientStartPoint={{ x: viewport.x + viewport.width / 2, y: viewport.y + viewport.height / 2 }}
          fillRadialGradientEndPoint={{ x: viewport.x + viewport.width / 2, y: viewport.y + viewport.height / 2 }}
          fillRadialGradientStartRadius={0}
          fillRadialGradientEndRadius={Math.max(viewport.width, viewport.height) * 0.75}
          fillRadialGradientColorStops={[0, 'rgba(255,255,240,0.12)', 0.55, 'rgba(255,255,255,0)', 1, 'rgba(0,0,0,0.22)']}
        />
      )}

      {fieldType !== 'empty' && (
        <>
          {MARKINGS.map((m, i) => {
            switch (m.kind) {
              case 'rect': {
                // Rounded corners only on the outer lines (touch and goal lines).
                const outer = m.x === 0 && m.y === 0 && m.width === PITCH.length
                return (
                  <Rect
                    key={i}
                    x={m.x}
                    y={m.y}
                    width={m.width}
                    height={m.height}
                    cornerRadius={rounded && outer ? ROUNDED_CORNER_RADIUS : 0}
                    {...stroke}
                  />
                )
              }
              case 'line':
                if (rounded && m.corner) return null
                return <Line key={i} points={m.points} {...stroke} lineCap="round" lineJoin="round" />
              case 'circle':
                return <Circle key={i} x={m.x} y={m.y} radius={m.radius} {...stroke} />
              case 'spot':
                return <Circle key={i} x={m.x} y={m.y} radius={spotRadius} fill={lineColor} />
            }
          })}
          {GOALS.map((g, i) => (
            <Rect key={`goal-${i}`} {...g} fill={colors.goalFill} stroke={lineColor} strokeWidth={lineWidth * 1.5} />
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

/** Mown grass: wide or fine stripes across the length, or a check pattern. */
function MowingPattern({
  viewport,
  color,
  pattern,
}: {
  viewport: ViewRect
  color: string
  pattern: 'stripes' | 'fineStripes' | 'check'
}) {
  if (pattern === 'check') {
    const size = PITCH.length / CHECK_COUNT
    const rows = Math.ceil((viewport.y + viewport.height) / size) + 1
    const firstRow = Math.floor(viewport.y / size)
    const cells = []
    for (let col = Math.floor(viewport.x / size); col * size < viewport.x + viewport.width; col++) {
      for (let row = firstRow; row < rows; row++) {
        if ((col + row) % 2 !== 0) continue
        cells.push(
          <Rect key={`${col}-${row}`} x={col * size} y={row * size} width={size} height={size} fill={color} />,
        )
      }
    }
    return (
      <Group clipX={viewport.x} clipY={viewport.y} clipWidth={viewport.width} clipHeight={viewport.height}>
        {cells}
      </Group>
    )
  }
  const count = pattern === 'fineStripes' ? FINE_STRIPE_COUNT : STRIPE_COUNT
  const width = PITCH.length / count
  return (
    <>
      {Array.from({ length: count }, (_, i) =>
        i % 2 === 0 ? (
          <Rect key={i} x={i * width} y={viewport.y} width={width} height={viewport.height} fill={color} />
        ) : null,
      )}
    </>
  )
}
