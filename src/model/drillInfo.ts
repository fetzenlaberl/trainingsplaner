// Facts about a drill (as on the "Trainingsformen" sheet): players, duration, field size, age group.

export type AgeGroup = 'U7' | 'U9' | 'U11' | 'U13' | 'U15' | 'U17' | 'U19' | 'adults'

export const AGE_GROUPS: { key: AgeGroup; name: string }[] = [
  { key: 'U7', name: 'U7' },
  { key: 'U9', name: 'U9' },
  { key: 'U11', name: 'U11' },
  { key: 'U13', name: 'U13' },
  { key: 'U15', name: 'U15' },
  { key: 'U17', name: 'U17' },
  { key: 'U19', name: 'U19' },
  { key: 'adults', name: 'Erwachsene' },
]

export interface DrillInfo {
  players: number | null
  durationMin: number | null
  /** Free text, e.g. "30 × 20 m" */
  fieldSize: string
  ageGroup: AgeGroup | null
}

export const EMPTY_DRILL_INFO: DrillInfo = { players: null, durationMin: null, fieldSize: '', ageGroup: null }

export type PlayerRange = 'upTo6' | '7to10' | '11to14' | '15plus'

export const PLAYER_RANGES: { key: PlayerRange; name: string; min: number; max: number }[] = [
  { key: 'upTo6', name: 'bis 6 Spieler', min: 0, max: 6 },
  { key: '7to10', name: '7–10 Spieler', min: 7, max: 10 },
  { key: '11to14', name: '11–14 Spieler', min: 11, max: 14 },
  { key: '15plus', name: 'ab 15 Spieler', min: 15, max: Infinity },
]

export function inPlayerRange(players: number | null, range: PlayerRange): boolean {
  if (players === null) return false
  const r = PLAYER_RANGES.find((p) => p.key === range)!
  return players >= r.min && players <= r.max
}

export function ageGroupName(group: AgeGroup): string {
  return AGE_GROUPS.find((a) => a.key === group)?.name ?? group
}

/** One line for cards and PDFs, e.g. "12 Spieler · 15 min · 30 × 20 m · U13" (empty if nothing is set). */
export function drillInfoLine(info: DrillInfo): string {
  return [
    info.players !== null ? `${info.players} Spieler` : '',
    info.durationMin !== null ? `${info.durationMin} min` : '',
    info.fieldSize.trim(),
    info.ageGroup ? ageGroupName(info.ageGroup) : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Positive whole number or null (for the number inputs). */
export function parseCount(value: string, max: number): number | null {
  const n = Number.parseInt(value, 10)
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const isCount = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v) && v > 0)

/** Reads drill info from a file; missing info (older files) gives empty values. Returns null if broken. */
export function drillInfoFromData(value: unknown): DrillInfo | null {
  if (value === undefined) return { ...EMPTY_DRILL_INFO }
  if (
    !isRecord(value) ||
    !isCount(value.players) ||
    !isCount(value.durationMin) ||
    typeof value.fieldSize !== 'string' ||
    !(value.ageGroup === null || AGE_GROUPS.some((a) => a.key === value.ageGroup))
  ) {
    return null
  }
  return {
    players: value.players === null ? null : Math.round(value.players as number),
    durationMin: value.durationMin === null ? null : Math.round(value.durationMin as number),
    fieldSize: value.fieldSize,
    ageGroup: value.ageGroup as AgeGroup | null,
  }
}
