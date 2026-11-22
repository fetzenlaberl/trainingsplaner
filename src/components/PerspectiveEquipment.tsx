import { Ellipse, Group, Line, Rect } from 'react-konva'
import { shadeColor } from '../items/colors'
import type { GoalView, PoleLean } from '../model/types'

// Equipment seen slightly from above (own drawings), like the perspective dummies: they
// stand upright on screen, the ground is at about y = 1.05 and the caller turns them back
// against the view rotation.

const SHADOW = 'rgba(0,0,0,0.28)'
const GROUND = 1.05

/** Thin white pole with a weighted foot and a waving flag at the top. */
export function FlagPoleShape({ color }: { color: string }) {
  const top = -1.45
  const half = 0.035
  return (
    <Group>
      <Ellipse x={0.4} y={GROUND + 0.04} radiusX={0.6} radiusY={0.13} fill={SHADOW} rotation={-8} />
      <Ellipse y={GROUND} radiusX={0.2} radiusY={0.07} fill="#374151" />
      <Rect
        x={-half}
        y={top}
        width={half * 2}
        height={GROUND - top}
        fillLinearGradientStartPoint={{ x: -half, y: 0 }}
        fillLinearGradientEndPoint={{ x: half, y: 0 }}
        fillLinearGradientColorStops={[0, '#ffffff', 1, '#a8a29e']}
      />
      <Line
        points={[half, top + 0.02, 0.32, top - 0.05, 0.62, top + 0.04, 0.66, top + 0.44, 0.36, top + 0.36, half, top + 0.44]}
        closed
        tension={0.3}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0.66, y: 0 }}
        fillLinearGradientColorStops={[0, shadeColor(color, -0.25), 0.5, color, 1, shadeColor(color, 0.25)]}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth={0.02}
      />
      <Ellipse y={top} radiusX={half * 1.4} radiusY={0.02} fill="#e7e5e4" />
    </Group>
  )
}

/** How far the top of a leaning pole moves (meters) and how thick it looks there. */
const LEAN: Record<PoleLean, { dx: number; dy: number; topHalf: number; shadow: [number, number] }> = {
  // Leaning sideways: tilted by about 14°.
  left: { dx: -0.5, dy: -2.05, topHalf: 0.045, shadow: [-0.9, 0.02] },
  right: { dx: 0.5, dy: -2.05, topHalf: 0.045, shadow: [0.9, 0.02] },
  // Towards the viewer / away: clearly shorter on screen; the near top looks thicker, the far
  // one thinner, and the shadow falls in front of or behind the disc.
  front: { dx: 0.06, dy: -1.45, topHalf: 0.08, shadow: [0.15, 0.5] },
  back: { dx: 0.06, dy: -1.6, topHalf: 0.022, shadow: [0.15, -0.45] },
}

