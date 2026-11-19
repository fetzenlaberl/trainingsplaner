import { create } from 'zustand'
import { DEFAULT_TILT, MAX_TILT, MIN_TILT } from '../perspective/perspective'

interface PerspectiveState {
  /** TV-style perspective view for watching, presenting and exporting (no editing) */
  enabled: boolean
  /** Tilt of the pitch in degrees */
  tilt: number
  setEnabled: (enabled: boolean) => void
  setTilt: (tilt: number) => void
}

export const usePerspectiveStore = create<PerspectiveState>((set) => ({
  enabled: false,
  tilt: DEFAULT_TILT,
  setEnabled: (enabled) => set({ enabled }),
  setTilt: (tilt) => set({ tilt: Math.min(Math.max(tilt, MIN_TILT), MAX_TILT) }),
}))

/** Tilt to use for exports, or null for a flat export. */
export function exportTilt(): number | null {
  const { enabled, tilt } = usePerspectiveStore.getState()
  return enabled ? tilt : null
}
