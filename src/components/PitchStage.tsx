import { useEffect, useRef, useState, type RefObject } from 'react'
import { Group, Layer, Stage } from 'react-konva'
import { getViewport } from '../field/dimensions'
import { fitViewport, isInsideRect, pixelsToMeters } from '../field/layout'
import { useDrillStore } from '../store/drillStore'
import { FieldItems } from './FieldItems'
import { Pitch } from './Pitch'

const PADDING = 12

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
  const containerRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

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

  const viewport = getViewport(fieldType)
  const layout = fitViewport(viewport, size.width, size.height, PADDING)

  useEffect(() => {
    dropTargetRef.current = {
      scale: layout.scale,
      toMeters: (clientX, clientY) => {
        const el = containerRef.current
        if (!el || layout.scale <= 0) return null
        const rect = el.getBoundingClientRect()
        const pos = pixelsToMeters(layout, viewport, clientX - rect.left, clientY - rect.top)
        return isInsideRect(viewport, pos.x, pos.y) ? pos : null
      },
    }
  })

  return (
    <div ref={containerRef} className="h-full w-full touch-none overflow-hidden">
      {size.width > 0 && size.height > 0 && layout.scale > 0 && (
        <Stage width={size.width} height={size.height}>
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
              <FieldItems viewport={viewport} scale={layout.scale} />
            </Group>
          </Layer>
        </Stage>
      )}
    </div>
  )
}
