import Konva from 'konva'
import { useContext, useMemo } from 'react'
import { Circle, Ellipse, Group, Line, Rect, RegularPolygon, Shape, Wedge } from 'react-konva'
import { MeterText, TEXT_SCALE } from './MeterText'
import { FigureDummyShape, PoleDummyShape } from './PerspectiveDummies'
import { DiscPoleShape, FlagPoleShape, GoalPerspectiveShape } from './PerspectiveEquipment'
import { figureMirrored, PlayerFigureShape } from './PlayerFigures'
import { CrestItem, PictureItem } from './PictureShapes'
import { displayColor } from '../field/pitchStyle'
import { contrastTextColor } from '../items/colors'
import { AGILITY_SQUARE, TRAINING_BALL } from '../items/palette'
import { MINIGOAL } from '../items/equipment'
import {
  DiscShape,
  DummyShape,
  FlagShape,
  GoalShape,
  HurdleShape,
  LadderShape,
  PoleShape,
  ReboundShape,
  RingShape,
  SlalomShape,
  WallShape,
} from './EquipmentShapes'
import { PitchColorContext } from './pitchColorContext'
import { ViewRotationContext } from './viewRotationContext'
import type { Item } from '../model/types'
import { textBoxFontFactor, textBoxWidth, type TextBoxStyle } from '../items/textBoxStyle'
import { textBoxBody, textBoxTail, traceTextBoxBody } from '../items/textBoxGeometry'

const PLAYER_RADIUS = 1
const TRIANGLE_RADIUS = 1.3
const CROSS_HALF = 0.85
/** Half height of the jersey in meters */
const SHIRT_SIZE = 1.15
/** Jersey outline in units of SHIRT_SIZE: collar, shoulders, sleeves, body */
const SHIRT_OUTLINE = [
  -0.34, -1, 0, -0.72, 0.34, -1, 0.78, -0.86, 1.08, -0.42, 0.74, -0.18, 0.62, -0.36, 0.62, 1, -0.62, 1, -0.62,
  -0.36, -0.74, -0.18, -1.08, -0.42, -0.78, -0.86,
]
const SHIRT_COLLAR = [-0.34, -1, 0, -0.72, 0.34, -1]
/** Half side of the coach badge in meters */
const COACH_HALF = 0.95
const BALL_RADIUS = 0.55
const CONE_RADIUS = 0.5
const GOAL_WIDTH = 5
const GOAL_DEPTH = 2
const TEXT_SIZE = 2
const TEXT_BOX_WIDTH = 16
const TEXTBOX_PADDING = 0.6
const TEXTBOX_FONT_SIZE = 1.1
const NAME_FONT_SIZE = 0.8
const GLOW_COLOR = '#fde047'

type ShapeProps = Pick<Item, 'type' | 'color' | 'label' | 'rotation' | 'shape' | 'facing' | 'pose' | 'box' | 'lean' | 'view'> & {
  /** Player name tag (empty = none) */
  name?: string
  /** Highlight ring strength 0..1 */
  glow?: number
}

