import type { KonvaEventObject } from 'konva/lib/Node'
import { Circle, Group } from 'react-konva'
import { controlFromMidpoint, curveMidpoint, distance } from '../lines/geometry'
import { useDrillStore } from '../store/drillStore'
import { LineShape } from './LineShape'

/** Snap back to a straight line when the handle is this close (meters) to the straight middle. */
const STRAIGHT_SNAP = 0.3

interface FieldLinesProps {
  /** Pixels per meter */
  scale: number
}

/** All drawn lines. */
export function FieldLines({ scale }: FieldLinesProps) {
  const lines = useDrillStore((s) => s.lines)
  return (
    <Group listening={false}>
      {lines.map((line) => (
        <LineShape key={line.id} {...line} scale={scale} />
      ))}
    </Group>
  )
}

function setCursor(e: KonvaEventObject<MouseEvent>, cursor: string) {
  const container = e.target.getStage()?.container()
  if (container) container.style.cursor = cursor
}

/** Round handles in the middle of each line; dragging one bends the line into a curve. */
export function CurveHandles({ scale }: FieldLinesProps) {
  const lines = useDrillStore((s) => s.lines)
  const setLineControl = useDrillStore((s) => s.setLineControl)
  const radius = Math.max(0.5, 9 / scale)

  return (
    <Group>
      {lines.map((line) => {
        const [start, end] = line.points
        const mid = curveMidpoint(start, end, line.control)
        return (
          <Circle
            key={line.id}
            name="curve-handle"
            x={mid.x}
            y={mid.y}
            radius={radius}
            fill="rgba(255,255,255,0.85)"
            stroke="#0f172a"
            strokeWidth={radius * 0.25}
            hitStrokeWidth={radius}
            draggable
            onMouseEnter={(e) => setCursor(e, 'move')}
            onMouseLeave={(e) => setCursor(e, '')}
            onDragMove={(e) => {
              const pos = { x: e.target.x(), y: e.target.y() }
              const straightMid = curveMidpoint(start, end, null)
              setLineControl(
                line.id,
                distance(pos, straightMid) < STRAIGHT_SNAP
                  ? null
                  : controlFromMidpoint(start, end, pos),
              )
            }}
            onDblClick={() => setLineControl(line.id, null)}
            onDblTap={() => setLineControl(line.id, null)}
          />
        )
      })}
    </Group>
  )
}
