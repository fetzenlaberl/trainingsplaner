import { useContext } from 'react'
import { Circle, Group, Line, Rect } from 'react-konva'
import { MeterText } from './MeterText'
import { PitchBackground } from './PictureShapes'
import { fieldSize, PITCH, type FieldType, type Rect as ViewRect } from '../field/dimensions'
import { BOARDS, getFieldBoards, getFieldGoals, getFieldMarkings, type Goal, type Marking } from '../field/markings'
import { surfaceTexture } from '../field/surfaceTextures'
import {
  fitGridLabel,
  fitGridToField,
  pitchGridLabels,
  gridFills,
  gridLines,
  COLOR_GRID_OPACITY,
  LIGHT_SOURCES,
  lightingStops,
  screenToField,
  type GridLabel,
  type Lighting,
  type LightKind,
  type LightSource,
  type PitchGradient,
  PITCH_COLORS,
  PITCH_LINE_WIDTHS,
  resolveLighting,
  resolveMowing,
  RETREAT_LINE_DISTANCE,
  ROUNDED_CORNER_RADIUS,
  stripeColor,
  type PitchStyle,
} from '../field/pitchStyle'
import { ViewRotationContext } from './viewRotationContext'

/** Zone numbers in the corner of their cell (meters) */
const CORNER_LABEL_SIZE = 2.2
const CORNER_LABEL_PADDING = 0.8
/** Bigger corner labels keep a little more distance to the lines. */
const cornerPadding = (label: GridLabel) => CORNER_LABEL_PADDING * Math.sqrt((label.size ?? CORNER_LABEL_SIZE) / CORNER_LABEL_SIZE)

/** Zone name or number on a light badge (colored grids), centered on its point and kept upright. */
function GridBadge({ label, size, upright }: { label: GridLabel; size: number; upright: number }) {
  const font = size * 0.8
  const width = label.text.length * font * 0.6 + font * 1.1
  const height = font * 1.5
  return (
    <Group x={label.x} y={label.y} rotation={upright}>
      <Rect x={-width / 2} y={-height / 2} width={width} height={height} cornerRadius={height * 0.25} fill="rgba(255,255,255,0.85)" />
      <MeterText
        text={label.text}
        x={-width / 2}
        y={-height / 2}
        width={width}
        height={height}
        align="center"
        verticalAlign="middle"
        fontSize={font}
        fontStyle="bold"
        fill="#0f172a"
      />
    </Group>
  )
}

/** Lines and goals per field type, computed once. */
const LAYOUTS = new Map<FieldType, { markings: Marking[]; goals: Goal[] }>()
function fieldLayout(type: FieldType) {
  let layout = LAYOUTS.get(type)
  if (!layout) {
    layout = { markings: getFieldMarkings(type), goals: getFieldGoals(type) }
    LAYOUTS.set(type, layout)
  }
  return layout
}

