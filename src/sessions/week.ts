// Week planner: dates of a week, sessions per day, session kinds and day intensity.
import type { TrainingSession } from './session'

export type SessionKind = 'training' | 'tactics' | 'review' | 'match' | 'other'

export const SESSION_KINDS: { key: SessionKind; name: string; color: string }[] = [
  { key: 'training', name: 'Training', color: '#2563eb' },
  { key: 'tactics', name: 'Taktik', color: '#7c3aed' },
  { key: 'review', name: 'Spielnachbesprechung', color: '#ea580c' },
  { key: 'match', name: 'Spiel', color: '#dc2626' },
  { key: 'other', name: 'Sonstiges', color: '#475569' },
]

export const WEEKDAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']

/** Intensity of a training day (1 = very light … 10 = maximum), stored per date. */
export interface DayIntensity {
  /** YYYY-MM-DD */
  id: string
  intensity: number
}

export const MIN_INTENSITY = 1
export const MAX_INTENSITY = 10

function parseDate(date: string): Date {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date)
  d.setDate(d.getDate() + days)
  return toIsoDate(d)
}

/** The seven dates (Monday to Sunday) of the week containing `date`. */
export function weekDays(date: string): string[] {
  const d = parseDate(date)
  const mondayOffset = (d.getDay() + 6) % 7
  const monday = toIsoDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - mondayOffset))
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** ISO week number: the week belongs to the year of its Thursday (weeks start on Monday). */
export function isoWeek(date: string): number {
  const d = parseDate(date)
  const thursday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7) + 3)
  const yearStart = new Date(thursday.getFullYear(), 0, 1)
  // Rounding keeps daylight saving time changes from shifting the day count.
  const days = Math.round((thursday.getTime() - yearStart.getTime()) / 86400000)
  return 1 + Math.floor(days / 7)
}

/** Sessions of one day, sorted by start time (sessions without time last). */
export function sessionsOnDay(sessions: TrainingSession[], date: string): TrainingSession[] {
  return sessions
    .filter((s) => s.date === date)
    .sort((a, b) => (a.startTime || '99:99').localeCompare(b.startTime || '99:99'))
}

export function kindInfo(kind: SessionKind) {
  return SESSION_KINDS.find((k) => k.key === kind) ?? SESSION_KINDS[0]
}

export function clampIntensity(value: number): number {
  return Math.min(Math.max(Math.round(value), MIN_INTENSITY), MAX_INTENSITY)
}

/** Validates a day intensity from a backup; returns null if it is broken. */
export function dayIntensityFromData(value: unknown): DayIntensity | null {
  if (typeof value !== 'object' || value === null) return null
  const v = value as Record<string, unknown>
  if (typeof v.id !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v.id) || typeof v.intensity !== 'number') return null
  return { id: v.id, intensity: clampIntensity(v.intensity) }
}
