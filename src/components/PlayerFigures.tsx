import { Circle, Ellipse, Group, Line } from 'react-konva'
import { contrastTextColor, shadeColor } from '../items/colors'
import type { FigurePose } from '../model/types'
import { MeterText } from './MeterText'

// Player figures seen from the side (own drawings), in the style of the figure dummies.
// Units are meters, origin in the middle of the body, feet at about y = 1.05, facing right.

type P = [number, number]

interface Pose {
  neck: P
  hip: P
  /** Each arm: shoulder → elbow → hand (back arm first, drawn behind the body) */
  arms: [P, P, P][]
  /** Each leg: hip → knee → ankle, with the boot pointing along `toe` (back leg first) */
  legs: { points: [P, P, P]; toe: P }[]
  /** Gloves on the hands (goalkeeper) */
  gloves?: boolean
}

const STAND: Pose = {
  neck: [0, -0.5],
  hip: [0, 0.22],
  arms: [
    [[-0.04, -0.42], [-0.08, -0.05], [-0.05, 0.25]],
    [[0.04, -0.42], [0.08, -0.05], [0.1, 0.25]],
  ],
  legs: [
    { points: [[-0.05, 0.25], [-0.07, 0.62], [-0.08, 1]], toe: [0.16, 0] },
    { points: [[0.05, 0.25], [0.07, 0.62], [0.08, 1]], toe: [0.16, 0] },
  ],
}

export const FIGURE_POSES: Record<FigurePose, Pose> = {
  stand: STAND,
  run: {
    neck: [0.14, -0.5],
    hip: [0, 0.2],
    arms: [
      [[0.08, -0.42], [-0.16, -0.18], [-0.3, 0.06]],
      [[0.12, -0.42], [0.3, -0.2], [0.42, -0.42]],
    ],
    legs: [
      { points: [[-0.02, 0.24], [-0.18, 0.58], [-0.5, 0.78]], toe: [0.06, 0.15] },
      { points: [[0.02, 0.24], [0.34, 0.5], [0.24, 0.92]], toe: [0.16, 0.02] },
    ],
  },
  shoot: {
    neck: [-0.1, -0.5],
    hip: [0, 0.2],
    arms: [
      [[-0.08, -0.42], [-0.32, -0.32], [-0.55, -0.4]],
      [[-0.04, -0.42], [0.22, -0.26], [0.42, -0.1]],
    ],
    legs: [
      { points: [[-0.04, 0.24], [-0.06, 0.62], [-0.1, 1]], toe: [0.16, 0] },
      { points: [[0.04, 0.24], [0.32, 0.42], [0.62, 0.48]], toe: [0.12, -0.08] },
    ],
  },
  keeper: {
    neck: [0, -0.5],
    hip: [0, 0.2],
    arms: [
      [[-0.06, -0.42], [-0.36, -0.58], [-0.48, -0.88]],
      [[0.06, -0.42], [0.36, -0.58], [0.48, -0.88]],
    ],
    legs: [
      { points: [[-0.06, 0.24], [-0.24, 0.6], [-0.34, 1]], toe: [-0.14, 0] },
      { points: [[0.06, 0.24], [0.24, 0.6], [0.34, 1]], toe: [0.14, 0] },
    ],
    gloves: true,
  },
  demand: {
    ...STAND,
    arms: [
      [[-0.04, -0.42], [-0.08, -0.05], [-0.05, 0.25]],
      [[0.04, -0.44], [0.14, -0.8], [0.18, -1.12]],
    ],
  },
}

export const FIGURE_POSE_ORDER: FigurePose[] = ['stand', 'run', 'shoot', 'keeper', 'demand']

export const FIGURE_POSE_NAMES: Record<FigurePose, string> = {
  stand: 'stehend',
  run: 'laufend',
  shoot: 'schießend',
  keeper: 'Torwart',
  demand: 'Ball fordernd',
}

const SKIN = '#c98e64'
const HAIR = '#3f2a1d'
const SHORTS = '#1f2937'
const BOOT = '#111827'
const GLOVE = '#f1f5f9'
const SHADOW = 'rgba(0,0,0,0.28)'
const OUTLINE = 'rgba(0,0,0,0.35)'

const flat = (points: P[]) => points.flatMap(([x, y]) => [x, y])
const towards = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

