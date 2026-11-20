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
  resolveLighting,
  resolveMowing,
  ROUNDED_CORNER_RADIUS,
  stripeColor,
  type PitchStyle,
} from '../field/pitchStyle'
import { ViewRotationContext } from './viewRotationContext'

/** Zone numbers in the corner of their cell (meters) */
const CORNER_LABEL_SIZE = 2.2
const CORNER_LABEL_PADDING = 0.8

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
  const mowing = resolveMowing(pitch)
  const lighting = resolveLighting(pitch)
  // Zone numbers stay upright in portrait.
  const upright = -useContext(ViewRotationContext)
  const portrait = upright !== 0
  const labelSize = 3.2

  return (
    <Group listening={false}>
      <Rect {...viewport} fill={colors.base} />
      {mowing.kind !== 'none' && (
        <MowingPattern viewport={viewport} color={stripeColor(pitch.color)} kind={mowing.kind} count={mowing.count} />
      )}
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
      {lighting !== 'none' && (
        <Rect
          {...viewport}
          fillRadialGradientStartPoint={{ x: viewport.x + viewport.width / 2, y: viewport.y + viewport.height / 2 }}
          fillRadialGradientEndPoint={{ x: viewport.x + viewport.width / 2, y: viewport.y + viewport.height / 2 }}
          fillRadialGradientStartRadius={0}
          fillRadialGradientEndRadius={Math.max(viewport.width, viewport.height) * 0.75}
          fillRadialGradientColorStops={
            lighting === 'strong'
              ? [0, 'rgba(255,255,225,0.24)', 0.5, 'rgba(255,255,255,0.03)', 1, 'rgba(0,0,0,0.38)']
              : [0, 'rgba(255,255,240,0.12)', 0.55, 'rgba(255,255,255,0)', 1, 'rgba(0,0,0,0.22)']
          }
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
      {gridLabels(pitch.grid).map((label) =>
        label.cell ? (
          // Small number in the top left corner of the cell as seen on screen (portrait turns the pitch).
          <MeterText
            key={`zone-${label.text}`}
            text={label.text}
            x={portrait ? label.cell.x2 - CORNER_LABEL_PADDING : label.cell.x1 + CORNER_LABEL_PADDING}
            y={label.cell.y1 + CORNER_LABEL_PADDING}
            rotation={upright}
            fontSize={CORNER_LABEL_SIZE}
            fontStyle="bold"
            fill={colors.grid}
          />
        ) : (
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
        ),
      )}
    </Group>
  )
}

/**
 * Mown grass: stripes across the length (vertical in landscape), along it, or a check pattern.
 * Stripe size comes from the pitch; the pattern continues into the grass margin.
 */
function MowingPattern({
  viewport,
  color,
  kind,
  count,
}: {
  viewport: ViewRect
  color: string
  kind: 'across' | 'along' | 'check'
  count: number
}) {
  const sizeX = PITCH.length / count
  const sizeY = kind === 'along' ? PITCH.width / count : sizeX
  const cells: { x: number; y: number; w: number; h: number }[] = []
  const firstCol = Math.floor(viewport.x / sizeX)
  const lastCol = Math.ceil((viewport.x + viewport.width) / sizeX)
  const firstRow = Math.floor(viewport.y / sizeY)
  const lastRow = Math.ceil((viewport.y + viewport.height) / sizeY)
  if (kind === 'across') {
    for (let c = firstCol; c < lastCol; c++) {
      if (c % 2 === 0) cells.push({ x: c * sizeX, y: viewport.y, w: sizeX, h: viewport.height })
    }
  } else if (kind === 'along') {
    for (let r = firstRow; r < lastRow; r++) {
      if (r % 2 === 0) cells.push({ x: viewport.x, y: r * sizeY, w: viewport.width, h: sizeY })
    }
  } else {
    for (let c = firstCol; c < lastCol; c++) {
      for (let r = firstRow; r < lastRow; r++) {
        if ((c + r) % 2 === 0) cells.push({ x: c * sizeX, y: r * sizeY, w: sizeX, h: sizeY })
      }
    }
  }
  return (
    <Group clipX={viewport.x} clipY={viewport.y} clipWidth={viewport.width} clipHeight={viewport.height}>
      {cells.map((cell) => (
        <Rect key={`${cell.x}-${cell.y}`} x={cell.x} y={cell.y} width={cell.w} height={cell.h} fill={color} />
      ))}
    </Group>
  )
}
