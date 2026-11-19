// Reminder to export a backup regularly (browser data can be lost, e.g. when site data is cleared).

const STORAGE_KEY = 'trainingsplaner.lastBackup'
export const REMIND_AFTER_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

export function loadLastBackup(): number | null {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

export function saveLastBackup(timestamp: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(timestamp))
  } catch {
    // Not critical: the reminder would just show again.
  }
}

/** Text for the reminder, or null if the last backup is recent enough. */
export function backupReminderText(lastBackup: number | null, now: number): string | null {
  if (lastBackup === null) return 'Du hast noch keine Sicherung erstellt.'
  const days = Math.floor((now - lastBackup) / DAY_MS)
  if (days < REMIND_AFTER_DAYS) return null
  return `Deine letzte Sicherung ist ${days} Tage her.`
}
