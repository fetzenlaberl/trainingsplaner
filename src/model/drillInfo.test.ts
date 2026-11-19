import { describe, expect, it } from 'vitest'
import { drillInfoFromData, drillInfoLine, EMPTY_DRILL_INFO, inPlayerRange, parseCount } from './drillInfo'

describe('drillInfo', () => {
  it('builds a line with only the values that are set', () => {
    expect(drillInfoLine({ players: 12, durationMin: 15, fieldSize: '30 × 20 m', ageGroup: 'adults' })).toBe(
      '12 Spieler · 15 min · 30 × 20 m · Erwachsene',
    )
    expect(drillInfoLine({ ...EMPTY_DRILL_INFO, durationMin: 10 })).toBe('10 min')
    expect(drillInfoLine(EMPTY_DRILL_INFO)).toBe('')
  })

  it('sorts player counts into ranges', () => {
    expect(inPlayerRange(6, 'upTo6')).toBe(true)
    expect(inPlayerRange(7, 'upTo6')).toBe(false)
    expect(inPlayerRange(22, '15plus')).toBe(true)
    expect(inPlayerRange(null, '7to10')).toBe(false)
  })

  it('reads number inputs as positive whole numbers', () => {
    expect(parseCount('12', 99)).toBe(12)
    expect(parseCount('', 99)).toBeNull()
    expect(parseCount('0', 99)).toBeNull()
    expect(parseCount('500', 240)).toBe(240)
  })

  it('reads missing info as empty and rejects broken info', () => {
    expect(drillInfoFromData(undefined)).toEqual(EMPTY_DRILL_INFO)
    expect(drillInfoFromData({ players: 'zwölf', durationMin: null, fieldSize: '', ageGroup: null })).toBeNull()
  })
})