/** Draws an item centered at (0, 0) in meter units. */
export function ItemShape({ type, color, label, rotation, shape, facing = true, name = '', glow = 0, pose, box, lean, view }: ShapeProps) {
  const pitchColor = useContext(PitchColorContext)
  const upright = -useContext(ViewRotationContext)
  const onWhite = pitchColor === 'white'
  switch (type) {
    case 'player':
      return (
        <Group>
          {glow > 0 && <HighlightRing strength={glow} />}
          <PlayerShapeView color={color} label={label} rotation={rotation} shape={shape} facing={facing} />
          {name && <NameTag name={name} />}
        </Group>
      )
    case 'textbox':
      return <TextBox text={label} background={color} rotation={rotation + upright} style={box} />
    case 'ball':
      if (color === TRAINING_BALL) return <TrainingBall />
      return (
        <Group>
          <Circle radius={BALL_RADIUS} fill={color} stroke="#111827" strokeWidth={0.08} />
          <RegularPolygon sides={5} radius={0.2} fill="#111827" />
          {[0, 72, 144, 216, 288].map((angle) => {
            const rad = ((angle - 90) * Math.PI) / 180
            return (
              <Circle
                key={angle}
                x={Math.cos(rad) * 0.4}
                y={Math.sin(rad) * 0.4}
                radius={0.08}
                fill="#111827"
              />
            )
          })}
        </Group>
      )
    case 'cone':
      return (
        <Group rotation={rotation}>
          <Circle radius={CONE_RADIUS} fill={color} stroke="#9a3412" strokeWidth={0.06} />
          <Circle radius={CONE_RADIUS * 0.45} fill="#fed7aa" />
        </Group>
      )
    case 'pole':
      return <PoleShape color={color} />
    case 'goal':
      return <GoalShape width={GOAL_WIDTH} depth={GOAL_DEPTH} color={color} rotation={rotation} />
    case 'minigoal':
      return <GoalShape width={MINIGOAL.width} depth={MINIGOAL.depth} color={color} rotation={rotation} />
    case 'slalom':
      return <SlalomShape color={color} rotation={rotation} />
    case 'poleDummy':
      // Seen from the side, so it always stands upright on screen.
      return (
        <Group rotation={upright}>
          <PoleDummyShape color={color} />
        </Group>
      )
    case 'flagPole':
      return (
        <Group rotation={upright}>
          <FlagPoleShape color={color} />
        </Group>
      )
    case 'discPole':
      return (
        <Group rotation={upright}>
          <DiscPoleShape color={color} lean={lean ?? 'right'} />
        </Group>
      )
    case 'goalFront':
      return (
        <Group rotation={upright}>
          <GoalPerspectiveShape color={color} view={view ?? 'front'} />
        </Group>
      )
    case 'figure':
      return (
        <Group rotation={upright}>
          {glow > 0 && <Ellipse y={1.1} radiusX={1.1} radiusY={0.38} stroke={GLOW_COLOR} strokeWidth={0.14} opacity={glow} listening={false} />}
          <PlayerFigureShape color={color} pose={pose ?? 'stand'} label={label} mirrored={figureMirrored(rotation - upright)} />
          {name && <NameTag name={name} />}
        </Group>
      )
    case 'marker':
      // Round marker with a number or letter; the text always reads upright.
      return (
        <Group rotation={upright}>
          {glow > 0 && <HighlightRing strength={glow * 0.6} />}
          <Circle radius={0.78} fill={color} stroke="rgba(15,23,42,0.75)" strokeWidth={0.09} shadowColor="#000" shadowOpacity={0.3} shadowBlur={0.15} shadowOffsetY={0.06} />
          <MeterText
            text={label}
            x={-0.78}
            y={-0.78}
            width={1.56}
            height={1.56}
            align="center"
            verticalAlign="middle"
            fontSize={label.length > 1 ? 0.78 : 0.95}
            fontStyle="bold"
            fill={contrastTextColor(color)}
            wrap="none"
          />
        </Group>
      )
    case 'figureDummy':
      return (
        <Group rotation={upright}>
          <FigureDummyShape color={color} />
        </Group>
      )
    case 'dummy':
      return (
        <Group rotation={rotation}>
          <DummyShape color={color} />
        </Group>
      )
    case 'wall':
      return <WallShape color={color} rotation={rotation} />
    case 'ladder':
      return <LadderShape color={color} rotation={rotation} />
    case 'hurdle':
      return <HurdleShape color={color} rotation={rotation} />
    case 'ring':
      return <RingShape color={color} />
    case 'flag':
      return <FlagShape color={color} rotation={rotation} />
    case 'disc':
      return <DiscShape color={color} />
    case 'image':
      // Pictures stay upright on screen in portrait, plus their own rotation.
      return (
        <Group rotation={rotation + upright}>
          <PictureItem id={label} />
        </Group>
      )
    case 'crest':
      // Like pictures: upright on screen in portrait, plus their own rotation.
      return (
        <Group rotation={rotation + upright}>
          <CrestItem id={label} />
        </Group>
      )
    case 'agility':
      return <AgilityGrid color={color} count={label === '4' ? 4 : 3} rotation={rotation} />
    case 'coach':
      return (
        <Group>
          {glow > 0 && <HighlightRing strength={glow} />}
          <Group rotation={upright}>
            <Rect
              x={-COACH_HALF}
              y={-COACH_HALF}
              width={COACH_HALF * 2}
              height={COACH_HALF * 2}
              cornerRadius={0.35}
              fill={color}
              stroke="#ffffff"
              strokeWidth={0.15}
            />
            <MeterText
              text={label}
              width={COACH_HALF * 2}
              height={COACH_HALF * 2}
              offsetX={COACH_HALF}
              offsetY={COACH_HALF}
              align="center"
              verticalAlign="middle"
              fontSize={0.85}
              fontStyle="bold"
              fill={contrastTextColor(color)}
            />
          </Group>
          {name && <NameTag name={name} />}
        </Group>
      )
    case 'rebounder':
      return <ReboundShape color={color} rotation={rotation} />
    case 'text':
      return (
        <MeterText
          text={label}
          rotation={rotation + upright}
          width={TEXT_BOX_WIDTH}
          offsetX={TEXT_BOX_WIDTH / 2}
          offsetY={TEXT_SIZE / 2}
          align="center"
          fontSize={TEXT_SIZE}
          fontStyle="bold"
          fill={displayColor(color, pitchColor)}
          shadowColor="#000000"
          shadowBlur={onWhite ? 0 : 0.3}
          shadowOpacity={0.6}
        />
      )
  }
}

