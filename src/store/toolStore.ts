import { create } from 'zustand'
import type { LineType } from '../model/types'

export type Tool = 'select' | LineType

interface ToolState {
  tool: Tool
  lineColor: string
  setTool: (tool: Tool) => void
  setLineColor: (color: string) => void
}

export const useToolStore = create<ToolState>((set) => ({
  tool: 'select',
  lineColor: '#ffffff',
  setTool: (tool) => set({ tool }),
  setLineColor: (lineColor) => set({ lineColor }),
}))
