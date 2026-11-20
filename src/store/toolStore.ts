import { create } from 'zustand'
import type { LinePattern, LineWeight } from '../lines/styles'
import type { LineType } from '../model/types'

export type Tool = 'select' | LineType

const PEN_ONLY_KEY = 'trainingsplaner.penOnly'

function loadPenOnly(): boolean {
  try {
    return localStorage.getItem(PEN_ONLY_KEY) === '1'
  } catch {
    return false
  }
}

interface ToolState {
  tool: Tool
  lineColor: string
  /** Pattern for new lines; 'auto' = usual pattern of the line type */
  linePattern: LinePattern | 'auto'
  lineWeight: LineWeight
  /** New lines get the next action step number */
  numberSteps: boolean
  /** Every tap adds an element to the selection or removes it (for touch screens) */
  multiSelect: boolean
  /** Only a pen (Apple Pencil) draws lines; a finger moves and zooms the view (remembered per device) */
  penOnly: boolean
  /** Quick menu next to an item (screen position of the click or long press) */
  quickMenu: { itemId: string; x: number; y: number } | null
  /** Item or line currently being dragged on the pitch (its handles are hidden meanwhile) */
  draggingId: string | null
  /** Zone whose corners are being edited (instead of resize/rotate handles) */
  editingCornersId: string | null
  setTool: (tool: Tool) => void
  setLineColor: (color: string) => void
  setLinePattern: (pattern: LinePattern | 'auto') => void
  setLineWeight: (weight: LineWeight) => void
  setNumberSteps: (numberSteps: boolean) => void
  setMultiSelect: (multiSelect: boolean) => void
  setPenOnly: (penOnly: boolean) => void
  setQuickMenu: (menu: { itemId: string; x: number; y: number } | null) => void
  setDraggingId: (id: string | null) => void
  setEditingCornersId: (id: string | null) => void
}

export const useToolStore = create<ToolState>((set) => ({
  tool: 'select',
  lineColor: '#ffffff',
  linePattern: 'auto',
  lineWeight: 'medium',
  numberSteps: false,
  multiSelect: false,
  penOnly: typeof localStorage === 'undefined' ? false : loadPenOnly(),
  quickMenu: null,
  draggingId: null,
  editingCornersId: null,
  setTool: (tool) => set({ tool }),
  setLineColor: (lineColor) => set({ lineColor }),
  setLinePattern: (linePattern) => set({ linePattern }),
  setLineWeight: (lineWeight) => set({ lineWeight }),
  setNumberSteps: (numberSteps) => set({ numberSteps }),
  setMultiSelect: (multiSelect) => set({ multiSelect }),
  setPenOnly: (penOnly) => {
    try {
      localStorage.setItem(PEN_ONLY_KEY, penOnly ? '1' : '0')
    } catch {
      // Not critical: the setting is just not remembered.
    }
    set({ penOnly })
  },
  setQuickMenu: (quickMenu) => set({ quickMenu }),
  setDraggingId: (draggingId) => set({ draggingId }),
  setEditingCornersId: (editingCornersId) => set({ editingCornersId }),
}))
