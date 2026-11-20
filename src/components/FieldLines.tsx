import type { KonvaEventObject } from 'konva/lib/Node'
import { isFreehand } from '../lines/freehand'
import { useRef, useState } from 'react'
import { Circle, Group, Line as KonvaLine, Rect } from 'react-konva'
import { distance, flatten, pointOnSegment, samplePath } from '../lines/geometry'
import type { Line, Point } from '../model/types'
import { selectLines, useDrillStore, type DrillContent } from '../store/drillStore'
import { useToolStore } from '../store/toolStore'
import { SELECTION_COLOR, setCursor } from './konvaUtils'
import { beginGroupDrag, endGroupDrag, selectOnClick, selectOnPointerDown, updateGroupDrag } from './groupDrag'
import { LineShape } from './LineShape'

/** Segments shorter than this on screen get no "+" handle (it would cover the waypoints). */
const MIN_SEGMENT_PX_FOR_PLUS = 40

interface FieldLinesProps {
  lines: Line[]
  /** Pixels per meter */
  scale: number
  /** When false (e.g. while a line tool is active), lines cannot be selected or dragged. */
  interactive: boolean
}

/** All drawn lines; in select mode they can be selected and dragged as a whole. */
export function FieldLines({ lines, scale, interactive }: FieldLinesProps) {
  const selectedIds = useDrillStore((s) => s.selectedIds)
  const select = useDrillStore((s) => s.select)
  const moveLine = useDrillStore((s) => s.moveLine)
  const setDraggingId = useToolStore((s) => s.setDraggingId)

  return (
    <Group listening={interactive}>
      {lines.map((line) => {
        const path = flatten(samplePath(line.points, line.smooth))
        const selected = interactive && selectedIds.includes(line.id)
        return (
          <Group
            key={line.id}
            id={line.id}
            name="line-group"
            draggable={interactive}
            onPointerDown={(e) => selectOnPointerDown(e, line.id)}
            onClick={(e) => selectOnClick(e, line.id)}
            onTap={(e) => selectOnClick(e, line.id)}
            onMouseEnter={(e) => setCursor(e, 'grab')}
            onMouseLeave={(e) => setCursor(e, '')}
            onDragStart={(e) => {
              if (!useDrillStore.getState().selectedIds.includes(line.id)) select(line.id)
              setDraggingId(line.id)
              beginGroupDrag(e.target, line.id)
            }}
            onDragMove={(e) => updateGroupDrag(e.target)}
            onDragEnd={(e) => {
              setDraggingId(null)
              if (endGroupDrag(e.target)) return
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

/** Handles of the selected line: waypoints (squares at the ends, circles at bends) and "+" handles. */
export function LineHandles({ scale }: { scale: number }) {
  const line = useDrillStore((s) => selectLines(s).find((l) => l.id === s.selectedId))
  const draggingId = useToolStore((s) => s.draggingId)
  // Freehand strokes have too many points for handles; they are moved as a whole.
  if (!line || draggingId === line.id || isFreehand(line.type)) return null
  return <SelectedLineHandles line={line} scale={scale} />
}

function SelectedLineHandles({ line, scale }: { line: Line; scale: number }) {
  const setLinePoint = useDrillStore((s) => s.setLinePoint)
  const insertLinePoint = useDrillStore((s) => s.insertLinePoint)
  const removeLinePoint = useDrillStore((s) => s.removeLinePoint)
  const snapshot = useDrillStore((s) => s.snapshot)
  const pushHistory = useDrillStore((s) => s.pushHistory)
  const beforeRef = useRef<DrillContent | null>(null)
  /** Segment whose "+" handle is being dragged; its new waypoint is at index segment + 1 */
  const [insertingSegment, setInsertingSegment] = useState<number | null>(null)

  const size = Math.max(0.5, 9 / scale)
  const strokeWidth = size * 0.25
  const lastIndex = line.points.length - 1

  const beginEdit = () => {
    beforeRef.current = snapshot()
  }
  const endEdit = () => {
    if (beforeRef.current) pushHistory(beforeRef.current)
    beforeRef.current = null
  }
  const position = (e: KonvaEventObject<DragEvent>): Point => ({ x: e.target.x(), y: e.target.y() })
  const cursor = {
    onMouseEnter: (e: KonvaEventObject<MouseEvent>) => setCursor(e, 'move'),
    onMouseLeave: (e: KonvaEventObject<MouseEvent>) => setCursor(e, ''),
  }
  const waypointStyle = { fill: '#ffffff', stroke: '#0f172a', strokeWidth, hitStrokeWidth: size }

  // "+" handles in the middle of each segment that is long enough on screen.
  const plusHandles = line.points.slice(0, -1).flatMap((point, i) => {
    if (insertingSegment !== null) {
      return insertingSegment === i ? [{ segment: i, at: line.points[i + 1] }] : []
    }
    const tooShort = distance(point, line.points[i + 1]) * scale < MIN_SEGMENT_PX_FOR_PLUS
    return tooShort ? [] : [{ segment: i, at: pointOnSegment(line.points, line.smooth, i, 0.5) }]
  })

  return (
    <Group>
      {plusHandles.map(({ segment, at }) => (
        <Group
          key={`plus-${segment}`}
          x={at.x}
          y={at.y}
          draggable
          {...cursor}
          onDragStart={(e) => {
            beginEdit()
            insertLinePoint(line.id, segment + 1, position(e))
            setInsertingSegment(segment)
          }}
          onDragMove={(e) => setLinePoint(line.id, segment + 1, position(e))}
          onDragEnd={() => {
            endEdit()
            setInsertingSegment(null)
          }}
        >
          <Circle radius={size * 0.75} fill={SELECTION_COLOR} opacity={0.85} hitStrokeWidth={size} stroke="#0f172a" strokeWidth={strokeWidth * 0.6} />
          {insertingSegment === null && (
            <KonvaLine
              points={[-size * 0.4, 0, size * 0.4, 0, 0, 0, 0, -size * 0.4, 0, size * 0.4]}
              stroke="#0f172a"
              strokeWidth={strokeWidth}
              listening={false}
            />
          )}
        </Group>
      ))}
      {line.points.map((point, index) => {
        const isEnd = index === 0 || index === lastIndex
        const drag = {
          draggable: true,
          ...cursor,
          onDragStart: beginEdit,
          onDragEnd: endEdit,
          onDragMove: (e: KonvaEventObject<DragEvent>) => setLinePoint(line.id, index, position(e)),
        }
        return isEnd ? (
          <Rect
            key={`pt-${index}`}
            {...waypointStyle}
            {...drag}
            x={point.x}
            y={point.y}
            width={size * 1.6}
            height={size * 1.6}
            offsetX={size * 0.8}
            offsetY={size * 0.8}
          />
        ) : (
          <Circle
            key={`pt-${index}`}
            {...waypointStyle}
            {...drag}
            x={point.x}
            y={point.y}
            radius={size}
            onDblClick={() => removeLinePoint(line.id, index)}
            onDblTap={() => removeLinePoint(line.id, index)}
          />
        )
      })}
    </Group>
  )
}