/** Color of the boards around the indoor field */
const BOARD_COLOR = '#d6d3d1'

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
  const texture = colors.texture ? surfaceTexture(colors.texture) : null
  const mowing = resolveMowing(pitch)
  const lighting = resolveLighting(pitch)
  // Zone numbers stay upright in portrait.
  const upright = -useContext(ViewRotationContext)
  const portrait = upright !== 0
  const labelSize = 3.2
  const size = fieldSize(fieldType, pitch.area)
  const { markings, goals } = fieldLayout(fieldType)
  const boards = getFieldBoards(fieldType)
  // Retreat lines belong to the big pitch (the small fields are too short for them).
  const retreat = pitch.retreatLines === true && size.length === PITCH.length && fieldType !== 'empty'
  const fit = fitGridToField(pitch.grid, size)
  const fitPoints = (points: number[]) => {
    const a = fit.point(points[0], points[1])
    const b = fit.point(points[2], points[3])
    return [a.x, a.y, b.x, b.y]
  }

  return (
    <Group listening={false}>
      {pitch.gradient ? (
        <GradientSurface viewport={viewport} upright={upright} gradient={pitch.gradient} />
      ) : (
        <Rect {...viewport} fill={colors.base} />
      )}
      {mowing.kind !== 'none' && (
        <MowingPattern
          viewport={viewport}
          // On an own two-color surface the stripes are a light shade, so both colors stay visible.
          color={pitch.gradient ? 'rgba(255,255,255,0.06)' : stripeColor(pitch.color)}
          kind={mowing.kind}
          count={mowing.count}
          size={size}
        />
      )}
      {texture && (
        <Rect
          {...viewport}
          // Konva accepts any canvas image source here; its type only names HTMLImageElement.
          fillPatternImage={texture.image as unknown as HTMLImageElement}
          fillPatternRepeat="repeat"
          fillPatternScaleX={texture.meters / texture.px}
          fillPatternScaleY={texture.meters / texture.px}
        />
      )}
      {pitch.background && (
        <PitchBackground id={pitch.background} opacity={pitch.backgroundOpacity ?? 1} viewport={viewport} upright={upright} />
      )}
      {lighting !== 'none' && (
        <LightOverlay viewport={viewport} upright={upright} lighting={lighting} source={pitch.lightSource} kind={pitch.lightKind} />
      )}

      {/* Colored grid zones lie under the pitch markings */}
      {gridFills(pitch.grid).map((f, i) => {
        const a = fit.point(f.x1, f.y1)
        const b = fit.point(f.x2, f.y2)
        return <Rect key={`fill-${i}`} x={a.x} y={a.y} width={b.x - a.x} height={b.y - a.y} fill={f.color} opacity={COLOR_GRID_OPACITY} />
      })}

      {boards && (
        <Rect
          {...boards}
          stroke={BOARD_COLOR}
          strokeWidth={BOARDS.thickness}
          cornerRadius={BOARDS.cornerRadius}
          shadowColor="black"
          shadowOpacity={0.35}
          shadowBlur={0.4}
        />
      )}
      {fieldType !== 'empty' && (
        <>
          {markings.map((m, i) => {
            switch (m.kind) {
              case 'rect': {
                // Rounded corners only on the outer lines (touch and goal lines).
                const outer = m.outer === true
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
          {retreat &&
            [RETREAT_LINE_DISTANCE, PITCH.length - RETREAT_LINE_DISTANCE].map((x) => (
              <Line
                key={`retreat-${x}`}
                points={[x, 0, x, PITCH.width]}
                {...stroke}
                dash={[lineWidth * 8, lineWidth * 6]}
                lineCap="butt"
              />
            ))}
          {goals.map((g, i) => (
            <Rect key={`goal-${i}`} {...g} fill={colors.goalFill} stroke={lineColor} strokeWidth={lineWidth * 1.5} />
          ))}
        </>
      )}

      {gridLines(pitch.grid, pitch.customGrid, size).map((points, i) => (
        <Line
          key={`grid-${i}`}
          points={fitPoints(points)}
          stroke={colors.grid}
          strokeWidth={gridWidth}
          // The own grid is an exercise field: solid lines; other grids are dashed guides.
          dash={pitch.grid === 'custom' ? undefined : [gridWidth * 6, gridWidth * 4]}
        />
      ))}
      {pitchGridLabels(pitch, upright, size)
        .map((label) => fitGridLabel(label, fit, label.cell ? CORNER_LABEL_SIZE : labelSize))
        .map((label) =>
        label.badge ? (
          <GridBadge key={`zone-${label.text}-${label.x}-${label.y}`} label={label} size={label.size ?? labelSize} upright={upright} />
        ) : label.cell ? (
          // Small number in the top left corner of the cell as seen on screen (portrait turns the pitch).
          <MeterText
            key={`zone-${label.text}`}
            text={label.text}
            x={portrait ? label.cell.x2 - cornerPadding(label) : label.cell.x1 + cornerPadding(label)}
            y={label.cell.y1 + cornerPadding(label)}
            rotation={upright}
            fontSize={label.size ?? CORNER_LABEL_SIZE}
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
          width={(label.size ?? labelSize) * 2}
          height={label.size ?? labelSize}
          offsetX={label.size ?? labelSize}
          offsetY={(label.size ?? labelSize) / 2}
          align="center"
          verticalAlign="middle"
          fontSize={label.size ?? labelSize}
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
  size,
}: {
  viewport: ViewRect
  color: string
  kind: 'across' | 'along' | 'check'
  count: number
  size: { length: number; width: number }
}) {
  const sizeX = size.length / count
  const sizeY = kind === 'along' ? size.width / count : sizeX
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

type Viewport = ViewRect

/** Konva gradient points are relative to the shape's own position. */
const local = (viewport: Viewport, p: { x: number; y: number }) => ({ x: p.x - viewport.x, y: p.y - viewport.y })

const distanceToFarthestCorner = (viewport: Viewport, p: { x: number; y: number }) =>
  Math.max(
    ...[
      [viewport.x, viewport.y],
      [viewport.x + viewport.width, viewport.y],
      [viewport.x, viewport.y + viewport.height],
      [viewport.x + viewport.width, viewport.y + viewport.height],
    ].map(([x, y]) => Math.hypot(x - p.x, y - p.y)),
  )

/** Light over the surface: from the centre, a side or a corner as seen on screen. */
function LightOverlay({
  viewport,
  upright,
  lighting,
  source = 'center',
  kind = 'spot',
}: {
  viewport: Viewport
  upright: number
  lighting: Lighting
  source?: LightSource
  kind?: LightKind
}) {
  const at = LIGHT_SOURCES.find((s) => s.value === source) ?? LIGHT_SOURCES[0]
  const center = screenToField(viewport, upright, at.x, at.y)
  // From the centre the light keeps its former size; from an edge it reaches across the area.
  const radius =
    source === 'center'
      ? Math.max(viewport.width, viewport.height) * 0.75
      : distanceToFarthestCorner(viewport, center) * 1.02
  return (
    <Rect
      {...viewport}
      fillRadialGradientStartPoint={local(viewport, center)}
      fillRadialGradientEndPoint={local(viewport, center)}
      fillRadialGradientStartRadius={0}
      fillRadialGradientEndRadius={radius}
      fillRadialGradientColorStops={lightingStops(lighting, kind)}
    />
  )
}

/** Own surface: two colors running into each other, directions as seen on screen. */
function GradientSurface({ viewport, upright, gradient }: { viewport: Viewport; upright: number; gradient: PitchGradient }) {
  const stops = [0, gradient.from, 1, gradient.to]
  if (gradient.direction === 'radial') {
    const center = screenToField(viewport, upright, 0, 0)
    return (
      <Rect
        {...viewport}
        fillRadialGradientStartPoint={local(viewport, center)}
        fillRadialGradientEndPoint={local(viewport, center)}
        fillRadialGradientStartRadius={0}
        fillRadialGradientEndRadius={distanceToFarthestCorner(viewport, center)}
        fillRadialGradientColorStops={stops}
      />
    )
  }
  const [sx, sy, ex, ey] =
    gradient.direction === 'leftRight' ? [-1, 0, 1, 0] : gradient.direction === 'topBottom' ? [0, -1, 0, 1] : [-1, -1, 1, 1]
  return (
    <Rect
      {...viewport}
      fillLinearGradientStartPoint={local(viewport, screenToField(viewport, upright, sx, sy))}
      fillLinearGradientEndPoint={local(viewport, screenToField(viewport, upright, ex, ey))}
      fillLinearGradientColorStops={stops}
    />
  )
}
