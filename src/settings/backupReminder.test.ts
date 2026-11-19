import { describe, expect, it } from 'vitest'
import { backupReminderText, REMIND_AFTER_DAYS } from './backupReminder'

const DAY = 24 * 60 * 60 * 1000
const now = Date.UTC(2026, 10, 19)

describe('backupReminderText', () => {
  it('reminds when there was never a backup', () => {
    expect(backupReminderText(null, now)).toMatch(/noch keine Sicherung/)
  })

  it('stays quiet for a recent backup', () => {
    expect(backupReminderText(now - (REMIND_AFTER_DAYS - 1) * DAY, now)).toBeNull()
  })

  it('reminds with the number of days after two weeks', () => {
    expect(backupReminderText(now - 20 * DAY, now)).toBe('Deine letzte Sicherung ist 20 Tage her.')
  })
})
