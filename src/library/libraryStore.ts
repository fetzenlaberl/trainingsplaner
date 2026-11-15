import { create } from 'zustand'
import { emptyDrill, serializeDrill } from '../model/serialize'

const STORAGE_KEY = 'trainingsplaner.libraryLink'

interface LibraryLinkState {
  /** Library entry the drill in the editor belongs to, or null if it is not in the library */
  libraryId: string | null
  /** Serialized drill as last saved to (or opened from) the library, to detect changes */
  savedJson: string | null
  setLink: (libraryId: string | null, savedJson: string | null) => void
}

function readStoredLink(): Pick<LibraryLinkState, 'libraryId' | 'savedJson'> {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (text) {
      const data = JSON.parse(text)
      if (
        (data.libraryId === null || typeof data.libraryId === 'string') &&
        (data.savedJson === null || typeof data.savedJson === 'string')
      ) {
        return { libraryId: data.libraryId, savedJson: data.savedJson }
      }
    }
  } catch {
    // Storage unavailable or broken: treat the drill as not linked.
  }
  return { libraryId: null, savedJson: serializeDrill(emptyDrill()) }
}

export const useLibraryLink = create<LibraryLinkState>((set) => ({
  ...readStoredLink(),
  setLink: (libraryId, savedJson) => {
    set({ libraryId, savedJson })
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ libraryId, savedJson }))
    } catch {
      // Not critical: only the "unsaved changes" hint is affected.
    }
  },
}))
