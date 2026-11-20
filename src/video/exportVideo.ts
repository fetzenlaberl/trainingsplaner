import { downloadBlob } from '../export/download'
import { preloadImages } from '../import/imageCache'
import { fileNameFromTitle } from '../model/serialize'
import { useDrillStore } from '../store/drillStore'
import { exportTilt } from '../store/perspectiveStore'
import { usePlaybackStore } from '../store/playbackStore'
import { extensionFor } from './plan'
import { recordAnimation } from './recordAnimation'

export type VideoFormat = 'webm' | 'mp4'

export type VideoProgress =
  | { phase: 'recording'; progress: number }
  | { phase: 'preparing' }
  | { phase: 'converting'; progress: number }

/** Records the animation and downloads it as WebM or MP4. */
export async function exportVideo(
  format: VideoFormat,
  onProgress: (progress: VideoProgress) => void,
  signal: AbortSignal,
): Promise<void> {
  // Take a copy of the drill now, so edits during the export do not affect the video.
  const { title, fieldType, pitch, scenes, images } = useDrillStore.getState()
  await preloadImages(Object.values(images))
  const { speed } = usePlaybackStore.getState()

  const recording = await recordAnimation({
    fieldType,
    pitch,
    scenes,
    images,
    speed,
    tilt: exportTilt(),
    signal,
    onProgress: (progress) => onProgress({ phase: 'recording', progress }),
  })

  let blob = recording.blob
  let extension = extensionFor(recording.mimeType)
  if (format === 'mp4' && extension !== 'mp4') {
    onProgress({ phase: 'preparing' })
    const { convertToMp4 } = await import('./convertToMp4')
    blob = await convertToMp4(
      blob,
      {
        onLoaded: () => onProgress({ phase: 'converting', progress: 0 }),
        onProgress: (progress) => onProgress({ phase: 'converting', progress }),
      },
      signal,
    )
    extension = 'mp4'
  }
  downloadBlob(blob, `${fileNameFromTitle(title)}.${extension}`)
}