/**
 * A player figure in the given pose; `mirrored` faces it to the left.
 * The shirt (and socks) take the color, the number stays readable when mirrored.
 */
export function PlayerFigureShape({
  color,
  pose,
  label,
  mirrored,
}: {
  color: string
  pose: FigurePose
  label: string
  mirrored: boolean
}) {
  const p = FIGURE_POSES[pose] ?? STAND
  const dark = shadeColor(color, -0.35)
  const sock = shadeColor(color, -0.15)
  const limb = { lineCap: 'round' as const, lineJoin: 'round' as const }
  const arm = ([shoulder, elbow, hand]: [P, P, P], key: number) => (
    <Group key={`arm-${key}`}>
      <Line points={flat([shoulder, elbow, hand])} stroke={SKIN} strokeWidth={0.11} {...limb} />
      {/* short sleeve */}
      <Line points={flat([shoulder, towards(shoulder, elbow, 0.55)])} stroke={key === 0 ? dark : color} strokeWidth={0.16} {...limb} />
      {p.gloves && <Circle x={hand[0]} y={hand[1]} radius={0.09} fill={GLOVE} stroke={OUTLINE} strokeWidth={0.02} />}
    </Group>
  )
  const leg = ({ points: [hip, knee, ankle], toe }: Pose['legs'][number], key: number) => (
    <Group key={`leg-${key}`}>
      <Line points={flat([hip, knee])} stroke={SKIN} strokeWidth={0.15} {...limb} />
      <Line points={flat([towards(knee, ankle, 0.15), ankle])} stroke={key === 0 ? dark : sock} strokeWidth={0.14} {...limb} />
      <Line points={flat([ankle, [ankle[0] + toe[0], ankle[1] + toe[1]]])} stroke={BOOT} strokeWidth={0.12} {...limb} />
    </Group>
  )
  const [backArm, frontArm] = p.arms
  const [backLeg, frontLeg] = p.legs
  const chest = towards(p.neck, p.hip, 0.4)
  // Mirroring flips the drawing, but the number must not be shown backwards.
  const numberX = mirrored ? -chest[0] : chest[0]
  const feetY = Math.max(...p.legs.map((l) => l.points[2][1])) + 0.06

  return (
    <Group>
      <Ellipse x={0.35} y={feetY} radiusX={0.7} radiusY={0.18} fill={SHADOW} rotation={-6} />
      <Group scaleX={mirrored ? -1 : 1}>
        {arm(backArm, 0)}
        {leg(backLeg, 0)}
        {/* shorts */}
        <Line points={flat([towards(p.neck, p.hip, 0.85), [p.hip[0], p.hip[1] + 0.1]])} stroke={SHORTS} strokeWidth={0.36} {...limb} />
        {leg(frontLeg, 1)}
        {/* shirt */}
        <Line points={flat([p.neck, towards(p.neck, p.hip, 0.88)])} stroke={OUTLINE} strokeWidth={0.46} {...limb} />
        <Line points={flat([p.neck, towards(p.neck, p.hip, 0.88)])} stroke={color} strokeWidth={0.42} {...limb} />
        <Line points={flat([[p.neck[0] + 0.1, p.neck[1] + 0.05], [p.hip[0] + 0.1, p.hip[1] - 0.12]])} stroke={dark} strokeWidth={0.1} opacity={0.5} {...limb} />
        {/* head with hair */}
        <Circle x={p.neck[0] + 0.03} y={p.neck[1] - 0.26} radius={0.2} fill={SKIN} stroke={OUTLINE} strokeWidth={0.03} />
        <Ellipse x={p.neck[0] - 0.02} y={p.neck[1] - 0.36} radiusX={0.19} radiusY={0.11} fill={HAIR} />
        {arm(frontArm, 1)}
      </Group>
      {label && (
        <MeterText
          text={label}
          x={numberX - 0.4}
          y={chest[1] - 0.2}
          width={0.8}
          height={0.4}
          align="center"
          verticalAlign="middle"
          fontSize={0.3}
          fontStyle="bold"
          fill={contrastTextColor(color)}
          wrap="none"
        />
      )}
    </Group>
  )
}

/** Faces left when the item looks to the left on screen (screen angle between 90° and 270°). */
export function figureMirrored(screenRotation: number): boolean {
  return Math.cos((screenRotation * Math.PI) / 180) < -1e-6
}
