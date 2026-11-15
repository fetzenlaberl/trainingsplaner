import { describe, expect, it } from 'vitest'
import type { LibraryEntry } from '../library/library'
import { emptyDrill } from '../model/serialize'
import {
  clampMinutes,
  createSession,
  DEFAULT_BLOCK_MINUTES,
  drillBlock,
  duplicateSession,
  formatDate,
  freeBlock,
  MAX_BLOCK_MINUTES,
  moveBlock,
  scheduleRows,
  sessionFromData,
  sessionMetaLine,
  sortSessions,
  totalMinutes,
  type TrainingSession,
} from './session'

const entry: LibraryEntry = {
  id: 'drill-1',
  drill: { ...emptyDrill(), title: 'Rondo 4 gegen 2' },
  thumbnail: null,
  createdAt: 0,
  updatedAt: 0,
}

function withBlocks(minutes: number[], startTime = ''): TrainingSession {
  return {
    ...createSession(0),
    startTime,
    blocks: minutes.map((m, i) => freeBlock(`Block ${i + 1}`, m)),
  }
}

describe('blocks', () => {
  it('creates a drill block referencing the library entry', () => {
    const block = drillBlock(entry)
    expect(block.drillId).toBe('drill-1')
    expect(block.title).toBe('Rondo 4 gegen 2')
    expect(block.durationMin).toBe(DEFAULT_BLOCK_MINUTES)
  })

  it('creates a free block without drill', () => {
    expect(freeBlock().drillId).toBeNull()
  })

  it('sums the durations', () => {
    expect(totalMinutes(withBlocks([15, 20, 5]))).toBe(40)
    expect(totalMinutes(withBlocks([]))).toBe(0)
  })

  it('moves blocks up and down and ignores moves past the ends', () => {
    const blocks = withBlocks([1, 2, 3]).blocks
    expect(moveBlock(blocks, 1, -1).map((b) => b.durationMin)).toEqual([2, 1, 3])
    expect(moveBlock(blocks, 1, 1).map((b) => b.durationMin)).toEqual([1, 3, 2])
    expect(moveBlock(blocks, 0, -1)).toBe(blocks)
    expect(moveBlock(blocks, 2, 1)).toBe(blocks)
  })

  it('clamps minutes to a sensible range', () => {
    expect(clampMinutes(0)).toBe(1)
    expect(clampMinutes(12.6)).toBe(13)
    expect(clampMinutes(1000)).toBe(MAX_BLOCK_MINUTES)
    expect(clampMinutes(Number.NaN)).toBe(DEFAULT_BLOCK_MINUTES)
  })
})

describe('scheduleRows', () => {
  it('shows relative minutes without a start time', () => {
    expect(scheduleRows(withBlocks([15, 20])).map((r) => r.time)).toEqual(['0–15 min', '15–35 min'])
  })

  it('shows clock times with a start time', () => {
    expect(scheduleRows(withBlocks([15, 50], '18:00')).map((r) => r.time)).toEqual([
      '18:00–18:15',
      '18:15–19:05',
    ])
  })

  it('wraps around midnight', () => {
    expect(scheduleRows(withBlocks([30], '23:45'))[0].time).toBe('23:45–00:15')
  })

  it('numbers the blocks from 1', () => {
    expect(scheduleRows(withBlocks([5, 5])).map((r) => r.number)).toEqual([1, 2])
  })

  it('ignores an invalid start time', () => {
    expect(scheduleRows(withBlocks([10], '25:99'))[0].time).toBe('0–10 min')
  })
})

describe('sessions', () => {
  it('duplicates with new ids for session and blocks', () => {
    const session = withBlocks([10])
    const copy = duplicateSession(session, 5)
    expect(copy.id).not.toBe(session.id)
    expect(copy.title).toBe(`${session.title} (Kopie)`)
    expect(copy.blocks[0].id).not.toBe(session.blocks[0].id)
    expect(copy.blocks[0].title).toBe(session.blocks[0].title)
  })

  it('sorts by date (newest first), undated last, then by last change', () => {
    const a = { ...createSession(1), id: 'a', date: '2026-11-10' }
    const b = { ...createSession(2), id: 'b', date: '2026-11-20' }
    const c = { ...createSession(3), id: 'c', date: '' }
    const d = { ...createSession(9), id: 'd', date: '2026-11-10' }
    expect(sortSessions([a, b, c, d]).map((s) => s.id)).toEqual(['b', 'd', 'a', 'c'])
  })

  it('formats dates in German style', () => {
    expect(formatDate('2026-11-20')).toBe('20.11.2026')
    expect(formatDate('')).toBe('')
  })

  it('builds the meta line from date, start time and team', () => {
    const session = { ...createSession(0), date: '2026-11-20', startTime: '18:00', team: 'U13' }
    expect(sessionMetaLine(session)).toBe('20.11.2026 · Beginn 18:00 Uhr · U13')
    expect(sessionMetaLine({ ...createSession(0), team: 'U13' })).toBe('U13')
  })
})

describe('sessionFromData', () => {
  it('accepts a valid session', () => {
    const session = { ...withBlocks([10]), blocks: [drillBlock(entry), freeBlock()] }
    expect(sessionFromData(JSON.parse(JSON.stringify(session)))).toEqual(session)
  })

  it('rejects broken sessions and blocks', () => {
    const session = withBlocks([10])
    expect(sessionFromData({ ...session, title: 5 })).toBeNull()
    expect(sessionFromData({ ...session, blocks: [{ id: 'x' }] })).toBeNull()
    expect(sessionFromData(null)).toBeNull()
  })
})
