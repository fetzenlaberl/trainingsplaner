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
  // Drawn separately (FrontFigure); this side pose is only a fallback.
  front: STAND,
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
  // Strong forward lean, long stride, arms swinging high.
  sprint: {
    neck: [0.32, -0.42],
    hip: [0.02, 0.2],
    arms: [
      [[0.26, -0.36], [0.02, -0.16], [-0.14, 0.08]],
      [[0.3, -0.36], [0.52, -0.2], [0.64, -0.46]],
    ],
    legs: [
      { points: [[0, 0.24], [-0.26, 0.56], [-0.62, 0.66]], toe: [0.04, 0.16] },
      { points: [[0.04, 0.24], [0.44, 0.36], [0.4, 0.78]], toe: [0.16, 0.04] },
    ],
  },
  // Pass with the inside of the foot: standing leg next to the ball, foot turned out.
  pass: {
    neck: [0.02, -0.5],
    hip: [0, 0.2],
    arms: [
      [[-0.04, -0.42], [-0.26, -0.2], [-0.44, -0.04]],
      [[0.04, -0.42], [0.24, -0.22], [0.4, -0.08]],
    ],
    legs: [
      { points: [[-0.04, 0.24], [-0.04, 0.62], [-0.06, 1]], toe: [0.16, 0] },
      { points: [[0.04, 0.24], [0.22, 0.6], [0.34, 0.92]], toe: [0.05, 0.07] },
    ],
  },
  // Shot: upper body leaning back, kicking leg swinging through high, arms wide.
  shoot: {
    neck: [-0.14, -0.48],
    hip: [0, 0.2],
    arms: [
      [[-0.1, -0.4], [-0.38, -0.36], [-0.62, -0.52]],
      [[-0.06, -0.4], [0.18, -0.18], [0.42, -0.26]],
    ],
    legs: [
      { points: [[-0.04, 0.24], [-0.08, 0.62], [-0.12, 1]], toe: [0.16, 0] },
      { points: [[0.04, 0.24], [0.38, 0.3], [0.7, 0.16]], toe: [0.12, -0.1] },
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

export const FIGURE_POSE_ORDER: FigurePose[] = ['stand', 'front', 'run', 'sprint', 'pass', 'shoot', 'keeper', 'demand']

export const FIGURE_POSE_NAMES: Record<FigurePose, string> = {
  stand: 'stehend',
  front: 'von vorne',
  run: 'laufend',
  sprint: 'sprintend',
  pass: 'passend',
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
  if (pose === 'front') return <FrontFigure color={color} label={label} />
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

/** Standing player seen from the front: both arms and legs, number on the chest. */
function FrontFigure({ color, label }: { color: string; label: string }) {
  const dark = shadeColor(color, -0.35)
  const sock = shadeColor(color, -0.15)
  const limb = { lineCap: 'round' as const, lineJoin: 'round' as const }
  const side = (s: 1 | -1) => (
    <Group key={s}>
      {/* arm with short sleeve */}
      <Line points={[s * 0.27, -0.4, s * 0.36, -0.08, s * 0.36, 0.24]} stroke={SKIN} strokeWidth={0.11} {...limb} />
      <Line points={[s * 0.25, -0.42, s * 0.32, -0.22]} stroke={color} strokeWidth={0.17} {...limb} />
      {/* leg: thigh, sock, boot pointing slightly outwards */}
      <Line points={[s * 0.12, 0.32, s * 0.13, 0.66]} stroke={SKIN} strokeWidth={0.15} {...limb} />
      <Line points={[s * 0.13, 0.68, s * 0.14, 0.98]} stroke={sock} strokeWidth={0.14} {...limb} />
      <Ellipse x={s * 0.17} y={1.02} radiusX={0.1} radiusY={0.06} fill={BOOT} />
    </Group>
  )
  return (
    <Group>
      <Ellipse x={0.12} y={1.07} radiusX={0.55} radiusY={0.14} fill={SHADOW} />
      {side(-1)}
      {side(1)}
      {/* shorts */}
      <Line points={[-0.24, 0.12, 0.24, 0.12, 0.26, 0.36, 0.02, 0.36, 0, 0.3, -0.02, 0.36, -0.26, 0.36]} closed fill={SHORTS} stroke={OUTLINE} strokeWidth={0.02} />
      {/* shirt */}
      <Line points={[-0.26, -0.46, 0.26, -0.46, 0.25, 0.16, -0.25, 0.16]} closed tension={0.08} fill={color} stroke={OUTLINE} strokeWidth={0.03} />
      <Line points={[0.16, -0.42, 0.18, 0.12]} stroke={dark} strokeWidth={0.08} opacity={0.35} {...limb} />
      <Line points={[-0.08, -0.46, 0, -0.38, 0.08, -0.46]} stroke={dark} strokeWidth={0.04} {...limb} />
      {/* neck and head with hair */}
      <Line points={[0, -0.5, 0, -0.56]} stroke={SKIN} strokeWidth={0.1} {...limb} />
      <Circle y={-0.76} radius={0.2} fill={SKIN} stroke={OUTLINE} strokeWidth={0.03} />
      <Ellipse y={-0.88} radiusX={0.2} radiusY={0.1} fill={HAIR} />
      {label && (
        <MeterText
          text={label}
          x={-0.4}
          y={-0.36}
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