/** Facing marker in front of a circle or cross player (rotation 0 = facing right). */
function FacingMarker({ color, rotation, distance }: { color: string; rotation: number; distance: number }) {
  return (
    <Group rotation={rotation}>
      <RegularPolygon
        x={distance}
        sides={3}
        radius={0.55}
        rotation={90}
        fill={color}
        stroke="#ffffff"
        strokeWidth={0.1}
      />
    </Group>
  )
}

function PlayerShapeView({ color, label, rotation, shape, facing = true }: Omit<ShapeProps, 'type'>) {
  const upright = -useContext(ViewRotationContext)
  if (shape === 'triangle') {
    // The tip of the triangle shows the facing direction, so no extra marker.
    return (
      <Group>
        <RegularPolygon
          sides={3}
          radius={TRIANGLE_RADIUS}
          rotation={rotation + 90}
          fill={color}
          stroke="#ffffff"
          strokeWidth={0.15}
          lineJoin="round"
        />
        <Group rotation={upright}>
          <PlayerLabel label={label} color={contrastTextColor(color)} box={PLAYER_RADIUS * 1.6} />
        </Group>
      </Group>
    )
  }
  if (shape === 'cross') {
    const arms = [
      [-CROSS_HALF, -CROSS_HALF, CROSS_HALF, CROSS_HALF],
      [-CROSS_HALF, CROSS_HALF, CROSS_HALF, -CROSS_HALF],
    ]
    return (
      <Group>
        {facing && <FacingMarker color={color} rotation={rotation} distance={CROSS_HALF + 0.6} />}
        {arms.map((points, i) => (
          <Line key={`outline-${i}`} points={points} stroke="#ffffff" strokeWidth={0.6} lineCap="round" />
        ))}
        {arms.map((points, i) => (
          <Line key={`arm-${i}`} points={points} stroke={color} strokeWidth={0.36} lineCap="round" />
        ))}
        {/* The number sits on the crossing point; a white outline keeps it readable on the arms. */}
        <Group rotation={upright}>
          <MeterText
            text={label}
            width={CROSS_HALF * 2}
            height={CROSS_HALF * 2}
            offsetX={CROSS_HALF}
            offsetY={CROSS_HALF}
            align="center"
            verticalAlign="middle"
            fontSize={0.95}
            fontStyle="bold"
            fill="#111827"
            stroke="#ffffff"
            strokeWidth={0.18}
            fillAfterStrokeEnabled
          />
        </Group>
      </Group>
    )
  }
  if (shape === 'shirt') {
    // Own jersey outline (sleeves, V collar); always upright so it reads like a line-up sheet,
    // and never with a direction arrow.
    return (
      <Group>
        <Group rotation={upright}>
          <Line
            points={SHIRT_OUTLINE.map((v) => v * SHIRT_SIZE)}
            closed
            fill={color}
            stroke="#ffffff"
            strokeWidth={0.13}
            lineJoin="round"
          />
          <Line
            points={SHIRT_COLLAR.map((v) => v * SHIRT_SIZE)}
            stroke="#ffffff"
            strokeWidth={0.1}
            lineJoin="round"
            lineCap="round"
          />
          <MeterText
            text={label}
            width={SHIRT_SIZE * 1.4}
            height={SHIRT_SIZE * 1.2}
            offsetX={SHIRT_SIZE * 0.7}
            offsetY={SHIRT_SIZE * 0.45}
            align="center"
            verticalAlign="middle"
            fontSize={0.95}
            fontStyle="bold"
            fill={contrastTextColor(color)}
          />
        </Group>
      </Group>
    )
  }
  return (
    <Group>
      {facing && <FacingMarker color={color} rotation={rotation} distance={PLAYER_RADIUS + 0.3} />}
      <Circle radius={PLAYER_RADIUS} fill={color} stroke="#ffffff" strokeWidth={0.15} />
      <Group rotation={upright}>
        <PlayerLabel label={label} color={contrastTextColor(color)} box={PLAYER_RADIUS * 2} />
      </Group>
    </Group>
  )
}

