import type { LibraryEntry } from '../library/library'
import { SESSION_KINDS, type SessionKind } from './week'

export const DEFAULT_BLOCK_MINUTES = 15
export const MAX_BLOCK_MINUTES = 240

export interface SessionBlock {
  id: string
  /** Library drill this block uses, or null for a free block (e.g. drinks break) */
  drillId: string | null
  /** Drill title at the time it was added (shown if the drill is deleted) or the free block's title */
  title: string
  durationMin: number
  notes: string
}

export interface TrainingSession {
  id: string
  title: string
  /** YYYY-MM-DD or empty */
  date: string
  /** HH:MM or empty */
  startTime: string
  /** Training, tactics, match review … (color in the week planner) */
  kind: SessionKind
  team: string
  goal: string
  notes: string
  blocks: SessionBlock[]
  createdAt: number
  updatedAt: number
}

let idCounter = 0

function createId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${idCounter}`
}

export function createSession(now: number, date = ''): TrainingSession {
  return {
    id: createId('session'),
    title: 'Neue Trainingseinheit',
    date,
    startTime: '',
    kind: 'training',
    team: '',
    goal: '',
    notes: '',
    blocks: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function duplicateSession(session: TrainingSession, now: number): TrainingSession {
  return {
    ...session,
    id: createId('session'),
    title: `${session.title} (Kopie)`,
    blocks: session.blocks.map((b) => ({ ...b, id: createId('block') })),
    createdAt: now,
    updatedAt: now,
  }
}

export function drillBlock(entry: LibraryEntry): SessionBlock {
  return {
    id: createId('block'),
    drillId: entry.id,
    title: entry.drill.title,
    durationMin: DEFAULT_BLOCK_MINUTES,
    notes: '',
  }
}

export function freeBlock(title = 'Trinkpause', durationMin = 5): SessionBlock {
  return { id: createId('block'), drillId: null, title, durationMin, notes: '' }
}

export function totalMinutes(session: Pick<TrainingSession, 'blocks'>): number {
  return session.blocks.reduce((sum, b) => sum + b.durationMin, 0)
}

/** Moves the block at `index` one step up (-1) or down (+1). */
export function moveBlock(blocks: SessionBlock[], index: number, direction: -1 | 1): SessionBlock[] {
  const target = index + direction
  if (index < 0 || index >= blocks.length || target < 0 || target >= blocks.length) return blocks
  const result = [...blocks]
  ;[result[index], result[target]] = [result[target], result[index]]
  return result
}

export function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_BLOCK_MINUTES
  return Math.min(Math.max(Math.round(minutes), 1), MAX_BLOCK_MINUTES)
}

function parseClock(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function formatClock(totalMin: number): string {
  const wrapped = ((totalMin % 1440) + 1440) % 1440
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`
}

export interface ScheduleRow {
  block: SessionBlock
  /** 1-based position */
  number: number
  /** "18:00–18:15" with a start time, otherwise "0–15 min" */
  time: string
}

/** Time ranges of all blocks, as clock times if the session has a start time. */
export function scheduleRows(session: Pick<TrainingSession, 'blocks' | 'startTime'>): ScheduleRow[] {
  const start = parseClock(session.startTime)
  let offset = 0
  return session.blocks.map((block, i) => {
    const from = offset
    offset += block.durationMin
    const time =
      start === null
        ? `${from}–${offset} min`
        : `${formatClock(start + from)}–${formatClock(start + offset)}`
    return { block, number: i + 1, time }
  })
}

/** Newest date first; sessions without a date after dated ones, then by last change. */
export function sortSessions(sessions: TrainingSession[]): TrainingSession[] {
  return [...sessions].sort((a, b) => {
    if (a.date !== b.date) {
      if (!a.date) return 1
      if (!b.date) return -1
      return a.date < b.date ? 1 : -1
    }
    return b.updatedAt - a.updatedAt
  })
}

export function formatDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  return match ? `${match[3]}.${match[2]}.${match[1]}` : ''
}

/** Text for the overview line of a session: date, start time and team. */
export function sessionMetaLine(session: TrainingSession): string {
  return [
    formatDate(session.date),
    session.startTime ? `Beginn ${session.startTime} Uhr` : '',
    session.team,
  ]
    .filter(Boolean)
    .join(' · ')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function parseBlock(value: unknown): SessionBlock | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    !(value.drillId === null || typeof value.drillId === 'string') ||
    typeof value.title !== 'string' ||
    !isNonNegativeNumber(value.durationMin) ||
    typeof value.notes !== 'string'
  ) {
    return null
  }
  return {
    id: value.id,
    drillId: value.drillId,
    title: value.title,
    durationMin: clampMinutes(value.durationMin),
    notes: value.notes,
  }
}

/** Validates a session from a backup; returns null if it is broken. */
export function sessionFromData(value: unknown): TrainingSession | null {
  if (
    !isRecord(value) ||
    typeof value.id !== 'string' ||
    typeof value.title !== 'string' ||
    typeof value.date !== 'string' ||
    typeof value.startTime !== 'string' ||
    typeof value.team !== 'string' ||
    typeof value.goal !== 'string' ||
    typeof value.notes !== 'string' ||
    !Array.isArray(value.blocks) ||
    !isNonNegativeNumber(value.createdAt) ||
    !isNonNegativeNumber(value.updatedAt) ||
    // The kind was added with the week planner; older sessions are trainings.
    !(value.kind === undefined || SESSION_KINDS.some((k) => k.key === value.kind))
  ) {
    return null
  }
  const blocks = value.blocks.map(parseBlock)
  if (blocks.some((b) => b === null)) return null
  return {
    id: value.id,
    title: value.title,
    date: value.date,
    startTime: value.startTime,
    kind: (value.kind as SessionKind | undefined) ?? 'training',
    team: value.team,
    goal: value.goal,
    notes: value.notes,
    blocks: blocks as SessionBlock[],
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}
