import { Circle, Group, Line, Rect, RegularPolygon, Text } from 'react-konva'
import { contrastTextColor } from '../items/colors'
import type { Item } from '../model/types'

const PLAYER_RADIUS = 1
const BALL_RADIUS = 0.55
const CONE_RADIUS = 0.5
const POLE_RADIUS = 0.25
const GOAL_WIDTH = 5
const GOAL_DEPTH = 2
const TEXT_SIZE = 2
const TEXT_BOX_WIDTH = 16

type ShapeProps = Pick<Item, 'type' | 'color' | 'label' | 'rotation'>

/** Draws an item centered at (0, 0) in meter units. */
export function ItemShape({ type, color, label, rotation }: ShapeProps) {
  switch (type) {
    case 'player':
      return (
        <Group>
          <Group rotation={rotation}>
            {/* Facing marker */}
            <RegularPolygon
              x={PLAYER_RADIUS + 0.15}
              sides={3}
              radius={0.35}
              rotation={90}
              fill={color}
              stroke="#ffffff"
              strokeWidth={0.08}
            />
          </Group>
          <Circle radius={PLAYER_RADIUS} fill={color} stroke="#ffffff" strokeWidth={0.15} />
          <Text
            text={label}
            width={PLAYER_RADIUS * 2}
            height={PLAYER_RADIUS * 2}
            offsetX={PLAYER_RADIUS}
            offsetY={PLAYER_RADIUS}
            align="center"
            verticalAlign="middle"
            fontSize={1.05}
            fontStyle="bold"
            fill={contrastTextColor(color)}
          />
        </Group>
      )
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
            fill="rgba(255,255,255,0.15)"
          />
          {netLines.map((points, i) => (
            <Line key={i} points={points} stroke="rgba(255,255,255,0.6)" strokeWidth={0.04} />
          ))}
          <Line
            points={[0, -halfW, -GOAL_DEPTH, -halfW, -GOAL_DEPTH, halfW, 0, halfW]}
            stroke={color}
            strokeWidth={0.1}
            lineJoin="round"
          />
          {/* Posts and crossbar */}
          <Line points={[0, -halfW, 0, halfW]} stroke={color} strokeWidth={0.25} lineCap="round" />
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
          fill={color}
          shadowColor="#000000"
          shadowBlur={0.3}
          shadowOpacity={0.6}
        />
      )
  }
}
