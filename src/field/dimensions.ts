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

export type FieldType = 'full' | 'half' | 'penalty' | 'empty'

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
  empty: 'Leere Fläche',
}

export const FIELD_TYPES: FieldType[] = ['full', 'half', 'penalty', 'empty']

/** Visible area (in meters) for each field type. */
export function getViewport(type: FieldType): Rect {
  const { length, width } = PITCH
  switch (type) {
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
  }
}
