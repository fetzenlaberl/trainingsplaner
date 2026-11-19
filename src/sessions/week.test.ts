import { describe, expect, it } from 'vitest'
import { createSession } from './session'
import { addDays, clampIntensity, dayIntensityFromData, isoWeek, kindInfo, sessionsOnDay, weekDays } from './week'

describe('dates', () => {
  it('lists Monday to Sunday of the week', () => {
    // 19 Nov 2026 is a Thursday
    expect(weekDays('2026-11-19')).toEqual([
      '2026-11-16',
      '2026-11-17',
      '2026-11-18',
      '2026-11-19',
      '2026-11-20',
      '2026-11-21',
      '2026-11-22',
    ])
  })

  it('treats Sunday as the end of the week', () => {
    expect(weekDays('2026-11-22')[0]).toBe('2026-11-16')
  })

  it('adds days across month and year ends', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('computes ISO week numbers', () => {
    expect(isoWeek('2026-11-19')).toBe(47)
    expect(isoWeek('2026-01-01')).toBe(1)
    expect(isoWeek('2027-01-03')).toBe(53)
  })
})

describe('sessionsOnDay', () => {
  it('sorts by start time and puts sessions without time last', () => {
    const s = (id: string, startTime: string) => ({ ...createSession(0, '2026-11-19'), id, startTime })
    const other = { ...createSession(0, '2026-11-20'), id: 'other' }
    const list = sessionsOnDay([s('late', '18:00'), s('none', ''), s('early', '09:00'), other], '2026-11-19')
    expect(list.map((x) => x.id)).toEqual(['early', 'late', 'none'])
  })
})

describe('kinds and intensity', () => {
  it('falls back to training for unknown kinds', () => {
    expect(kindInfo('match').name).toBe('Spiel')
  })

  it('keeps intensity between 1 and 10', () => {
    expect(clampIntensity(0)).toBe(1)
    expect(clampIntensity(7.4)).toBe(7)
    expect(clampIntensity(99)).toBe(10)
  })

  it('validates day intensities from backups', () => {
    expect(dayIntensityFromData({ id: '2026-11-19', intensity: 12 })).toEqual({ id: '2026-11-19', intensity: 10 })
    expect(dayIntensityFromData({ id: 'Montag', intensity: 5 })).toBeNull()
  })
})
