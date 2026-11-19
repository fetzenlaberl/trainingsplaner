import Konva from 'konva'
import { useContext, useMemo } from 'react'
import { Circle, Group, Line, Rect, RegularPolygon, Text } from 'react-konva'
import { displayColor } from '../field/pitchStyle'
import { contrastTextColor } from '../items/colors'
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

const PLAYER_RADIUS = 1
const TRIANGLE_RADIUS = 1.3
const CROSS_HALF = 0.85
const BALL_RADIUS = 0.55
const CONE_RADIUS = 0.5
const GOAL_WIDTH = 5
const GOAL_DEPTH = 2
const TEXT_SIZE = 2
const TEXT_BOX_WIDTH = 16
const TEXTBOX_WIDTH = 12
const TEXTBOX_PADDING = 0.6
const TEXTBOX_FONT_SIZE = 1.1
const NAME_FONT_SIZE = 0.8
const GLOW_COLOR = '#fde047'

type ShapeProps = Pick<Item, 'type' | 'color' | 'label' | 'rotation' | 'shape'> & {
  /** Player name tag (empty = none) */
  name?: string
  /** Highlight ring strength 0..1 */
  glow?: number
}

/** Draws an item centered at (0, 0) in meter units. */
export function ItemShape({ type, color, label, rotation, shape, name = '', glow = 0 }: ShapeProps) {
  const pitchColor = useContext(PitchColorContext)
  const upright = -useContext(ViewRotationContext)
  const onWhite = pitchColor === 'white'
  switch (type) {
    case 'player':
      return (
        <Group>
          {glow > 0 && <HighlightRing strength={glow} />}
          <PlayerShapeView color={color} label={label} rotation={rotation} shape={shape} />
          {name && <NameTag name={name} />}
        </Group>
      )
    case 'textbox':
      return <TextBox text={label} background={color} rotation={rotation + upright} />
    case 'ball':
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
    case 'rebounder':
      return <ReboundShape color={color} rotation={rotation} />
    case 'text':
      return (
        <Text
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

function PlayerShapeView({ color, label, rotation, shape }: Omit<ShapeProps, 'type'>) {
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
        <FacingMarker color={color} rotation={rotation} distance={CROSS_HALF + 0.6} />
        {arms.map((points, i) => (
          <Line key={`outline-${i}`} points={points} stroke="#ffffff" strokeWidth={0.6} lineCap="round" />
        ))}
        {arms.map((points, i) => (
          <Line key={`arm-${i}`} points={points} stroke={color} strokeWidth={0.36} lineCap="round" />
        ))}
        {/* The number sits on the crossing point; a white outline keeps it readable on the arms. */}
        <Group rotation={upright}>
          <Text
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
  return (
    <Group>
      <FacingMarker color={color} rotation={rotation} distance={PLAYER_RADIUS + 0.3} />
      <Circle radius={PLAYER_RADIUS} fill={color} stroke="#ffffff" strokeWidth={0.15} />
      <Group rotation={upright}>
        <PlayerLabel label={label} color={contrastTextColor(color)} box={PLAYER_RADIUS * 2} />
      </Group>
    </Group>
  )
}

function PlayerLabel({ label, color, box }: { label: string; color: string; box: number }) {
  return (
    <Text
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
      <Text
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

/** Colored box with wrapped text for instructions, centered at (0, 0). */
function TextBox({ text, background, rotation }: { text: string; background: string; rotation: number }) {
  // Measure the wrapped text once per change so the box fits around it.
  const height = useMemo(() => {
    const measure = new Konva.Text({
      text: text || ' ',
      width: TEXTBOX_WIDTH,
      padding: TEXTBOX_PADDING,
      fontSize: TEXTBOX_FONT_SIZE,
      lineHeight: 1.25,
      wrap: 'word',
    })
    const h = measure.height()
    measure.destroy()
    return h
  }, [text])

  return (
    <Group rotation={rotation}>
      <Rect
        x={-TEXTBOX_WIDTH / 2}
        y={-height / 2}
        width={TEXTBOX_WIDTH}
        height={height}
        cornerRadius={0.4}
        fill={background}
        stroke="rgba(15,23,42,0.3)"
        strokeWidth={0.08}
      />
      <Text
        text={text}
        x={-TEXTBOX_WIDTH / 2}
        y={-height / 2}
        width={TEXTBOX_WIDTH}
        padding={TEXTBOX_PADDING}
        fontSize={TEXTBOX_FONT_SIZE}
        lineHeight={1.25}
        wrap="word"
        fill={contrastTextColor(background)}
      />
    </Group>
  )
}
