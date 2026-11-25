import type Konva from 'konva'
import { flushSync } from 'react-dom'
import { createRoot } from 'react-dom/client'
import { Layer, Stage } from 'react-konva'
import { frameAt, totalDuration } from '../animation/interpolate'
import { FieldView } from '../components/FieldView'
import { groundItems, UprightItems } from '../components/UprightItems'
import { makeProjector } from '../perspective/upright'
import { getViewport, type FieldType } from '../field/dimensions'
import { viewRect } from '../field/orientation'
import { warpedSize } from '../perspective/perspective'
import { drawWarped } from '../perspective/warpCanvas'
import type { PitchStyle } from '../field/pitchStyle'
import type { Scene } from '../model/types'
import {
  animationTimeAt,
  pickMimeType,
  recordingLength,
  VIDEO_BITRATE,
  VIDEO_FPS,
  videoSize,
} from './plan'

/** Thrown when a video cannot be created; the message is shown to the user. */
export class VideoExportError extends Error {}

interface RecordOptions {
  fieldType: FieldType
  pitch: PitchStyle
  scenes: Scene[]
  /** Imported pictures of the drill */
  images: Record<string, string>
  speed: number
  /** Perspective tilt in degrees, or null for a flat video */
  tilt: number | null
  /** Turn of the pitch in perspective, degrees */
  turn?: number
  /** Called with 0..1 */
  onProgress: (progress: number) => void
  signal: AbortSignal
}

/**
 * Plays the animation in an off-screen canvas and records it in real time
 * with canvas.captureStream + MediaRecorder.
 */
export async function recordAnimation({
  fieldType,
  pitch,
  scenes,
  images,
  speed,
  tilt,
  turn = 0,
  onProgress,
  signal,
}: RecordOptions): Promise<{ blob: Blob; mimeType: string }> {
  if (typeof MediaRecorder === 'undefined') {
    throw new VideoExportError('Dieser Browser kann keine Videos aufnehmen.')
  }
  const mimeType = pickMimeType((type) => MediaRecorder.isTypeSupported(type))
  if (!mimeType) throw new VideoExportError('Dieser Browser unterstützt kein passendes Videoformat.')

  const animationMs = totalDuration(scenes)
  const lengthMs = recordingLength(animationMs, speed)
  const viewport = getViewport(fieldType, pitch.area)
  const { width, height, pxPerMeter } = videoSize(viewRect(viewport, pitch.orientation))

  // Recording canvas: the Konva layer is copied into it, independent of the screen's pixel ratio.
  // In perspective the video keeps its width; the height follows the tilted pitch.
  const outputSize = tilt === null ? { width, height } : warpedSize(width, height, tilt, turn)
  const output = document.createElement('canvas')
  output.width = outputSize.width
  output.height = outputSize.height
  const ctx = output.getContext('2d')
  if (!ctx) throw new VideoExportError('Die Zeichenfläche für das Video konnte nicht erstellt werden.')

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-100000px'
  container.style.top = '0'
  document.body.appendChild(container)
  const root = createRoot(container)
  let stage: Konva.Stage | null = null
  let uprightStage: Konva.Stage | null = null
  // In perspective, standing items are drawn upright on top of the tilted ground.
  const project =
    tilt === null
      ? null
      : makeProjector(
          { viewport, orientation: pitch.orientation, scale: pxPerMeter, offsetX: 0, offsetY: 0, width, height },
          tilt,
          outputSize.width,
          outputSize.height,
          turn,
        )

  const drawFrame = (time: number) => {
    const frame = frameAt(scenes, time)
    flushSync(() =>
      root.render(
        <>
        <Stage
          width={width}
          height={height}
          listening={false}
          ref={(node) => {
            stage = node
          }}
        >
          <Layer>
            <FieldView
              fieldType={fieldType}
              pitch={pitch}
              items={project ? groundItems(frame.items) : frame.items}
              lines={frame.lines}
              zones={frame.zones}
              viewport={viewport}
              scale={pxPerMeter}
              offsetX={0}
              offsetY={0}
              interactive={false}
              images={images}
            />
          </Layer>
        </Stage>
        {project && (
          <Stage
            width={outputSize.width}
            height={outputSize.height}
            listening={false}
            ref={(node) => {
              uprightStage = node
            }}
          >
            <Layer>
              <UprightItems items={frame.items} project={project} pitchColor={pitch.color} orientation={pitch.orientation} images={images} />
            </Layer>
          </Stage>
        )}
        </>,
      ),
    )
    const layer = stage?.getLayers()[0]
    if (!layer) return
    layer.draw()
    if (tilt === null) {
      ctx.drawImage(layer.getNativeCanvasElement(), 0, 0, width, height)
    } else {
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, output.width, output.height)
      drawWarped(ctx, layer.getNativeCanvasElement(), tilt, output.width, output.height, turn)
      const upright = (uprightStage as Konva.Stage | null)?.getLayers()[0]
      if (upright) {
        upright.draw()
        ctx.drawImage(upright.getNativeCanvasElement(), 0, 0, output.width, output.height)
      }
    }
  }

  const stream = output.captureStream(VIDEO_FPS)
  try {
    drawFrame(0)
    // Give react-konva one frame to finish creating all nodes, then draw again.
    await new Promise((resolve) => requestAnimationFrame(resolve))
    drawFrame(0)

    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: VIDEO_BITRATE })
    const chunks: Blob[] = []
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data)
    }
    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve()
    })

    recorder.start(250)
    const start = performance.now()
    await new Promise<void>((resolve, reject) => {
      const tick = () => {
        if (signal.aborted) {
          reject(new DOMException('Abgebrochen', 'AbortError'))
          return
        }
        const elapsed = performance.now() - start
        drawFrame(animationTimeAt(elapsed, animationMs, speed))
        onProgress(Math.min(elapsed / lengthMs, 1))
        if (elapsed >= lengthMs) resolve()
        else requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }).finally(() => {
      if (recorder.state !== 'inactive') recorder.stop()
    })
    await stopped

    return { blob: new Blob(chunks, { type: mimeType.split(';')[0] }), mimeType }
  } finally {
    stream.getTracks().forEach((track) => track.stop())
    root.unmount()
    container.remove()
  }
}
