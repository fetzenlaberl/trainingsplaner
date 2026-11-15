import { create } from 'zustand'
import type { FieldType } from '../field/dimensions'

interface FieldState {
  fieldType: FieldType
  setFieldType: (fieldType: FieldType) => void
}

export const useFieldStore = create<FieldState>((set) => ({
  fieldType: 'full',
  setFieldType: (fieldType) => set({ fieldType }),
}))
