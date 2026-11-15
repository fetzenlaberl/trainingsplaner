import { sceneStartTime, totalDuration } from '../animation/interpolate'
import { useDrillStore } from './drillStore'
import { usePlaybackStore } from './playbackStore'

/** Starts playback from the current scene (or from the beginning when at the end), or pauses. */
export function togglePlayback() {
  const playback = usePlaybackStore.getState()
  const drill = useDrillStore.getState()
  if (playback.playing) {
    playback.pause()
    return
  }
  const total = totalDuration(drill.scenes)
  if (total <= 0) return
  let start = playback.time ?? sceneStartTime(drill.scenes, drill.sceneIndex)
  if (start >= total) start = 0
  drill.select(null)
  playback.play(start)
}
