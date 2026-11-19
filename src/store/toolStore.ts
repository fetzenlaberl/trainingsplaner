import { create } from 'zustand'
import type { LineType } from '../model/types'

export type Tool = 'select' | LineType

interface ToolState {
  tool: Tool
  lineColor: string
  /** Item or line currently being dragged on the pitch (its handles are hidden meanwhile) */
  draggingId: string | null
  /** Zone whose corners are being edited (instead of resize/rotate handles) */
  editingCornersId: string | null
  setTool: (tool: Tool) => void
  setLineColor: (color: string) => void
  setDraggingId: (id: string | null) => void
  setEditingCornersId: (id: string | null) => void
}

export const useToolStore = create<ToolState>((set) => ({
  tool: 'select',
  lineColor: '#ffffff',
  draggingId: null,
  editingCornersId: null,
  setTool: (tool) => set({ tool }),
  setLineColor: (lineColor) => set({ lineColor }),
  setDraggingId: (draggingId) => set({ draggingId }),
  setEditingCornersId: (editingCornersId) => set({ editingCornersId }),
}))
