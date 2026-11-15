import { useEffect, useRef, useState } from 'react'
import { Group, Layer, Stage } from 'react-konva'
import { getViewport } from '../field/dimensions'
import { fitViewport } from '../field/layout'
import { useFieldStore } from '../store/fieldStore'
import { Pitch } from './Pitch'

const PADDING = 12

/** Konva stage that fills its container and scales the pitch to fit. */
export function PitchStage() {
  const fieldType = useFieldStore((s) => s.fieldType)
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

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden">
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
            </Group>
          </Layer>
        </Stage>
      )}
    </div>
  )
}
