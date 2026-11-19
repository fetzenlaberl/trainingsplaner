import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { Layer, Stage, Transformer } from 'react-konva'
import { getViewport } from '../field/dimensions'
import { clampToRect, fitViewport, isInsideRect, pixelsToMeters } from '../field/layout'
import { fromView, viewRect, viewRotation } from '../field/orientation'
import { cameraDistance, fitProjected } from '../perspective/perspective'
import { usePerspectiveStore } from '../store/perspectiveStore'
import { defaultView, panBy, zoomAround, zoomedLayout, type ViewState, type ZoomContext } from '../field/zoom'
import { spaceKey } from '../hooks/spaceKey'
import { useViewGestures, type ViewGestureState } from '../hooks/useViewGestures'
import { elementsInRect, rectFromPoints } from '../store/selection'
import { MIN_ZONE_SIZE, zoneExtent } from '../items/zones'
import { distance } from '../lines/geometry'
import { defaultPattern } from '../lines/styles'
import type { Point } from '../model/types'
import { frameAt } from '../animation/interpolate'
import { currentScene, selectZones, useDrillStore } from '../store/drillStore'
import { usePlaybackStore } from '../store/playbackStore'
import { useToolStore } from '../store/toolStore'
import { LineHandles } from './FieldLines'
import { ZoneCornerHandles } from './FieldZones'
import { FieldView } from './FieldView'
import { SELECTION_COLOR } from './konvaUtils'
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
  /** Screen rotation of the field in degrees (portrait: -90) */
  rotation: number
}

interface PitchStageProps {
  dropTargetRef: RefObject<DropTarget | null>
}

/** CSS transform that shows the stage tilted like a TV camera view (same model as the export warp). */
function perspectiveStyle(width: number, height: number, tilt: number | null): CSSProperties | undefined {
  if (tilt === null || width <= 0 || height <= 0) return undefined
  const fit = fitProjected(width, height, tilt, width, height)
  return {
    transformOrigin: 'center center',
    transform: `translate(${fit.offsetX}px, ${fit.offsetY}px) scale(${fit.scale}) perspective(${cameraDistance(width, height)}px) rotateX(${tilt}deg)`,
  }
}

