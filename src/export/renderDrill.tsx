import type Konva from 'konva'
import { createRoot } from 'react-dom/client'
import { Layer, Stage } from 'react-konva'
import type { ReactNode } from 'react'
import { FieldView } from '../components/FieldView'
import { groundItems, UprightItems } from '../components/UprightItems'
import { makeProjector } from '../perspective/upright'
import { warpCanvas } from '../perspective/warpCanvas'
import { getViewport, type FieldType } from '../field/dimensions'
import { viewRect } from '../field/orientation'
import type { PitchStyle } from '../field/pitchStyle'
import type { Scene } from '../model/types'
import { currentScene, useDrillStore } from '../store/drillStore'
import { preloadImages } from '../import/imageCache'
import { EXPORT_SCALE, exportSize } from './layout'

/** Renders the scene shown in the editor (see renderSceneToCanvas). */
export function renderDrillToCanvas(pxPerMeter = EXPORT_SCALE): Promise<HTMLCanvasElement> {
  const state = useDrillStore.getState()
  return renderSceneToCanvas(state.fieldType, state.pitch, currentScene(state), pxPerMeter, state.images)
}

/**
 * Renders a scene into a canvas at a fixed resolution, independent of the
 * window size and without selection marks or handles.
 */
export async function renderSceneToCanvas(
  fieldType: FieldType,
  pitch: PitchStyle,
  { items, lines, zones }: Scene,
  pxPerMeter = EXPORT_SCALE,
  images: Record<string, string> = {},
  /** Only items lying on the ground (the perspective export draws the others upright) */
  groundOnly = false,
): Promise<HTMLCanvasElement> {
  // Pictures must be loaded before drawing, or they would be missing in the export.
  await preloadImages(Object.values(images))
  const viewport = getViewport(fieldType, pitch.area)
  const { width, height } = exportSize(viewRect(viewport, pitch.orientation), pxPerMeter)

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-100000px'
  container.style.top = '0'
  document.body.appendChild(container)
  const root = createRoot(container)

  try {
    const stage = await new Promise<Konva.Stage>((resolve) => {
      root.render(
        <Stage
          width={width}
          height={height}
          listening={false}
          ref={(node) => {
            if (node) resolve(node)
          }}
        >
          <Layer>
            <FieldView
              fieldType={fieldType}
              pitch={pitch}
              items={groundOnly ? groundItems(items) : items}
              lines={lines}
              zones={zones}
              viewport={viewport}
              scale={pxPerMeter}
              offsetX={0}
              offsetY={0}
              interactive={false}
              images={images}
            />
          </Layer>
        </Stage>,
      )
    })
    // Let react-konva finish creating all child nodes before drawing.
    await new Promise((resolve) => requestAnimationFrame(resolve))
    return stage.toCanvas({ pixelRatio: 1 })
  } finally {
    root.unmount()
    container.remove()
  }
}

/**
 * The scene in perspective: the ground is tilted as a picture, standing items are drawn
 * upright on top (as in the 3D view). background null = transparent around the pitch.
 */
export async function renderScenePerspective(
  fieldType: FieldType,
  pitch: PitchStyle,
  scene: Scene,
  tilt: number,
  background: string | null,
  pxPerMeter = EXPORT_SCALE,
  images: Record<string, string> = {},
  turn = 0,
): Promise<HTMLCanvasElement> {
  const flat = await renderSceneToCanvas(fieldType, pitch, scene, pxPerMeter, images, true)
  const out = warpCanvas(flat, tilt, background, turn)
  const viewport = getViewport(fieldType, pitch.area)
  const project = makeProjector(
    { viewport, orientation: pitch.orientation, scale: pxPerMeter, offsetX: 0, offsetY: 0, width: flat.width, height: flat.height },
    tilt,
    out.width,
    out.height,
    turn,
  )
  const overlay = await renderOffscreen(out.width, out.height, (
    <UprightItems items={scene.items} project={project} pitchColor={pitch.color} images={images} />
  ))
  out.getContext('2d')?.drawImage(overlay, 0, 0)
  return out
}

/** Draws Konva content into a canvas of the given size, off screen. */
async function renderOffscreen(width: number, height: number, content: ReactNode): Promise<HTMLCanvasElement> {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-100000px'
  container.style.top = '0'
  document.body.appendChild(container)
  const root = createRoot(container)
  try {
    const stage = await new Promise<Konva.Stage>((resolve) => {
      root.render(
        <Stage
          width={width}
          height={height}
          listening={false}
          ref={(node) => {
            if (node) resolve(node)
          }}
        >
          <Layer>{content}</Layer>
        </Stage>,
      )
    })
    await new Promise((resolve) => requestAnimationFrame(resolve))
    return stage.toCanvas({ pixelRatio: 1 })
  } finally {
    root.unmount()
    container.remove()
  }
}
