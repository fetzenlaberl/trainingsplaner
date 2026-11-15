import { create } from 'zustand'

export const SPEEDS = [0.5, 1, 1.5, 2] as const

interface PlaybackState {
  /** Animation time in ms, or null while editing (no animation frame shown) */
  time: number | null
  playing: boolean
  speed: number
  play: (from: number) => void
  pause: () => void
  /** Jumps to a time and pauses. */
  seek: (time: number) => void
  /** Leaves the animation view and returns to editing. */
  stop: () => void
  setSpeed: (speed: number) => void
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  time: null,
  playing: false,
  speed: 1,
  play: (from) => set({ time: from, playing: true }),
  pause: () => set({ playing: false }),
  seek: (time) => set({ time, playing: false }),
  stop: () => set({ time: null, playing: false }),
  setSpeed: (speed) => set({ speed }),
}))