/** Pole put slightly slanted into a marker disc, leaning left, right, towards or away from the viewer. */
export function DiscPoleShape({ color, lean }: { color: string; lean: PoleLean }) {
  const l = LEAN[lean]
  const base = { x: 0, y: GROUND - 0.06 }
  const top = { x: base.x + l.dx, y: base.y + l.dy }
  const len = Math.hypot(l.dx, l.dy)
  // Unit vector across the pole
  const nx = -l.dy / len
  const ny = l.dx / len
  const baseHalf = 0.045
  const at = (t: number, half: number): number[] => {
    const x = base.x + l.dx * t
    const y = base.y + l.dy * t
    return [x + nx * half, y + ny * half, x - nx * half, y - ny * half]
  }
  const halfAt = (t: number) => baseHalf + (l.topHalf - baseHalf) * t
  const quad = (t1: number, t2: number) => {
    const [ax, ay, bx, by] = at(t1, halfAt(t1))
    const [cx, cy, dx, dy] = at(t2, halfAt(t2))
    return [ax, ay, cx, cy, dx, dy, bx, by]
  }
  // Soft shadow stretched in the direction of the lean
  const shadow = (
    <Ellipse
      x={base.x + l.shadow[0] / 2}
      y={GROUND + l.shadow[1] / 2}
      radiusX={Math.abs(l.shadow[0]) / 2 + 0.08}
      radiusY={Math.abs(l.shadow[1]) / 2 + 0.05}
      fill={SHADOW}
    />
  )
  const disc = (
    <Group>
      <Ellipse y={GROUND} radiusX={0.36} radiusY={0.12} fill={shadeColor(color, -0.35)} />
      <Ellipse y={GROUND - 0.03} radiusX={0.34} radiusY={0.11} fill={color} stroke="rgba(0,0,0,0.3)" strokeWidth={0.015} />
      <Ellipse y={GROUND - 0.04} radiusX={0.1} radiusY={0.035} fill="rgba(0,0,0,0.35)" />
    </Group>
  )
  return (
    <Group>
      {lean === 'back' && shadow}
      {disc}
      {lean !== 'back' && shadow}
      <Line
        points={quad(0, 1)}
        closed
        // Light from the left, across the pole whichever way it leans
        fillLinearGradientStartPoint={{ x: base.x - nx * 0.06, y: base.y - ny * 0.06 }}
        fillLinearGradientEndPoint={{ x: base.x + nx * 0.06, y: base.y + ny * 0.06 }}
        fillLinearGradientColorStops={[0, shadeColor(color, -0.4), 0.5, color, 1, shadeColor(color, 0.35)]}
        stroke="rgba(0,0,0,0.3)"
        strokeWidth={0.012}
      />
      {/* reflective bands */}
      {[0.45, 0.75].map((t) => (
        <Line key={t} points={quad(t, t + 0.06)} closed fill="rgba(255,255,255,0.85)" />
      ))}
      <Ellipse x={top.x} y={top.y} radiusX={l.topHalf} radiusY={l.topHalf * 0.45} fill={shadeColor(color, 0.4)} />
    </Group>
  )
}

const NET = 'rgba(255,255,255,0.5)'
const MESH = 0.018

/**
 * Full-size goal (7.32 × 2.44 m, 2 m deep) seen slightly from above: from the front (net going
 * back), from behind (looking through the net at the frame) or from the side (opening to the
 * left or right).
 */
export function GoalPerspectiveShape({ color, view }: { color: string; view: GoalView }) {
  if (view === 'left' || view === 'right') return <GoalSide color={color} mirrored={view === 'left'} />
  const half = 3.66
  const height = 2.44
  const ground = 1
  const barY = ground - height
  // The far rectangle lies further away: higher on screen and a little narrower.
  const rise = 0.85
  const farHalf = half * 0.93
  const farTop = barY - rise
  const farBottom = ground - rise
  const lines: number[][] = []
  // The back of the net: far away from the front, close from behind.
  const panel = view === 'front' ? { h: farHalf, top: farTop, bottom: farBottom } : { h: half, top: barY, bottom: ground }
  for (let x = -panel.h; x <= panel.h + 1e-6; x += panel.h / 14) lines.push([x, panel.top, x, panel.bottom])
  for (let y = panel.top; y <= panel.bottom + 1e-6; y += (panel.bottom - panel.top) / 8) lines.push([-panel.h, y, panel.h, y])
  // Roof: strings between the near and the far top bars, and across
  for (let i = 0; i <= 28; i++) {
    const t = i / 28
    lines.push([-half + 2 * half * t, barY, -farHalf + 2 * farHalf * t, farTop])
  }
  for (let i = 1; i < 4; i++) {
    const t = i / 4
    const y = barY + (farTop - barY) * t
    const x = half + (farHalf - half) * t
    lines.push([-x, y, x, y])
  }
  // Side panels between the near and the far corners
  for (const s of [-1, 1]) {
    for (let i = 1; i < 8; i++) {
      const t = i / 8
      lines.push([s * half, barY + height * t, s * farHalf, farTop + (farBottom - farTop) * t])
    }
    lines.push([s * half, ground, s * farHalf, farBottom])
  }
  const near = [-half, ground, -half, barY, half, barY, half, ground]
  const far = [-farHalf, farBottom, -farHalf, farTop, farHalf, farTop, farHalf, farBottom]
  const netLines = lines.map((p, i) => <Line key={i} points={p} stroke={NET} strokeWidth={MESH} />)
  const frame = (points: number[], width: number) => (
    <>
      <Line points={points} stroke="rgba(0,0,0,0.35)" strokeWidth={width * 1.35} lineJoin="round" lineCap="round" />
      <Line points={points} stroke={color} strokeWidth={width} lineJoin="round" lineCap="round" />
    </>
  )
  return (
    <Group>
      {/* ground shadow and an invisible area so taps on the net hit the goal */}
      <Line points={[-half, ground, half, ground, farHalf, farBottom, -farHalf, farBottom]} closed fill="rgba(0,0,0,0.1)" />
      <Rect x={-half} y={farTop} width={half * 2} height={ground - farTop} fill="rgba(0,0,0,0)" />
      {view === 'front' ? (
        <>
          {netLines}
          <Line points={far} stroke={shadeColor(color, -0.25)} strokeWidth={0.05} lineJoin="round" />
          {frame(near, 0.12)}
        </>
      ) : (
        <>
          {/* From behind the goal frame is the far rectangle; the net hangs in front of it. */}
          {frame(far, 0.1)}
          {netLines}
          <Line points={near} stroke={shadeColor(color, -0.25)} strokeWidth={0.05} lineJoin="round" />
        </>
      )}
    </Group>
  )
}

