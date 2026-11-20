import { PITCH, SMALL_FIELDS, type FieldType, type Rect } from './dimensions'

export type Marking =
  /** outer = touch and goal lines (may get rounded corners) */
  | { kind: 'rect'; x: number; y: number; width: number; height: number; outer?: boolean }
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
    { kind: 'rect', x: 0, y: 0, width: length, height: width, outer: true },
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

/** Futsal (and indoor) lines: goal 3 m, penalty area of two quarter circles (6 m) and a straight piece. */
export const FUTSAL = {
  goalWidth: 3,
  goalDepth: 1,
  penaltyAreaRadius: 6,
  penaltySpot: 6,
  secondPenaltySpot: 10,
  centerCircleRadius: 3,
  cornerArcRadius: 0.25,
} as const

/** Goals of the corridor and the quarter field (youth goals, 5 m wide) */
export const SMALL_GOAL = { width: 5, depth: 1.5 } as const

/** Boards of the indoor field: distance behind the goal lines and along the touchlines, and thickness. */
export const BOARDS = { behindGoal: 1.5, alongSide: 0.3, thickness: 0.4, cornerRadius: 2 } as const

function futsalMarkings(length: number, width: number, secondSpot: boolean): Marking[] {
  const midX = length / 2
  const midY = width / 2
  const { penaltyAreaRadius: r, goalWidth } = FUTSAL
  const markings: Marking[] = [
    { kind: 'rect', x: 0, y: 0, width: length, height: width, outer: true },
    { kind: 'line', points: [midX, 0, midX, width] },
    { kind: 'circle', x: midX, y: midY, radius: FUTSAL.centerCircleRadius },
    { kind: 'spot', x: midX, y: midY },
  ]
  for (const side of ['left', 'right'] as const) {
    const goalX = side === 'left' ? 0 : length
    const dir = side === 'left' ? 1 : -1
    const topPost = midY - goalWidth / 2
    const bottomPost = midY + goalWidth / 2
    // Quarter circle around each post, joined by a straight line 6 m in front of the goal.
    const top = side === 'left' ? arcPoints(goalX, topPost, r, 270, 360, 16) : arcPoints(goalX, topPost, r, 270, 180, 16)
    const bottom = side === 'left' ? arcPoints(goalX, bottomPost, r, 0, 90, 16) : arcPoints(goalX, bottomPost, r, 180, 90, 16)
    markings.push(
      { kind: 'line', points: [...top, ...bottom] },
      { kind: 'spot', x: goalX + dir * FUTSAL.penaltySpot, y: midY },
    )
    if (secondSpot) markings.push({ kind: 'spot', x: goalX + dir * FUTSAL.secondPenaltySpot, y: midY })
  }
  const corners: [number, number, number][] = [
    [0, 0, 0],
    [length, 0, 90],
    [length, width, 180],
    [0, width, 270],
  ]
  for (const [cx, cy, start] of corners) {
    markings.push({ kind: 'line', points: arcPoints(cx, cy, FUTSAL.cornerArcRadius, start, start + 90, 8), corner: true })
  }
  return markings
}

/** Line markings of a field type, in meters (an empty area has none). */
export function getFieldMarkings(type: FieldType): Marking[] {
  switch (type) {
    case 'empty':
      return []
    case 'futsal':
      return futsalMarkings(SMALL_FIELDS.futsal.length, SMALL_FIELDS.futsal.width, true)
    case 'hall':
      return futsalMarkings(SMALL_FIELDS.hall.length, SMALL_FIELDS.hall.width, false)
    case 'corridor': {
      const { length, width } = SMALL_FIELDS.corridor
      return [
        { kind: 'rect', x: 0, y: 0, width: length, height: width, outer: true },
        { kind: 'line', points: [length / 2, 0, length / 2, width] },
        { kind: 'spot', x: length / 2, y: width / 2 },
      ]
    }
    case 'quarter': {
      const { length, width } = SMALL_FIELDS.quarter
      return [
        { kind: 'rect', x: 0, y: 0, width: length, height: width, outer: true },
        { kind: 'spot', x: length / 2, y: width / 2 },
      ]
    }
    default:
      return getPitchMarkings()
  }
}

/** Goals of a field type, placed behind the lines. */
export function getFieldGoals(type: FieldType): Goal[] {
  switch (type) {
    case 'empty':
      return []
    case 'futsal':
    case 'hall': {
      const { length, width } = SMALL_FIELDS[type]
      const y = width / 2 - FUTSAL.goalWidth / 2
      return [
        { x: -FUTSAL.goalDepth, y, width: FUTSAL.goalDepth, height: FUTSAL.goalWidth },
        { x: length, y, width: FUTSAL.goalDepth, height: FUTSAL.goalWidth },
      ]
    }
    case 'corridor':
    case 'quarter': {
      const { length, width } = SMALL_FIELDS[type]
      const { width: goal, depth } = SMALL_GOAL
      const goals: Goal[] = [
        { x: -depth, y: width / 2 - goal / 2, width: depth, height: goal },
        { x: length, y: width / 2 - goal / 2, width: depth, height: goal },
      ]
      // The quarter field has a goal on every side.
      if (type === 'quarter') {
        goals.push(
          { x: length / 2 - goal / 2, y: -depth, width: goal, height: depth },
          { x: length / 2 - goal / 2, y: width, width: goal, height: depth },
        )
      }
      return goals
    }
    default:
      return getGoals()
  }
}

/** Boards around the indoor field (middle of the board band), or null. */
export function getFieldBoards(type: FieldType): Rect | null {
  if (type !== 'hall') return null
  const { length, width } = SMALL_FIELDS.hall
  const dx = BOARDS.behindGoal + BOARDS.thickness / 2
  const dy = BOARDS.alongSide + BOARDS.thickness / 2
  return { x: -dx, y: -dy, width: length + 2 * dx, height: width + 2 * dy }
}