/** Konva stage that fills its container and scales the pitch to fit. */
export function PitchStage({ dropTargetRef }: PitchStageProps) {
  const fieldType = useDrillStore((s) => s.fieldType)
  const pitch = useDrillStore((s) => s.pitch)
  const addLine = useDrillStore((s) => s.addLine)
  const select = useDrillStore((s) => s.select)
  const selectedId = useDrillStore((s) => s.selectedId)
  const updateZone = useDrillStore((s) => s.updateZone)
  const sceneZones = useDrillStore(selectZones)
  const scenes = useDrillStore((s) => s.scenes)
  const sceneIndex = useDrillStore((s) => s.sceneIndex)
  const time = usePlaybackStore((s) => s.time)
  const perspective = usePerspectiveStore((s) => (s.enabled ? s.tilt : null))
  const tool = useToolStore((s) => s.tool)
  const lineColor = useToolStore((s) => s.lineColor)
  const linePattern = useToolStore((s) => s.linePattern)
  const lineWeight = useToolStore((s) => s.lineWeight)
  const numberSteps = useToolStore((s) => s.numberSteps)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [draft, setDraft] = useState<{ start: Point; end: Point } | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const transformerRef = useRef<Konva.Transformer>(null)
  /** Selection rectangle in container pixels while it is being dragged */
  const [marquee, setMarquee] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null)
  /** Size (meters) shown while a zone is being resized */
  const [resizeInfo, setResizeInfo] = useState<{ width: number; height: number } | null>(null)
  // Zoom belongs to one field type; switching the field type shows the whole field again.
  const [zoomState, setZoomState] = useState<{ key: string; view: ViewState } | null>(null)
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
  // Fitting and zooming work on the (possibly rotated) view of the field.
  const vr = viewRect(viewport, pitch.orientation)
  const baseLayout = fitViewport(vr, size.width, size.height, PADDING)
  const zoomCtx: ZoomContext = { viewport: vr, container: size, baseScale: baseLayout.scale }
  // Zoom belongs to one field type and orientation; switching shows the whole field again.
  const zoomKey = `${fieldType}-${pitch.orientation}`
  const view = zoomState?.key === zoomKey ? zoomState.view : defaultView(vr)
  const layout = baseLayout.scale > 0 ? zoomedLayout(view, zoomCtx) : baseLayout
  const setView = (next: ViewState) => setZoomState({ key: zoomKey, view: next })

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
  // The 3D view is for watching and presenting only; editing happens in the flat view.
  const locked = animating || perspective !== null
  const drawing = tool !== 'select' && !animating
  const frame = animating ? frameAt(scenes, time) : null
  const items = frame ? frame.items : scenes[sceneIndex].items
  const lines = frame ? frame.lines : scenes[sceneIndex].lines
  const zones = frame ? frame.zones : scenes[sceneIndex].zones
  const selectedZone =
    tool === 'select' && !animating ? sceneZones.find((z) => z.id === selectedId) : undefined
  const editingCornersId = useToolStore((s) => s.editingCornersId)
  const cornerMode = selectedZone !== undefined && editingCornersId === selectedZone.id
  const transformedZone = cornerMode ? undefined : selectedZone

  // Selecting something else ends corner editing.
  useEffect(() => {
    const { editingCornersId: editing, setEditingCornersId } = useToolStore.getState()
    if (editing && editing !== selectedId) setEditingCornersId(null)
  }, [selectedId])

  // Attach the resize/rotate handles to the selected zone's Konva node.
  useEffect(() => {
    const transformer = transformerRef.current
    if (!transformer) return
    const node = transformedZone ? stageRef.current?.findOne(`#${transformedZone.id}`) : undefined
    transformer.nodes(node ? [node] : [])
    transformer.getLayer()?.batchDraw()
  }, [transformedZone])

  function clientToMeters(clientX: number, clientY: number): Point | null {
    const el = containerRef.current
    if (!el || layout.scale <= 0) return null
    const rect = el.getBoundingClientRect()
    return fromView(pixelsToMeters(layout, vr, clientX - rect.left, clientY - rect.top), pitch.orientation)
  }

  useEffect(() => {
    dropTargetRef.current = {
      scale: layout.scale,
      rotation: viewRotation(pitch.orientation),
      toMeters: (clientX, clientY) => {
        const pos = clientToMeters(clientX, clientY)
        return perspective === null && pos && isInsideRect(viewport, pos.x, pos.y) ? pos : null
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
        key: zoomKey,
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

  /** Dragging on empty space spans a selection rectangle; a tap clears the selection. */
  function startMarquee(e: KonvaEventObject<PointerEvent>) {
    const el = containerRef.current
    if (!el) return
    cleanupRef.current?.()
    const rect = el.getBoundingClientRect()
    const additive = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey || useToolStore.getState().multiSelect
    const start = { x: e.evt.clientX - rect.left, y: e.evt.clientY - rect.top }
    let end = start
    const onMove = (ev: PointerEvent) => {
      end = { x: ev.clientX - rect.left, y: ev.clientY - rect.top }
      setMarquee({ x1: start.x, y1: start.y, x2: end.x, y2: end.y })
    }
    const onUp = () => {
      cleanup()
      if (Math.hypot(end.x - start.x, end.y - start.y) < 5) {
        if (!additive) select(null)
        return
      }
      // Convert all four corners, so the rectangle is right in portrait and when zoomed too.
      const corners = [
        [start.x, start.y],
        [end.x, start.y],
        [end.x, end.y],
        [start.x, end.y],
      ].map(([x, y]) => clientToMeters(x + rect.left, y + rect.top))
      if (corners.some((c) => c === null)) return
      const state = useDrillStore.getState()
      const ids = elementsInRect(currentScene(state), rectFromPoints(corners as Point[]))
      state.selectMany(additive ? [...new Set([...state.selectedIds, ...ids])] : ids)
    }
    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', cleanup)
      cleanupRef.current = null
      setMarquee(null)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', cleanup)
    cleanupRef.current = cleanup
  }

  function handlePointerDown(e: KonvaEventObject<PointerEvent>) {
    if (touchCountRef.current > 1 || perspective !== null) return
    const onEmptySpace = e.target === e.target.getStage()
    // Middle mouse button or space + drag move the view (anywhere, in every tool).
    if ((e.evt.pointerType === 'mouse' && e.evt.button === 1) || spaceKey.down) {
      spaceKey.usedForPan = spaceKey.down
      startPan(e)
      return
    }
    if (tool === 'select' || animating) {
      if (!onEmptySpace) return
      if (animating) return
      if (e.evt.pointerType !== 'mouse' || e.evt.button === 0) startMarquee(e)
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
      if (distance(start, end) >= MIN_LINE_LENGTH) {
        addLine(lineType, start, end, lineColor, {
          pattern: linePattern === 'auto' ? undefined : linePattern,
          weight: lineWeight,
          numbered: numberSteps,
        })
      }
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
      // Prevents the browser's auto-scroll when panning with the middle mouse button.
      onMouseDown={(e) => {
        if (e.button === 1) e.preventDefault()
      }}
      style={{ cursor: drawing ? 'crosshair' : undefined }}
    >
      {size.width > 0 && size.height > 0 && layout.scale > 0 && (
        <div className="h-full w-full" style={perspectiveStyle(size.width, size.height, perspective)}>
          <Stage ref={stageRef} width={size.width} height={size.height} onPointerDown={handlePointerDown}>
            <Layer>
              <FieldView
                fieldType={fieldType}
                pitch={pitch}
                items={items}
                lines={lines}
                zones={zones}
                viewport={viewport}
                scale={layout.scale}
                offsetX={layout.offsetX}
                offsetY={layout.offsetY}
                interactive={tool === 'select' && !locked}
              >
                {draft && tool !== 'select' && (
                  <LineShape
                    type={tool}
                    points={[draft.start, draft.end]}
                    smooth
                    pattern={linePattern === 'auto' ? defaultPattern(tool) : linePattern}
                    weight={lineWeight}
                    color={lineColor}
                    scale={layout.scale}
                    opacity={0.7}
                  />
                )}
                {tool === 'select' && !animating && <LineHandles scale={layout.scale} />}
                {cornerMode && selectedZone && <ZoneCornerHandles zone={selectedZone} scale={layout.scale} />}
              </FieldView>
              <Transformer
                ref={transformerRef}
                visible={transformedZone !== undefined}
                rotateEnabled
                flipEnabled={false}
                ignoreStroke
                keepRatio={false}
                anchorSize={14}
                anchorCornerRadius={3}
                rotateAnchorOffset={28}
                rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
                rotationSnapTolerance={6}
                borderStroke={SELECTION_COLOR}
                anchorStroke={SELECTION_COLOR}
                boundBoxFunc={(oldBox, newBox) =>
                  Math.abs(newBox.width) < MIN_ZONE_SIZE * layout.scale ||
                  Math.abs(newBox.height) < MIN_ZONE_SIZE * layout.scale
                    ? oldBox
                    : newBox
                }
                onTransform={(e) => {
                  if (!selectedZone) return
                  const extent = zoneExtent(selectedZone)
                  setResizeInfo({
                    width: extent.width * e.target.scaleX(),
                    height: extent.height * e.target.scaleY(),
                  })
                }}
                onTransformEnd={(e) => {
                  setResizeInfo(null)
                  if (!selectedZone) return
                  const node = e.target
                  const change = {
                    x: node.x(),
                    y: node.y(),
                    width: selectedZone.width * node.scaleX(),
                    height: selectedZone.height * node.scaleY(),
                    rotation: node.rotation(),
                    // Free corners stretch along with the zone.
                    corners:
                      selectedZone.corners?.map((p) => ({ x: p.x * node.scaleX(), y: p.y * node.scaleY() })) ?? null,
                  }
                  // The size is stored in meters; the node itself is never left scaled.
                  node.scale({ x: 1, y: 1 })
                  updateZone(selectedZone.id, change)
                }}
              />
            </Layer>
          </Stage>
        </div>
      )}
      {perspective !== null && (
        <div className="absolute inset-x-0 top-0 bottom-0 flex items-start justify-center p-3">
          <span className="pointer-events-none rounded-md bg-slate-900/85 px-3 py-1 text-sm text-slate-200">
            3D-Ansicht – zum Bearbeiten in der Zeitleiste ausschalten
          </span>
        </div>
      )}
      {marquee && (
        <div
          className="pointer-events-none absolute border border-sky-400 bg-sky-400/15"
          style={{
            left: Math.min(marquee.x1, marquee.x2),
            top: Math.min(marquee.y1, marquee.y2),
            width: Math.abs(marquee.x2 - marquee.x1),
            height: Math.abs(marquee.y2 - marquee.y1),
          }}
        />
      )}
      {resizeInfo && (
        <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-md bg-slate-900/85 px-3 py-1 text-sm text-white tabular-nums">
          {resizeInfo.width.toFixed(1).replace('.', ',')} × {resizeInfo.height.toFixed(1).replace('.', ',')} m
        </div>
      )}
      {layout.scale > 0 && perspective === null && (
        <ZoomControls
          zoom={view.zoom}
          onZoomIn={() => zoomByButton(BUTTON_ZOOM_FACTOR)}
          onZoomOut={() => zoomByButton(1 / BUTTON_ZOOM_FACTOR)}
          onFit={() => setView(defaultView(vr))}
        />
      )}
    </div>
  )
}
