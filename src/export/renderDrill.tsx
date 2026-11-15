import type Konva from 'konva'
import { createRoot } from 'react-dom/client'
import { Layer, Stage } from 'react-konva'
import { FieldView } from '../components/FieldView'
import { getViewport } from '../field/dimensions'
import { currentScene, useDrillStore } from '../store/drillStore'
import { EXPORT_SCALE, exportSize } from './layout'

/**
 * Renders the current drill into a canvas at a fixed resolution, independent of the
 * window size and without selection marks or handles.
 */
export async function renderDrillToCanvas(pxPerMeter = EXPORT_SCALE): Promise<HTMLCanvasElement> {
  const state = useDrillStore.getState()
  const { fieldType } = state
  const { items, lines } = currentScene(state)
  const viewport = getViewport(fieldType)
  const { width, height } = exportSize(viewport, pxPerMeter)

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
              items={items}
              lines={lines}
              viewport={viewport}
              scale={pxPerMeter}
              offsetX={0}
              offsetY={0}
              interactive={false}
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
