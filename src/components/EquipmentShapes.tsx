import { useContext } from 'react'
import { Circle, Ellipse, Group, Line, Rect } from 'react-konva'
import { displayColor } from '../field/pitchStyle'
import { LADDER, SLALOM, WALL } from '../items/equipment'
import { PitchColorContext } from './pitchColorContext'

// Training equipment seen from above, in meters. Rotation 0 = facing right (+x).

const POLE_RADIUS = 0.25

interface GoalShapeProps {
  width: number
  depth: number
  color: string
  rotation?: number
  /** 'center': goal centered at (0, 0); 'posts': posts at x = 0, net behind (towards -x) */
  anchor?: 'center' | 'posts'
}

/** Goal with net; the opening faces +x. */
export function GoalShape({ width, depth, color, rotation = 0, anchor = 'center' }: GoalShapeProps) {
  const pitchColor = useContext(PitchColorContext)
  const onWhite = pitchColor === 'white'
  const halfW = width / 2
  const mesh = Math.min(0.5, width / 6)
  const postWidth = Math.min(0.25, Math.max(0.1, width * 0.05))
  const netLines: number[][] = []
  for (let y = -halfW + mesh; y < halfW - 1e-9; y += mesh) netLines.push([-depth, y, 0, y])
  for (let x = -depth + mesh; x < -1e-9; x += mesh) netLines.push([x, -halfW, x, halfW])
  const frameColor = displayColor(color, pitchColor)

  return (
    <Group rotation={rotation} offsetX={anchor === 'center' ? -depth / 2 : 0}>
      <Rect
        x={-depth}
        y={-halfW}
        width={depth}
        height={width}
        fill={onWhite ? 'rgba(31,41,55,0.06)' : 'rgba(255,255,255,0.15)'}
      />
      {netLines.map((points, i) => (
        <Line
          key={i}
          points={points}
          stroke={onWhite ? 'rgba(31,41,55,0.45)' : 'rgba(255,255,255,0.6)'}
          strokeWidth={Math.min(0.04, postWidth / 4)}
        />
      ))}
      <Line
        points={[0, -halfW, -depth, -halfW, -depth, halfW, 0, halfW]}
        stroke={frameColor}
        strokeWidth={postWidth * 0.4}
        lineJoin="round"
      />
      {/* Posts and crossbar */}
      <Line points={[0, -halfW, 0, halfW]} stroke={frameColor} strokeWidth={postWidth} lineCap="round" />
    </Group>
  )
}

export function PoleShape({ color, x = 0, y = 0 }: { color: string; x?: number; y?: number }) {
  return (
    <Group x={x} y={y}>
      <Circle radius={POLE_RADIUS + 0.1} fill="rgba(0,0,0,0.25)" />
      <Circle radius={POLE_RADIUS} fill={color} stroke="#111827" strokeWidth={0.06} />
    </Group>
  )
}

/** Training mannequin from above: shoulders and head, facing +x. */
export function DummyShape({ color, y = 0 }: { color: string; y?: number }) {
  return (
    <Group y={y}>
      <Ellipse radiusX={0.24} radiusY={0.42} fill={color} stroke="#111827" strokeWidth={0.05} />
      <Circle x={0.04} radius={0.16} fill="#f5f5f4" stroke="#111827" strokeWidth={0.04} />
      {/* Small nose mark shows the facing direction */}
      <Circle x={0.2} radius={0.05} fill="#111827" />
    </Group>
  )
}

/** Free-kick wall: dummies side by side. */
export function WallShape({ color, rotation }: { color: string; rotation: number }) {
  const offset = ((WALL.dummies - 1) * WALL.spacing) / 2
  return (
    <Group rotation={rotation}>
      {Array.from({ length: WALL.dummies }, (_, i) => (
        <DummyShape key={i} color={color} y={i * WALL.spacing - offset} />
      ))}
    </Group>
  )
}

/** Row of slalom poles along the facing direction. */
export function SlalomShape({ color, rotation }: { color: string; rotation: number }) {
  const offset = ((SLALOM.count - 1) * SLALOM.spacing) / 2
  return (
    <Group rotation={rotation}>
      <Line
        points={[-offset, 0, offset, 0]}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={0.06}
        dash={[0.3, 0.3]}
      />
      {Array.from({ length: SLALOM.count }, (_, i) => (
        <PoleShape key={i} color={color} x={i * SLALOM.spacing - offset} />
      ))}
    </Group>
  )
}

/** Agility ladder lying along the facing direction. */
export function LadderShape({ color, rotation }: { color: string; rotation: number }) {
  const halfL = LADDER.length / 2
  const halfW = LADDER.width / 2
  const rungs: number[] = []
  for (let x = -halfL; x <= halfL + 1e-9; x += LADDER.rungSpacing) rungs.push(x)
  return (
    <Group rotation={rotation}>
      {rungs.map((x) => (
        <Line key={x} points={[x, -halfW, x, halfW]} stroke={color} strokeWidth={0.07} />
      ))}
      <Line points={[-halfL, -halfW, halfL, -halfW]} stroke={color} strokeWidth={0.08} />
      <Line points={[-halfL, halfW, halfL, halfW]} stroke={color} strokeWidth={0.08} />
    </Group>
  )
}
