import type { KonvaEventObject } from 'konva/lib/Node'
import { useRef } from 'react'
import { Circle, Group, Line as KonvaLine, Rect } from 'react-konva'
import { controlFromMidpoint, curveMidpoint, distance, flatten, samplePath } from '../lines/geometry'
import type { Line, Point } from '../model/types'
import { selectLines, useDrillStore, type DrillContent } from '../store/drillStore'
import { useToolStore } from '../store/toolStore'
import { SELECTION_COLOR, setCursor } from './konvaUtils'
import { LineShape } from './LineShape'

/** Snap back to a straight line when the handle is this close (meters) to the straight middle. */
const STRAIGHT_SNAP = 0.3

interface FieldLinesProps {
  lines: Line[]
  /** Pixels per meter */
  scale: number
  /** When false (e.g. while a line tool is active), lines cannot be selected or dragged. */
  interactive: boolean
}

/** All drawn lines; in select mode they can be selected and dragged as a whole. */
export function FieldLines({ lines, scale, interactive }: FieldLinesProps) {
  const selectedId = useDrillStore((s) => s.selectedId)
  const select = useDrillStore((s) => s.select)
  const moveLine = useDrillStore((s) => s.moveLine)
  const setDraggingId = useToolStore((s) => s.setDraggingId)

  return (
    <Group listening={interactive}>
      {lines.map((line) => {
        const path = flatten(samplePath(line.points[0], line.points[1], line.control))
        const selected = interactive && line.id === selectedId
        return (
          <Group
            key={line.id}
            draggable={interactive}
            onPointerDown={() => select(line.id)}
            onMouseEnter={(e) => setCursor(e, 'grab')}
            onMouseLeave={(e) => setCursor(e, '')}
            onDragStart={() => {
              select(line.id)
              setDraggingId(line.id)
            }}
            onDragEnd={(e) => {
              setDraggingId(null)
              const { x, y } = e.target.position()
              e.target.position({ x: 0, y: 0 })
              if (x !== 0 || y !== 0) moveLine(line.id, x, y)
            }}
          >
            {/* Invisible, wide stroke so thin lines are easy to hit */}
            <KonvaLine points={path} stroke="transparent" strokeWidth={0.01} hitStrokeWidth={Math.max(1, 18 / scale)} />
            {selected && (
              <KonvaLine
                points={path}
                stroke={SELECTION_COLOR}
                opacity={0.45}
                strokeWidth={Math.max(0.8, 8 / scale)}
                lineCap="round"
                lineJoin="round"
                listening={false}
              />
            )}
            <LineShape {...line} scale={scale} />
          </Group>
        )
      })}
    </Group>
  )
}

/** Handles of the selected line: start, end (squares) and bend handle (circle). */
export function LineHandles({ scale }: { scale: number }) {
  const line = useDrillStore((s) => selectLines(s).find((l) => l.id === s.selectedId))
  const draggingId = useToolStore((s) => s.draggingId)
  if (!line || draggingId === line.id) return null
  return <SelectedLineHandles line={line} scale={scale} />
}

function SelectedLineHandles({ line, scale }: { line: Line; scale: number }) {
  const setLinePoint = useDrillStore((s) => s.setLinePoint)
  const setLineControl = useDrillStore((s) => s.setLineControl)
  const snapshot = useDrillStore((s) => s.snapshot)
  const pushHistory = useDrillStore((s) => s.pushHistory)
  const beforeRef = useRef<DrillContent | null>(null)

  const [start, end] = line.points
  const mid = curveMidpoint(start, end, line.control)
  const size = Math.max(0.5, 9 / scale)
  const strokeWidth = size * 0.25

  const beginEdit = () => {
    beforeRef.current = snapshot()
  }
  const endEdit = () => {
    if (beforeRef.current) pushHistory(beforeRef.current)
    beforeRef.current = null
  }
  const position = (e: KonvaEventObject<DragEvent>): Point => ({ x: e.target.x(), y: e.target.y() })
  const straighten = () => {
    const before = snapshot()
    setLineControl(line.id, null)
    pushHistory(before)
  }

  const common = {
    fill: '#ffffff',
    stroke: '#0f172a',
    strokeWidth,
    hitStrokeWidth: size,
    draggable: true,
    onMouseEnter: (e: KonvaEventObject<MouseEvent>) => setCursor(e, 'move'),
    onMouseLeave: (e: KonvaEventObject<MouseEvent>) => setCursor(e, ''),
    onDragStart: beginEdit,
    onDragEnd: endEdit,
  }

  return (
    <Group>
      {([0, 1] as const).map((index) => (
        <Rect
          key={index}
          {...common}
          x={line.points[index].x}
          y={line.points[index].y}
          width={size * 1.6}
          height={size * 1.6}
          offsetX={size * 0.8}
          offsetY={size * 0.8}
          onDragMove={(e) => setLinePoint(line.id, index, position(e))}
        />
      ))}
      <Circle
        {...common}
        x={mid.x}
        y={mid.y}
        radius={size}
        onDragMove={(e) => {
          const pos = position(e)
          setLineControl(
            line.id,
            distance(pos, curveMidpoint(start, end, null)) < STRAIGHT_SNAP
              ? null
              : controlFromMidpoint(start, end, pos),
          )
        }}
        onDblClick={straighten}
        onDblTap={straighten}
      />
    </Group>
  )
}
