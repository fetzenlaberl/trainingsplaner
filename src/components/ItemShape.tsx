import { Circle, Group, Line, Rect, RegularPolygon, Text } from 'react-konva'
import { useContext } from 'react'
import { displayColor } from '../field/pitchStyle'
import { contrastTextColor } from '../items/colors'
import { PitchColorContext } from './pitchColorContext'
import type { Item } from '../model/types'

const PLAYER_RADIUS = 1
const TRIANGLE_RADIUS = 1.3
const CROSS_HALF = 0.85
const BALL_RADIUS = 0.55
const CONE_RADIUS = 0.5
const POLE_RADIUS = 0.25
const GOAL_WIDTH = 5
const GOAL_DEPTH = 2
const TEXT_SIZE = 2
const TEXT_BOX_WIDTH = 16

type ShapeProps = Pick<Item, 'type' | 'color' | 'label' | 'rotation' | 'shape'>

/** Draws an item centered at (0, 0) in meter units. */
export function ItemShape({ type, color, label, rotation, shape }: ShapeProps) {
  const pitchColor = useContext(PitchColorContext)
  const onWhite = pitchColor === 'white'
  switch (type) {
    case 'player':
      return <PlayerShapeView color={color} label={label} rotation={rotation} shape={shape} />
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
      return (
        <Group>
          <Circle radius={POLE_RADIUS + 0.1} fill="rgba(0,0,0,0.25)" />
          <Circle radius={POLE_RADIUS} fill={color} stroke="#111827" strokeWidth={0.06} />
        </Group>
      )
    case 'goal': {
      // Opening faces +x (rotation 0); net extends behind it.
      const halfW = GOAL_WIDTH / 2
      const netLines: number[][] = []
      for (let y = -halfW + 0.5; y < halfW; y += 0.5) netLines.push([-GOAL_DEPTH, y, 0, y])
      for (let x = -GOAL_DEPTH + 0.5; x < 0; x += 0.5) netLines.push([x, -halfW, x, halfW])
      return (
        <Group rotation={rotation} offsetX={-GOAL_DEPTH / 2}>
          <Rect
            x={-GOAL_DEPTH}
            y={-halfW}
            width={GOAL_DEPTH}
            height={GOAL_WIDTH}
            fill={onWhite ? 'rgba(31,41,55,0.06)' : 'rgba(255,255,255,0.15)'}
          />
          {netLines.map((points, i) => (
            <Line key={i} points={points} stroke={onWhite ? 'rgba(31,41,55,0.45)' : 'rgba(255,255,255,0.6)'} strokeWidth={0.04} />
          ))}
          <Line
            points={[0, -halfW, -GOAL_DEPTH, -halfW, -GOAL_DEPTH, halfW, 0, halfW]}
            stroke={displayColor(color, pitchColor)}
            strokeWidth={0.1}
            lineJoin="round"
          />
          {/* Posts and crossbar */}
          <Line points={[0, -halfW, 0, halfW]} stroke={displayColor(color, pitchColor)} strokeWidth={0.25} lineCap="round" />
        </Group>
      )
    }
    case 'text':
      return (
        <Text
          text={label}
          rotation={rotation}
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
        <PlayerLabel label={label} color={contrastTextColor(color)} box={PLAYER_RADIUS * 1.6} />
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
        {/* The number sits next to the cross, it would not fit inside. */}
        <Text
          text={label}
          x={CROSS_HALF * 0.7}
          y={CROSS_HALF * 0.55}
          fontSize={0.85}
          fontStyle="bold"
          fill={color}
          stroke="#ffffff"
          strokeWidth={0.06}
        />
      </Group>
    )
  }
  return (
    <Group>
      <FacingMarker color={color} rotation={rotation} distance={PLAYER_RADIUS + 0.3} />
      <Circle radius={PLAYER_RADIUS} fill={color} stroke="#ffffff" strokeWidth={0.15} />
      <PlayerLabel label={label} color={contrastTextColor(color)} box={PLAYER_RADIUS * 2} />
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
