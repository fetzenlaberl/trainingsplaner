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

/** Size of a goal drawn in perspective (meters) and how its net and frame are drawn. */
export interface GoalDims {
  /** Half the width between the posts */
  half: number
  height: number
  depth: number
  /** Ground line on screen (y), so the goal sits around the item's center */
  ground: number
  /** Distance between the net strings */
  mesh: number
  /** Thickness of posts and crossbar */
  frame: number
}

/** Full-size goal 7.32 × 2.44 m, 2 m deep */
export const BIG_GOAL: GoalDims = { half: 3.66, height: 2.44, depth: 2, ground: 1, mesh: 0.26, frame: 0.12 }
/** Mini goal 1.2 × 0.8 m, 0.8 m deep (as the mini goal seen from above) */
export const MINI_GOAL: GoalDims = { half: 0.6, height: 0.8, depth: 0.8, ground: 0.4, mesh: 0.1, frame: 0.05 }

/**
 * Goal seen slightly from above: from the front (net going back), from behind (looking
 * through the net at the frame) or from the side (opening to the left or right).
 */
export function GoalPerspectiveShape({ color, view, dims = BIG_GOAL }: { color: string; view: GoalView; dims?: GoalDims }) {
  if (view === 'left' || view === 'right') return <GoalSide color={color} mirrored={view === 'left'} dims={dims} />
  const { half, height, ground } = dims
  const barY = ground - height
  // The far rectangle lies further away: higher on screen and a little narrower.
  const rise = dims.depth * 0.42
  const farHalf = half * 0.93
  const farTop = barY - rise
  const farBottom = ground - rise
  const lines: number[][] = []
  const columns = Math.max(4, Math.round((2 * half) / dims.mesh / 2))
  const rows = Math.max(3, Math.round(height / dims.mesh / 1.2))
  // The back of the net: far away from the front, close from behind.
  const panel = view === 'front' ? { h: farHalf, top: farTop, bottom: farBottom } : { h: half, top: barY, bottom: ground }
  for (let i = 0; i <= columns; i++) {
    const x = -panel.h + (2 * panel.h * i) / columns
    lines.push([x, panel.top, x, panel.bottom])
  }
  for (let i = 0; i <= rows; i++) {
    const y = panel.top + ((panel.bottom - panel.top) * i) / rows
    lines.push([-panel.h, y, panel.h, y])
  }
  // Roof: strings between the near and the far top bars, and across
  for (let i = 0; i <= columns * 2; i++) {
    const t = i / (columns * 2)
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
    for (let i = 1; i < rows; i++) {
      const t = i / rows
      lines.push([s * half, barY + height * t, s * farHalf, farTop + (farBottom - farTop) * t])
    }
    lines.push([s * half, ground, s * farHalf, farBottom])
  }
  const mesh = MESH * Math.sqrt(dims.frame / BIG_GOAL.frame)
  const near = [-half, ground, -half, barY, half, barY, half, ground]
  const far = [-farHalf, farBottom, -farHalf, farTop, farHalf, farTop, farHalf, farBottom]
  const netLines = lines.map((p, i) => <Line key={i} points={p} stroke={NET} strokeWidth={mesh} />)
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
          <Line points={far} stroke={shadeColor(color, -0.25)} strokeWidth={dims.frame * 0.4} lineJoin="round" />
          {frame(near, dims.frame)}
        </>
      ) : (
        <>
          {/* From behind the goal frame is the far rectangle; the net hangs in front of it. */}
          {frame(far, dims.frame * 0.85)}
          {netLines}
          <Line points={near} stroke={shadeColor(color, -0.25)} strokeWidth={dims.frame * 0.4} lineJoin="round" />
        </>
      )}
    </Group>
  )
}

/** The goal from its side: post and crossbar in front, the net box going back; the far side shows a little higher. */
function GoalSide({ color, mirrored, dims }: { color: string; mirrored: boolean; dims: GoalDims }) {
  const { height, depth, ground } = dims
  const barY = ground - height
  // Opening on the right (posts at x = +depth / 2), the net at the back on the left.
  const front = depth / 2
  const back = -depth / 2
  // The far side of the goal lies a goal width away: higher on screen and slightly shifted.
  const rise = Math.min(0.7, dims.half * 0.35)
  const shift = rise * 0.2
  const columns = Math.max(3, Math.round(depth / dims.mesh / 1.0))
  const rows = Math.max(3, Math.round(height / dims.mesh / 1.2))
  const far: number[][] = []
  const near: number[][] = []
  const sidePanel = (target: number[][], dx: number, dy: number) => {
    for (let i = 1; i < columns; i++) {
      const x = back + ((front - back) * i) / columns
      target.push([x + dx, barY + dy, x + dx, ground + dy])
    }
    for (let i = 1; i < rows; i++) {
      const y = barY + (height * i) / rows
      target.push([back + dx, y + dy, front + dx, y + dy])
    }
  }
  sidePanel(far, shift, -rise)
  // Roof and back of the net between the near and the far side
  for (let i = 0; i <= columns; i++) {
    const x = back + ((front - back) * i) / columns
    far.push([x, barY, x + shift, barY - rise])
  }
  for (let i = 1; i < rows; i++) {
    const y = barY + (height * i) / rows
    far.push([back, y, back + shift, y - rise])
  }
  sidePanel(near, 0, 0)
  const mesh = MESH * Math.sqrt(dims.frame / BIG_GOAL.frame)
  const outline = (dx: number, dy: number) => [front + dx, barY + dy, back + dx, barY + dy, back + dx, ground + dy]
  const dark = shadeColor(color, -0.25)
  const f = dims.frame
  return (
    <Group scaleX={mirrored ? -1 : 1}>
      <Line points={[front, ground, back, ground, back + shift, ground - rise, front + shift, ground - rise]} closed fill="rgba(0,0,0,0.12)" />
      <Rect x={back} y={barY - rise} width={depth + shift} height={height + rise} fill="rgba(0,0,0,0)" />
      {/* far side: its post, net frame and net, then the roof */}
      <Line points={[front + shift, ground - rise, front + shift, barY - rise]} stroke={dark} strokeWidth={f * 0.75} lineCap="round" />
      <Line points={outline(shift, -rise)} stroke={dark} strokeWidth={f * 0.35} lineJoin="round" />
      {far.map((p, i) => (
        <Line key={`f${i}`} points={p} stroke={NET} strokeWidth={mesh} />
      ))}
      {/* crossbar going away from the viewer and the ground bar at the back */}
      <Line points={[front, barY, front + shift, barY - rise]} stroke={color} strokeWidth={f * 0.85} lineCap="round" />
      <Line points={[back, ground, back + shift, ground - rise]} stroke={dark} strokeWidth={f * 0.35} />
      {near.map((p, i) => (
        <Line key={`n${i}`} points={p} stroke={NET} strokeWidth={mesh} />
      ))}
      {/* near side: net frame going back, post in front */}
      <Line points={outline(0, 0)} stroke={dark} strokeWidth={f * 0.4} lineJoin="round" />
      <Line points={[front, ground, front, barY]} stroke="rgba(0,0,0,0.35)" strokeWidth={f * 1.35} lineCap="round" />
      <Line points={[front, ground, front, barY]} stroke={color} strokeWidth={f} lineCap="round" />
    </Group>
  )
}
