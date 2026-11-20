import { Circle, Ellipse, Group, Line, Rect } from 'react-konva'
import { shadeColor } from '../items/colors'

// Training dummies seen slightly from above (own drawings). They always stand upright
// on screen; the caller turns them back against the view rotation.

const SHADOW = 'rgba(0,0,0,0.28)'

/** Side lighting: light on the left, dark on the right. */
function sideGradient(color: string, x1: number, x2: number) {
  return {
    fillLinearGradientStartPoint: { x: x1, y: 0 },
    fillLinearGradientEndPoint: { x: x2, y: 0 },
    fillLinearGradientColorStops: [0, shadeColor(color, 0.35), 0.45, color, 1, shadeColor(color, -0.45)],
  }
}

/** Pole dummy: weighted foot, pole with reflective bands, shadow on the ground. */
export function PoleDummyShape({ color }: { color: string }) {
  const half = 0.13
  const top = -1.35
  const bottom = 1.05
  return (
    <Group>
      <Ellipse x={0.45} y={bottom + 0.05} radiusX={0.75} radiusY={0.2} fill={SHADOW} rotation={-8} />
      <Ellipse y={bottom} radiusX={0.5} radiusY={0.18} fill="#1f2937" />
      <Ellipse y={bottom - 0.08} radiusX={0.42} radiusY={0.14} fill="#374151" />
      <Rect x={-half} y={top} width={half * 2} height={bottom - top} {...sideGradient(color, -half, half)} />
      {[-0.95, -0.35].map((y) => (
        <Rect key={y} x={-half} y={y} width={half * 2} height={0.16} fill="rgba(255,255,255,0.85)" />
      ))}
      <Ellipse y={top} radiusX={half} radiusY={0.05} fill={shadeColor(color, 0.4)} />
    </Group>
  )
}

/** Figure dummy (mannequin): head, shoulders and body on a foot, with shadow. */
export function FigureDummyShape({ color }: { color: string }) {
  const bottom = 1.1
  const body = [-0.42, -0.55, 0.42, -0.55, 0.3, 0.75, 0.12, 0.75, 0.12, bottom - 0.05, -0.12, bottom - 0.05, -0.12, 0.75, -0.3, 0.75]
  return (
    <Group>
      <Ellipse x={0.5} y={bottom + 0.05} radiusX={0.85} radiusY={0.22} fill={SHADOW} rotation={-8} />
      <Ellipse y={bottom} radiusX={0.5} radiusY={0.17} fill="#1f2937" />
      <Line points={body} closed tension={0.15} {...sideGradient(color, -0.42, 0.42)} stroke="rgba(0,0,0,0.35)" strokeWidth={0.03} />
      <Circle y={-0.85} radius={0.24} {...sideGradient(color, -0.24, 0.24)} stroke="rgba(0,0,0,0.35)" strokeWidth={0.03} />
    </Group>
  )
}
