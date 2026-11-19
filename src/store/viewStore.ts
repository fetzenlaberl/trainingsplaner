import { create } from 'zustand'

export type View = 'editor' | 'library' | 'sessions' | 'teams'

interface ViewState {
  view: View
  setView: (view: View) => void
}

export const useViewStore = create<ViewState>((set) => ({
  view: 'editor',
  setView: (view) => set({ view }),
}))
