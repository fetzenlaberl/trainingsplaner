import { create } from 'zustand'
import type { LinePattern, LineWeight } from '../lines/styles'
import type { LineType } from '../model/types'

export type Tool = 'select' | LineType

interface ToolState {
  tool: Tool
  lineColor: string
  /** Pattern for new lines; 'auto' = usual pattern of the line type */
  linePattern: LinePattern | 'auto'
  lineWeight: LineWeight
  /** New lines get the next action step number */
  numberSteps: boolean
  /** Item or line currently being dragged on the pitch (its handles are hidden meanwhile) */
  draggingId: string | null
  /** Zone whose corners are being edited (instead of resize/rotate handles) */
  editingCornersId: string | null
  setTool: (tool: Tool) => void
  setLineColor: (color: string) => void
  setLinePattern: (pattern: LinePattern | 'auto') => void
  setLineWeight: (weight: LineWeight) => void
  setNumberSteps: (numberSteps: boolean) => void
  setDraggingId: (id: string | null) => void
  setEditingCornersId: (id: string | null) => void
}

export const useToolStore = create<ToolState>((set) => ({
  tool: 'select',
  lineColor: '#ffffff',
  linePattern: 'auto',
  lineWeight: 'medium',
  numberSteps: false,
  draggingId: null,
  editingCornersId: null,
  setTool: (tool) => set({ tool }),
  setLineColor: (lineColor) => set({ lineColor }),
  setLinePattern: (linePattern) => set({ linePattern }),
  setLineWeight: (lineWeight) => set({ lineWeight }),
  setNumberSteps: (numberSteps) => set({ numberSteps }),
  setDraggingId: (draggingId) => set({ draggingId }),
  setEditingCornersId: (editingCornersId) => set({ editingCornersId }),
}))
