import type { ZoneGoals, ZoneShape } from '../model/types'

export interface ZoneTemplate {
  key: string
  name: string
  shape: ZoneShape
  goals: ZoneGoals
  /** Start size in meters */
  width: number
  height: number
}

export const ZONE_TEMPLATES: ZoneTemplate[] = [
  { key: 'zone-rect', name: 'Rechteck', shape: 'rect', goals: 0, width: 20, height: 15 },
  { key: 'zone-triangle', name: 'Dreieck', shape: 'triangle', goals: 0, width: 20, height: 17 },
  { key: 'zone-ellipse', name: 'Kreis', shape: 'ellipse', goals: 0, width: 18, height: 18 },
  { key: 'field-4', name: 'Kleinfeld 4 Tore', shape: 'rect', goals: 4, width: 30, height: 20 },
  { key: 'field-6', name: 'Kleinfeld 6 Tore', shape: 'rect', goals: 6, width: 40, height: 25 },
]

export const ZONE_GOAL_OPTIONS: ZoneGoals[] = [0, 4, 6]

/**
 * Positions of the built-in mini goals of a zone, relative to its center (meters).
 * The goals sit on the two short sides, opening inwards; rotation 0 = opening towards +x.
 */
export function zoneGoalPositions(
  width: number,
  height: number,
  goals: ZoneGoals,
): { x: number; y: number; rotation: number }[] {
  if (goals === 0) return []
  const perSide = goals / 2
  const fractions = perSide === 2 ? [0.25, 0.75] : [1 / 6, 0.5, 5 / 6]
  if (width >= height) {
    // Short sides are left and right.
    return fractions.flatMap((f) => {
      const y = -height / 2 + f * height
      return [
        { x: -width / 2, y, rotation: 0 },
        { x: width / 2, y, rotation: 180 },
      ]
    })
  }
  // Short sides are top and bottom.
  return fractions.flatMap((f) => {
    const x = -width / 2 + f * width
    return [
      { x, y: -height / 2, rotation: 90 },
      { x, y: height / 2, rotation: 270 },
    ]
  })
}

export const ZONE_SHAPES: ZoneShape[] = ['rect', 'triangle', 'ellipse']

export const MIN_ZONE_SIZE = 1
export const MAX_ZONE_SIZE = 140

export const ZONE_COLORS: { value: string; name: string }[] = [
  { value: '#facc15', name: 'Gelb' },
  { value: '#ffffff', name: 'Weiß' },
  { value: '#dc2626', name: 'Rot' },
  { value: '#2563eb', name: 'Blau' },
  { value: '#16a34a', name: 'Grün' },
  { value: '#f97316', name: 'Orange' },
]

export const DEFAULT_ZONE_COLOR = ZONE_COLORS[0].value
export const DEFAULT_ZONE_FILL_OPACITY = 0.22
export const MAX_ZONE_FILL_OPACITY = 0.8

export function clampFillOpacity(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_ZONE_FILL_OPACITY
  return Math.round(Math.min(Math.max(value, 0), MAX_ZONE_FILL_OPACITY) * 100) / 100
}

export function clampZoneSize(value: number): number {
  if (!Number.isFinite(value)) return MIN_ZONE_SIZE
  return Math.min(Math.max(value, MIN_ZONE_SIZE), MAX_ZONE_SIZE)
}
