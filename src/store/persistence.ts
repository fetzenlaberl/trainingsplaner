import { parseDrill, serializeDrill } from '../model/serialize'
import { currentDrill, useDrillStore } from './drillStore'

const STORAGE_KEY = 'trainingsplaner.currentDrill'

/** Restores the last drill from localStorage, if there is a valid one. */
export function restoreDrill(): void {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (text) useDrillStore.getState().loadDrill(parseDrill(text))
  } catch {
    // Storage unavailable or content broken: start with an empty drill.
  }
}

/** Saves the drill to localStorage whenever it changes. Returns an unsubscribe function. */
export function startAutosave(): () => void {
  return useDrillStore.subscribe((s, prev) => {
    if (
      s.title === prev.title &&
      s.description === prev.description &&
      s.fieldType === prev.fieldType &&
      s.items === prev.items &&
      s.lines === prev.lines
    ) {
      return
    }
    try {
      localStorage.setItem(STORAGE_KEY, serializeDrill(currentDrill(s)))
    } catch {
      // Storage full or unavailable: the drill can still be saved as a file.
    }
  })
}
