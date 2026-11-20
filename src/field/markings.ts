import { PITCH } from './dimensions'

export type Marking =
  | { kind: 'rect'; x: number; y: number; width: number; height: number }
  | { kind: 'line'; points: number[]; corner?: boolean }
  | { kind: 'circle'; x: number; y: number; radius: number }
  | { kind: 'spot'; x: number; y: number }

export interface Goal {
  x: number
  y: number
  width: number
  height: number
}

/** Samples a circular arc as a flat point list [x1, y1, x2, y2, ...]. Angles in degrees. */
export function arcPoints(
  cx: number,
  cy: number,
  radius: number,
  startDeg: number,
  endDeg: number,
  segments = 32,
): number[] {
  const points: number[] = []
  for (let i = 0; i <= segments; i++) {
    const angle = ((startDeg + ((endDeg - startDeg) * i) / segments) * Math.PI) / 180
    points.push(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle))
  }
  return points
}

/** All white line markings of a full pitch, in meters. */
export function getPitchMarkings(): Marking[] {
  const {
    length,
    width,
    centerCircleRadius,
    penaltyAreaDepth,
    penaltyAreaWidth,
    goalAreaDepth,
    goalAreaWidth,
    penaltySpotDistance,
    penaltyArcRadius,
    cornerArcRadius,
  } = PITCH
  const midX = length / 2
  const midY = width / 2

  // Half angle of the penalty arc part that lies outside the penalty area.
  const arcHalfAngle =
    (Math.acos((penaltyAreaDepth - penaltySpotDistance) / penaltyArcRadius) * 180) / Math.PI

  const markings: Marking[] = [
    { kind: 'rect', x: 0, y: 0, width: length, height: width },
    { kind: 'line', points: [midX, 0, midX, width] },
    { kind: 'circle', x: midX, y: midY, radius: centerCircleRadius },
    { kind: 'spot', x: midX, y: midY },
  ]

  for (const side of ['left', 'right'] as const) {
    const goalLineX = side === 'left' ? 0 : length
    const dir = side === 'left' ? 1 : -1
    const penaltyX = side === 'left' ? 0 : length - penaltyAreaDepth
    const goalAreaX = side === 'left' ? 0 : length - goalAreaDepth
    const spotX = goalLineX + dir * penaltySpotDistance
    const arcCenter = side === 'left' ? 0 : 180

    markings.push(
      {
        kind: 'rect',
        x: penaltyX,
        y: midY - penaltyAreaWidth / 2,
        width: penaltyAreaDepth,
        height: penaltyAreaWidth,
      },
      {
        kind: 'rect',
        x: goalAreaX,
        y: midY - goalAreaWidth / 2,
        width: goalAreaDepth,
        height: goalAreaWidth,
      },
      { kind: 'spot', x: spotX, y: midY },
      {
        kind: 'line',
        points: arcPoints(
          spotX,
          midY,
          penaltyArcRadius,
          arcCenter - arcHalfAngle,
          arcCenter + arcHalfAngle,
        ),
      },
    )
  }

  // Corner arcs: [corner x, corner y, start angle]
  const corners: [number, number, number][] = [
    [0, 0, 0],
    [length, 0, 90],
    [length, width, 180],
    [0, width, 270],
  ]
  for (const [cx, cy, start] of corners) {
    markings.push({
      kind: 'line',
      points: arcPoints(cx, cy, cornerArcRadius, start, start + 90, 12),
      corner: true,
    })
  }

  return markings
}

/** Both goals, placed behind the goal lines. */
export function getGoals(): Goal[] {
  const { length, width, goalWidth, goalDepth } = PITCH
  const y = width / 2 - goalWidth / 2
  return [
    { x: -goalDepth, y, width: goalDepth, height: goalWidth },
    { x: length, y, width: goalDepth, height: goalWidth },
  ]
}
