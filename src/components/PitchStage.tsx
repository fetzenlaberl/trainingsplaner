import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Layer, Stage } from 'react-konva'
import { getViewport } from '../field/dimensions'
import { clampToRect, fitViewport, isInsideRect, pixelsToMeters } from '../field/layout'
import { defaultView, panBy, zoomAround, zoomedLayout, type ViewState, type ZoomContext } from '../field/zoom'
import { useViewGestures, type ViewGestureState } from '../hooks/useViewGestures'
import { distance } from '../lines/geometry'
import type { Point } from '../model/types'
import { frameAt } from '../animation/interpolate'
import { useDrillStore } from '../store/drillStore'
import { usePlaybackStore } from '../store/playbackStore'
import { useToolStore } from '../store/toolStore'
import { LineHandles } from './FieldLines'
import { FieldView } from './FieldView'
import { LineShape } from './LineShape'
import { ZoomControls } from './ZoomControls'

const PADDING = 12
/** Shorter strokes (meters) are treated as accidental taps. */
const MIN_LINE_LENGTH = 0.5
/** Zoom step of the + and − buttons */
const BUTTON_ZOOM_FACTOR = 1.25

/** Lets other components (the sidebar) drop items onto the pitch. */
export interface DropTarget {
  /** Converts a screen position to meters, or null if it is not over the visible field. */
  toMeters: (clientX: number, clientY: number) => { x: number; y: number } | null
  /** Current pixels per meter */
  scale: number
}

interface PitchStageProps {
  dropTargetRef: RefObject<DropTarget | null>
}

