import { create } from 'zustand'
import { DEFAULT_TILT, MAX_TILT, MIN_TILT, normalizeTurn } from '../perspective/perspective'

interface PerspectiveState {
  /** TV-style perspective view for watching, presenting and exporting (no editing) */
  enabled: boolean
  /** Tilt of the pitch in degrees */
  tilt: number
  /** Turn of the pitch in degrees (-180..180), 0 = seen as on screen */
  turn: number
  setEnabled: (enabled: boolean) => void
  setTilt: (tilt: number) => void
  setTurn: (turn: number) => void
}

export const usePerspectiveStore = create<PerspectiveState>((set) => ({
  enabled: false,
  tilt: DEFAULT_TILT,
  turn: 0,
  setEnabled: (enabled) => set({ enabled }),
  setTilt: (tilt) => set({ tilt: Math.min(Math.max(tilt, MIN_TILT), MAX_TILT) }),
  setTurn: (turn) => set({ turn: normalizeTurn(Math.round(turn)) }),
}))

/** Tilt to use for exports, or null for a flat export. */
export function exportTilt(): number | null {
  const { enabled, tilt } = usePerspectiveStore.getState()
  return enabled ? tilt : null
}

/** Turn to use for exports (only matters when exportTilt() is not null). */
export function exportTurn(): number {
  return usePerspectiveStore.getState().turn
}
