import type { FFmpeg } from '@ffmpeg/ffmpeg'
// Served with the app (no external CDN); only downloaded when an MP4 is requested.
import coreURL from '@ffmpeg/core?url'
import wasmURL from '@ffmpeg/core/wasm?url'
import { mp4ConversionArgs } from './plan'

let ffmpegPromise: Promise<FFmpeg> | null = null

function loadFFmpeg(): Promise<FFmpeg> {
  ffmpegPromise ??= (async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg')
    const ffmpeg = new FFmpeg()
    await ffmpeg.load({ coreURL, wasmURL })
    return ffmpeg
  })().catch((err) => {
    ffmpegPromise = null
    throw err
  })
  return ffmpegPromise
}

/** Converts a recorded video to MP4 (H.264) in the browser using ffmpeg.wasm. */
export async function convertToMp4(
  input: Blob,
  callbacks: { onLoaded: () => void; onProgress: (progress: number) => void },
  signal: AbortSignal,
): Promise<Blob> {
  const ffmpeg = await loadFFmpeg()
  if (signal.aborted) throw new DOMException('Abgebrochen', 'AbortError')
  callbacks.onLoaded()

  const onProgress = ({ progress }: { progress: number }) =>
    callbacks.onProgress(Math.min(Math.max(progress, 0), 1))
  // Terminating is the only way to stop a running conversion; it is reloaded next time.
  const onAbort = () => {
    ffmpeg.terminate()
    ffmpegPromise = null
  }
  ffmpeg.on('progress', onProgress)
  signal.addEventListener('abort', onAbort)

  try {
    await ffmpeg.writeFile('input.webm', new Uint8Array(await input.arrayBuffer()))
    const exitCode = await ffmpeg.exec(mp4ConversionArgs('input.webm', 'output.mp4'))
    if (exitCode !== 0) throw new Error(`ffmpeg exit code ${exitCode}`)
    const data = await ffmpeg.readFile('output.mp4')
    if (typeof data === 'string') throw new Error('Unexpected text output from ffmpeg')
    await ffmpeg.deleteFile('input.webm')
    await ffmpeg.deleteFile('output.mp4')
    return new Blob([new Uint8Array(data)], { type: 'video/mp4' })
  } catch (err) {
    if (signal.aborted) throw new DOMException('Abgebrochen', 'AbortError')
    throw err
  } finally {
    signal.removeEventListener('abort', onAbort)
    if (!signal.aborted) ffmpeg.off('progress', onProgress)
  }
}