/** The goal from its side: post and crossbar in front, the net box going back; the far side shows a little higher. */
function GoalSide({ color, mirrored }: { color: string; mirrored: boolean }) {
  const height = 2.44
  const depth = 2
  const ground = 1
  const barY = ground - height
  // Opening on the right (posts at x = +depth / 2), the net at the back on the left.
  const front = depth / 2
  const back = -depth / 2
  // The far side of the goal lies 7.32 m away: higher on screen and slightly shifted.
  const rise = 0.7
  const shift = 0.15
  const far: number[][] = []
  const near: number[][] = []
  const sidePanel = (target: number[][], dx: number, dy: number) => {
    for (let i = 1; i < 8; i++) {
      const x = back + ((front - back) * i) / 8
      target.push([x + dx, barY + dy, x + dx, ground + dy])
    }
    for (let i = 1; i < 8; i++) {
      const y = barY + (height * i) / 8
      target.push([back + dx, y + dy, front + dx, y + dy])
    }
  }
  sidePanel(far, shift, -rise)
  // Roof and back of the net between the near and the far side
  for (let i = 0; i <= 6; i++) {
    const x = back + ((front - back) * i) / 6
    far.push([x, barY, x + shift, barY - rise])
  }
  for (let i = 1; i < 10; i++) {
    const y = barY + (height * i) / 10
    far.push([back, y, back + shift, y - rise])
  }
  sidePanel(near, 0, 0)
  const outline = (dx: number, dy: number) => [front + dx, barY + dy, back + dx, barY + dy, back + dx, ground + dy]
  const dark = shadeColor(color, -0.25)
  return (
    <Group scaleX={mirrored ? -1 : 1}>
      <Line points={[front, ground, back, ground, back + shift, ground - rise, front + shift, ground - rise]} closed fill="rgba(0,0,0,0.12)" />
      <Rect x={back} y={barY - rise} width={depth + shift} height={height + rise} fill="rgba(0,0,0,0)" />
      {/* far side: its post, net frame and net, then the roof */}
      <Line points={[front + shift, ground - rise, front + shift, barY - rise]} stroke={dark} strokeWidth={0.09} lineCap="round" />
      <Line points={outline(shift, -rise)} stroke={dark} strokeWidth={0.04} lineJoin="round" />
      {far.map((p, i) => (
        <Line key={`f${i}`} points={p} stroke={NET} strokeWidth={MESH} />
      ))}
      {/* crossbar going away from the viewer and the ground bar at the back */}
      <Line points={[front, barY, front + shift, barY - rise]} stroke={color} strokeWidth={0.1} lineCap="round" />
      <Line points={[back, ground, back + shift, ground - rise]} stroke={dark} strokeWidth={0.04} />
      {near.map((p, i) => (
        <Line key={`n${i}`} points={p} stroke={NET} strokeWidth={MESH} />
      ))}
      {/* near side: net frame going back, post in front */}
      <Line points={outline(0, 0)} stroke={dark} strokeWidth={0.05} lineJoin="round" />
      <Line points={[front, ground, front, barY]} stroke="rgba(0,0,0,0.35)" strokeWidth={0.16} lineCap="round" />
      <Line points={[front, ground, front, barY]} stroke={color} strokeWidth={0.12} lineCap="round" />
    </Group>
  )
}