function PlayerLabel({ label, color, box }: { label: string; color: string; box: number }) {
  return (
    <MeterText
      text={label}
      width={box}
      height={box}
      offsetX={box / 2}
      offsetY={box / 2}
      align="center"
      verticalAlign="middle"
      fontSize={1.05}
      fontStyle="bold"
      fill={color}
    />
  )
}

/** Soft glowing ring behind a player. */
function HighlightRing({ strength }: { strength: number }) {
  return (
    <Group listening={false}>
      <Circle radius={2.3} fill={GLOW_COLOR} opacity={0.12 * strength} />
      <Circle radius={1.95} fill={GLOW_COLOR} opacity={0.22 * strength} />
      <Circle radius={1.6} fill={GLOW_COLOR} opacity={0.35 * strength} />
      <Circle radius={1.45} stroke={GLOW_COLOR} strokeWidth={0.2} opacity={strength} />
    </Group>
  )
}

/** Name tag below a player, for line-ups. Not rotated, so it always reads straight. */
function NameTag({ name }: { name: string }) {
  const upright = -useContext(ViewRotationContext)
  // Rough text width: average character is about half the font size wide.
  const width = Math.max(2, name.length * NAME_FONT_SIZE * 0.55 + 0.8)
  const height = NAME_FONT_SIZE + 0.4
  const top = 1.55
  return (
    <Group listening={false} rotation={upright}>
      <Rect
        x={-width / 2}
        y={top}
        width={width}
        height={height}
        cornerRadius={0.25}
        fill="#ffffff"
        opacity={0.92}
        stroke="rgba(15,23,42,0.35)"
        strokeWidth={0.05}
      />
      <MeterText
        text={name}
        x={-width / 2}
        y={top}
        width={width}
        height={height}
        align="center"
        verticalAlign="middle"
        fontSize={NAME_FONT_SIZE}
        fontStyle="bold"
        fill="#111827"
        wrap="none"
        ellipsis
      />
    </Group>
  )
}

/**
 * Colored box with wrapped text for instructions or coaching points, centered at (0, 0):
 * rectangle, rounded, oval or cloud, optionally with a speech tail or thought bubbles.
 */
