import { useEffect } from 'react'
import { totalDuration } from '../animation/interpolate'
import { useDrillStore } from '../store/drillStore'
import { usePlaybackStore } from '../store/playbackStore'

/** Advances the animation time while playing. */
export function usePlaybackLoop() {
  const playing = usePlaybackStore((s) => s.playing)

  useEffect(() => {
    if (!playing) return
    let frameId = 0
    let last = performance.now()
    const step = (now: number) => {
      const { time, speed, seek, play } = usePlaybackStore.getState()
      const total = totalDuration(useDrillStore.getState().scenes)
      const next = (time ?? 0) + (now - last) * speed
      last = now
      if (next >= total) {
        seek(total)
        return
      }
      play(next)
      frameId = requestAnimationFrame(step)
    }
    frameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frameId)
  }, [playing])
}
