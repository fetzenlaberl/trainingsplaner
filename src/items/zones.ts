import type { ZoneShape } from '../model/types'

export interface ZoneTemplate {
  key: string
  name: string
  shape: ZoneShape
}

export const ZONE_TEMPLATES: ZoneTemplate[] = [
  { key: 'zone-rect', name: 'Rechteck', shape: 'rect' },
  { key: 'zone-triangle', name: 'Dreieck', shape: 'triangle' },
  { key: 'zone-ellipse', name: 'Kreis', shape: 'ellipse' },
]

export const ZONE_SHAPES: ZoneShape[] = ['rect', 'triangle', 'ellipse']

/** Size (meters) of a newly placed zone. */
export const DEFAULT_ZONE_SIZE: Record<ZoneShape, { width: number; height: number }> = {
  rect: { width: 20, height: 15 },
  triangle: { width: 20, height: 17 },
  ellipse: { width: 18, height: 18 },
}

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