/** Konva stage that fills its container and scales the pitch to fit. */
export function PitchStage({ dropTargetRef }: PitchStageProps) {
  const fieldType = useDrillStore((s) => s.fieldType)
  const pitch = useDrillStore((s) => s.pitch)
  const addLine = useDrillStore((s) => s.addLine)
  const select = useDrillStore((s) => s.select)
  const scenes = useDrillStore((s) => s.scenes)
  const sceneIndex = useDrillStore((s) => s.sceneIndex)
  const time = usePlaybackStore((s) => s.time)
  const tool = useToolStore((s) => s.tool)
  const lineColor = useToolStore((s) => s.lineColor)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [draft, setDraft] = useState<{ start: Point; end: Point } | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const stageRef = useRef<Konva.Stage>(null)
  // Zoom belongs to one field type; switching the field type shows the whole field again.
  const [zoomState, setZoomState] = useState<{ fieldType: string; view: ViewState } | null>(null)
  const latestRef = useRef<ViewGestureState | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width: Math.floor(width), height: Math.floor(height) })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => cleanupRef.current?.(), [])

  const viewport = getViewport(fieldType)
  const baseLayout = fitViewport(viewport, size.width, size.height, PADDING)
  const zoomCtx: ZoomContext = { viewport, container: size, baseScale: baseLayout.scale }
  const view = zoomState?.fieldType === fieldType ? zoomState.view : defaultView(viewport)
  const layout = baseLayout.scale > 0 ? zoomedLayout(view, zoomCtx) : baseLayout
  const setView = (next: ViewState) => setZoomState({ fieldType, view: next })

  useEffect(() => {
    latestRef.current = { view, ctx: zoomCtx }
  })

  const touchCountRef = useViewGestures(containerRef, latestRef, setView, () => {
    // A second finger means zoom/pan: cancel drawing, panning and item drags.
    cleanupRef.current?.()
    stageRef.current?.find((node: Konva.Node) => node.isDragging()).forEach((node) => node.stopDrag())
  })

  const zoomByButton = (factor: number) =>
    setView(zoomAround(view, zoomCtx, factor, size.width / 2, size.height / 2))
  const animating = time !== null
  const drawing = tool !== 'select' && !animating
  const frame = animating ? frameAt(scenes, time) : null
  const items = frame ? frame.items : scenes[sceneIndex].items
  const lines = frame ? frame.lines : scenes[sceneIndex].lines

  function clientToMeters(clientX: number, clientY: number): Point | null {
    const el = containerRef.current
    if (!el || layout.scale <= 0) return null
    const rect = el.getBoundingClientRect()
    return pixelsToMeters(layout, viewport, clientX - rect.left, clientY - rect.top)
  }

  useEffect(() => {
    dropTargetRef.current = {
      scale: layout.scale,
      toMeters: (clientX, clientY) => {
        const pos = clientToMeters(clientX, clientY)
        return pos && isInsideRect(viewport, pos.x, pos.y) ? pos : null
      },
    }
  })

  /** Dragging on empty space moves the zoomed-in view. */
  function startPan(e: KonvaEventObject<PointerEvent>) {
    cleanupRef.current?.()
    let last = { x: e.evt.clientX, y: e.evt.clientY }
    const onMove = (ev: PointerEvent) => {
      const latest = latestRef.current
      if (!latest) return
      setZoomState({
        fieldType,
        view: panBy(latest.view, latest.ctx, ev.clientX - last.x, ev.clientY - last.y),
      })
      last = { x: ev.clientX, y: ev.clientY }
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', cleanup)
      window.removeEventListener('pointercancel', cleanup)
      cleanupRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', cleanup)
    window.addEventListener('pointercancel', cleanup)
    cleanupRef.current = cleanup
  }

  function handlePointerDown(e: KonvaEventObject<PointerEvent>) {
    if (touchCountRef.current > 1) return
    const onEmptySpace = e.target === e.target.getStage()
    if (tool === 'select' || animating) {
      if (!onEmptySpace) return
      // Tap on empty space clears the selection; dragging there pans when zoomed in.
      if (!animating) select(null)
      if (view.zoom > 1 && (e.evt.pointerType !== 'mouse' || e.evt.button === 0)) startPan(e)
      return
    }
    if (e.evt.pointerType === 'mouse' && e.evt.button !== 0) return
    const start = clientToMeters(e.evt.clientX, e.evt.clientY)
    if (!start || !isInsideRect(viewport, start.x, start.y)) return
    const lineType = tool
    cleanupRef.current?.()
    setDraft({ start, end: start })

    const endAt = (ev: PointerEvent): Point => {
      const pos = clientToMeters(ev.clientX, ev.clientY) ?? start
      return clampToRect(viewport, pos.x, pos.y)
    }
    const onMove = (ev: PointerEvent) => setDraft({ start, end: endAt(ev) })
    const onUp = (ev: PointerEvent) => {
      cleanup()
      const end = endAt(ev)
      if (distance(start, end) >= MIN_LINE_LENGTH) addLine(lineType, start, end, lineColor)
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', cleanup)
      cleanupRef.current = null
      setDraft(null)
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', cleanup)
    cleanupRef.current = cleanup
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none overflow-hidden"
      style={{ cursor: drawing ? 'crosshair' : undefined }}
    >
      {size.width > 0 && size.height > 0 && layout.scale > 0 && (
        <Stage ref={stageRef} width={size.width} height={size.height} onPointerDown={handlePointerDown}>
          <Layer>
            <FieldView
              fieldType={fieldType}
              pitch={pitch}
              items={items}
              lines={lines}
              viewport={viewport}
              scale={layout.scale}
              offsetX={layout.offsetX}
              offsetY={layout.offsetY}
              interactive={tool === 'select' && !animating}
            >
              {draft && tool !== 'select' && (
                <LineShape
                  type={tool}
                  points={[draft.start, draft.end]}
                  smooth
                  color={lineColor}
                  scale={layout.scale}
                  opacity={0.7}
                />
              )}
              {tool === 'select' && !animating && <LineHandles scale={layout.scale} />}
            </FieldView>
          </Layer>
        </Stage>
      )}
      {layout.scale > 0 && (
        <ZoomControls
          zoom={view.zoom}
          onZoomIn={() => zoomByButton(BUTTON_ZOOM_FACTOR)}
          onZoomOut={() => zoomByButton(1 / BUTTON_ZOOM_FACTOR)}
          onFit={() => setView(defaultView(viewport))}
        />
      )}
    </div>
  )
}
