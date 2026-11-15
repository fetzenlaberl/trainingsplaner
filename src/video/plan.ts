import type { Rect } from '../field/dimensions'

export const VIDEO_WIDTH = 1280
export const VIDEO_FPS = 30
export const VIDEO_BITRATE = 5_000_000
/** Still frames before the animation starts and after it ends */
export const HOLD_START_MS = 500
export const HOLD_END_MS = 1000

/** Preferred recording formats, best first. Safari only supports MP4. */
export const MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4;codecs=avc1',
  'video/mp4',
]

/** Video size in pixels (both even, as H.264 requires) and the resulting scale. */
export function videoSize(viewport: Rect, width = VIDEO_WIDTH) {
  const evenWidth = Math.round(width / 2) * 2
  const height = Math.max(2, Math.round((evenWidth * viewport.height) / viewport.width / 2) * 2)
  return { width: evenWidth, height, pxPerMeter: evenWidth / viewport.width }
}

/** Real-time length of the recording in ms. */
export function recordingLength(animationMs: number, speed: number): number {
  return HOLD_START_MS + animationMs / speed + HOLD_END_MS
}

/** Animation time to show after `elapsedMs` of recording. */
export function animationTimeAt(elapsedMs: number, animationMs: number, speed: number): number {
  return Math.min(Math.max((elapsedMs - HOLD_START_MS) * speed, 0), animationMs)
}

export function pickMimeType(isSupported: (type: string) => boolean): string | null {
  return MIME_CANDIDATES.find((type) => isSupported(type)) ?? null
}

export function extensionFor(mimeType: string): 'webm' | 'mp4' {
  return mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
}

/** ffmpeg arguments for a widely compatible MP4 (H.264, constant frame rate, no audio). */
export function mp4ConversionArgs(input: string, output: string): string[] {
  return [
    '-i', input,
    '-r', String(VIDEO_FPS),
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-an',
    output,
  ]
}
