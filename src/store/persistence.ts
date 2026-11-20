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
      s.category === prev.category &&
      s.info === prev.info &&
      s.area === prev.area &&
      s.fieldType === prev.fieldType &&
      s.pitch === prev.pitch &&
      s.scenes === prev.scenes &&
      s.images === prev.images
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
