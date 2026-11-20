// All values in meters (FIFA Laws of the Game, standard international pitch).
// Coordinate system: x runs along the length (goal line to goal line),
// y runs along the width (touchline to touchline), origin at the top-left corner.

export const PITCH = {
  length: 105,
  width: 68,
  lineWidth: 0.12,
  centerCircleRadius: 9.15,
  spotRadius: 0.2,
  penaltyAreaDepth: 16.5,
  penaltyAreaWidth: 40.32,
  goalAreaDepth: 5.5,
  goalAreaWidth: 18.32,
  penaltySpotDistance: 11,
  penaltyArcRadius: 9.15,
  cornerArcRadius: 1,
  goalWidth: 7.32,
  goalDepth: 2,
} as const

/** Grass margin around the pitch so goals and corners are not cut off. */
export const RUNOFF = 4

export type FieldType =
  | 'full'
  | 'half'
  | 'penalty'
  | 'cornerLeft'
  | 'cornerRight'
  | 'futsal'
  | 'hall'
  | 'corridor'
  | 'quarter'
  | 'empty'

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  full: 'Ganzfeld',
  half: 'Halbfeld',
  penalty: 'Strafraum',
  cornerLeft: 'Ecke links',
  cornerRight: 'Ecke rechts',
  futsal: 'Futsal',
  hall: 'Halle mit Bande',
  corridor: 'Korridor',
  quarter: 'Viertelfeld',
  empty: 'Leere Fläche',
}

export const FIELD_TYPES: FieldType[] = [
  'full',
  'half',
  'penalty',
  'cornerLeft',
  'cornerRight',
  'futsal',
  'hall',
  'corridor',
  'quarter',
  'empty',
]

/** Smaller fields of their own (not a part of the big pitch): playing area in meters. */
export const SMALL_FIELDS = {
  futsal: { length: 40, width: 20 },
  hall: { length: 40, width: 20 },
  corridor: { length: 50, width: 25 },
  quarter: { length: 52, width: 34 },
} as const

/** Room around a small field for goals, boards and labels (meters). */
export const SMALL_FIELD_RUNOFF = 3

/** Playing area (length along x, width along y) the lines and grids of a field type refer to. */
export function fieldSize(type: FieldType): { length: number; width: number } {
  return type in SMALL_FIELDS ? SMALL_FIELDS[type as keyof typeof SMALL_FIELDS] : { length: PITCH.length, width: PITCH.width }
}

/** Corner sections: depth from the goal line, and how far they reach past the far side of the penalty area. */
export const CORNER_VIEW_DEPTH = 30
export const CORNER_VIEW_BEYOND_BOX = 6

/** Visible area (in meters) for each field type. */
export function getViewport(type: FieldType): Rect {
  const { length, width } = PITCH
  switch (type) {
    case 'futsal':
    case 'hall':
    case 'corridor':
    case 'quarter': {
      const size = SMALL_FIELDS[type]
      return {
        x: -SMALL_FIELD_RUNOFF,
        y: -SMALL_FIELD_RUNOFF,
        width: size.length + 2 * SMALL_FIELD_RUNOFF,
        height: size.width + 2 * SMALL_FIELD_RUNOFF,
      }
    }
    case 'full':
    case 'empty':
      return {
        x: -RUNOFF,
        y: -RUNOFF,
        width: length + 2 * RUNOFF,
        height: width + 2 * RUNOFF,
      }
    case 'half':
      return {
        x: -RUNOFF,
        y: -RUNOFF,
        width: length / 2 + RUNOFF,
        height: width + 2 * RUNOFF,
      }
    case 'penalty': {
      // Left penalty area including the penalty arc, plus some space in front of it.
      const depth = 30
      const halfHeight = 26
      return {
        x: -RUNOFF,
        y: width / 2 - halfHeight,
        width: depth + RUNOFF,
        height: 2 * halfHeight,
      }
    }
    case 'cornerLeft':
    case 'cornerRight': {
      // Right goal (attacking direction), from the corner flag past the far side of the penalty area.
      // Left/right as seen by the attacking team facing the goal: left corner = top touchline (y = 0).
      const farSide = width / 2 + PITCH.penaltyAreaWidth / 2 + CORNER_VIEW_BEYOND_BOX
      return {
        x: length - CORNER_VIEW_DEPTH,
        y: type === 'cornerLeft' ? -RUNOFF : width - farSide,
        width: CORNER_VIEW_DEPTH + RUNOFF,
        height: farSide + RUNOFF,
      }
    }
  }
}
