import { create } from 'zustand'

// Which editor bars are folded away (to give the pitch more room on tablets).
// Remembered per device in localStorage.

export type Bar = 'header' | 'tools' | 'sidebar' | 'timeline'
export const BARS: Bar[] = ['header', 'tools', 'sidebar', 'timeline']

const STORAGE_KEY = 'trainingsplaner.collapsedBars'

type Collapsed = Record<Bar, boolean>

const NONE: Collapsed = { header: false, tools: false, sidebar: false, timeline: false }

function load(): Collapsed {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (typeof data !== 'object' || data === null) return NONE
    const record = data as Record<string, unknown>
    return Object.fromEntries(BARS.map((bar) => [bar, record[bar] === true])) as Collapsed
  } catch {
    return NONE
  }
}

function save(collapsed: Collapsed): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed))
  } catch {
    // Not critical: the bars just open again next time.
  }
}

interface LayoutState {
  collapsed: Collapsed
  toggle: (bar: Bar) => void
  /** Folds all bars away, or opens all again if they are all folded. */
  toggleAll: () => void
}

export const allCollapsed = (collapsed: Collapsed) => BARS.every((bar) => collapsed[bar])

export const useLayoutStore = create<LayoutState>((set) => ({
  collapsed: typeof localStorage === 'undefined' ? NONE : load(),
  toggle: (bar) =>
    set((s) => {
      const collapsed = { ...s.collapsed, [bar]: !s.collapsed[bar] }
      save(collapsed)
      return { collapsed }
    }),
  toggleAll: () =>
    set((s) => {
      const fold = !allCollapsed(s.collapsed)
      const collapsed = Object.fromEntries(BARS.map((bar) => [bar, fold])) as Collapsed
      save(collapsed)
      return { collapsed }
    }),
}))
