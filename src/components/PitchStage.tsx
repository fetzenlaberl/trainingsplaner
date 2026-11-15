import type { KonvaEventObject } from 'konva/lib/Node'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Group, Layer, Stage } from 'react-konva'
import { getViewport } from '../field/dimensions'
import { clampToRect, fitViewport, isInsideRect, pixelsToMeters } from '../field/layout'
import { distance } from '../lines/geometry'
import type { Point } from '../model/types'
import { useDrillStore } from '../store/drillStore'
import { useToolStore } from '../store/toolStore'
import { CurveHandles, FieldLines } from './FieldLines'
import { FieldItems } from './FieldItems'
import { LineShape } from './LineShape'
import { Pitch } from './Pitch'

const PADDING = 12
/** Shorter strokes (meters) are treated as accidental taps. */
const MIN_LINE_LENGTH = 0.5

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
  const addLine = useDrillStore((s) => s.addLine)
  const tool = useToolStore((s) => s.tool)
  const lineColor = useToolStore((s) => s.lineColor)
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [draft, setDraft] = useState<{ start: Point; end: Point } | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

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
  const layout = fitViewport(viewport, size.width, size.height, PADDING)
  const drawing = tool !== 'select'

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

  function startLine(e: KonvaEventObject<PointerEvent>) {
    if (tool === 'select' || e.target.name() === 'curve-handle') return
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
      className="h-full w-full touch-none overflow-hidden"
      style={{ cursor: drawing ? 'crosshair' : undefined }}
    >
      {size.width > 0 && size.height > 0 && layout.scale > 0 && (
        <Stage width={size.width} height={size.height} onPointerDown={startLine}>
          <Layer>
            <Group
              x={layout.offsetX - viewport.x * layout.scale}
              y={layout.offsetY - viewport.y * layout.scale}
              scaleX={layout.scale}
              scaleY={layout.scale}
              clipX={viewport.x}
              clipY={viewport.y}
              clipWidth={viewport.width}
              clipHeight={viewport.height}
            >
              <Pitch fieldType={fieldType} viewport={viewport} scale={layout.scale} />
              <FieldLines scale={layout.scale} />
              <FieldItems viewport={viewport} scale={layout.scale} interactive={!drawing} />
              {draft && tool !== 'select' && (
                <LineShape
                  type={tool}
                  points={[draft.start, draft.end]}
                  control={null}
                  color={lineColor}
                  scale={layout.scale}
                  opacity={0.7}
                />
              )}
              {drawing && !draft && <CurveHandles scale={layout.scale} />}
            </Group>
          </Layer>
        </Stage>
      )}
    </div>
  )
}