function TextBox({ text, background, rotation, style }: { text: string; background: string; rotation: number; style?: TextBoxStyle }) {
  const f = textBoxFontFactor(style)
  const width = textBoxWidth(style)
  const fontSize = TEXTBOX_FONT_SIZE * f
  const padding = TEXTBOX_PADDING * f
  const fontStyle = [style?.italic ? 'italic' : '', style?.bold ? 'bold' : ''].filter(Boolean).join(' ') || 'normal'
  // Measure the wrapped text once per change so the box fits around it.
  const height = useMemo(() => {
    const measure = new Konva.Text({
      text: text || ' ',
      // Measured at the same enlarged size as it is drawn (see MeterText).
      width: width * TEXT_SCALE,
      padding: padding * TEXT_SCALE,
      fontSize: fontSize * TEXT_SCALE,
      fontStyle,
      lineHeight: 1.25,
      wrap: 'word',
    })
    const h = measure.height() / TEXT_SCALE
    measure.destroy()
    return h
  }, [text, width, padding, fontSize, fontStyle])

  const shape = style?.shape ?? 'rounded'
  const round = shape === 'oval' || shape === 'cloud'
  const body = textBoxBody(shape, width, height, f)
  const stroke = style?.border ?? 'rgba(15,23,42,0.3)'
  const strokeWidth = style?.border ? 0.16 * Math.max(1, f * 0.8) : 0.08
  const tail = style?.tail ? textBoxTail(body, style.tail, f) : null
  const thought = style?.tailKind === 'thought'

  return (
    <Group rotation={rotation}>
      {tail && !thought && <Line points={tail.points} closed fill={background} stroke={stroke} strokeWidth={strokeWidth} lineJoin="round" />}
      <Shape
        sceneFunc={(ctx, node) => {
          ctx.beginPath()
          traceTextBoxBody(ctx, body)
          ctx.closePath()
          ctx.fillStrokeShape(node)
        }}
        fill={background}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      {/* Covers the border where the speech tail joins the box */}
      {tail && !thought && <Line points={tail.points} closed fill={background} />}
      {tail &&
        thought &&
        tail.bubbles.map((b, i) => <Circle key={i} x={b.x} y={b.y} radius={b.r} fill={background} stroke={stroke} strokeWidth={strokeWidth} />)}
      <MeterText
        text={text}
        x={-width / 2}
        y={-height / 2}
        width={width}
        padding={padding}
        fontSize={fontSize}
        fontStyle={fontStyle}
        lineHeight={1.25}
        wrap="word"
        align={round ? 'center' : 'left'}
        fill={contrastTextColor(background)}
      />
    </Group>
  )
}

/** White ball with three colored segments. */
function TrainingBall() {
  const segments = ['#2563eb', '#facc15', '#dc2626']
  return (
    <Group>
      <Circle radius={BALL_RADIUS} fill="#ffffff" />
      {segments.map((fill, i) => (
        <Wedge key={fill} radius={BALL_RADIUS} angle={60} rotation={i * 120 - 90} fill={fill} />
      ))}
      <Circle radius={BALL_RADIUS * 0.28} fill="#ffffff" />
      <Circle radius={BALL_RADIUS} stroke="#111827" strokeWidth={0.08} />
    </Group>
  )
}

/** Coordination grid on the ground: count × count squares with marker discs at the corners. */
function AgilityGrid({ color, count, rotation }: { color: string; count: number; rotation: number }) {
  const half = (count * AGILITY_SQUARE) / 2
  const positions = Array.from({ length: count + 1 }, (_, i) => -half + i * AGILITY_SQUARE)
  return (
    <Group rotation={rotation}>
      <Rect x={-half} y={-half} width={half * 2} height={half * 2} fill="rgba(255,255,255,0.06)" />
      {positions.map((p, i) => (
        <Line key={`v${i}`} points={[p, -half, p, half]} stroke={color} strokeWidth={0.07} />
      ))}
      {positions.map((p, i) => (
        <Line key={`h${i}`} points={[-half, p, half, p]} stroke={color} strokeWidth={0.07} />
      ))}
      {positions.flatMap((x, i) =>
        positions.map((y, j) => (
          <Circle key={`${i}-${j}`} x={x} y={y} radius={0.13} fill={color} stroke="#111827" strokeWidth={0.03} />
        )),
      )}
    </Group>
  )
}
