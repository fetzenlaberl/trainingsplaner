import { useRef, useState } from 'react'
import { Circle, Group, Line } from 'react-konva'
import type { Rect as ViewRect } from '../field/dimensions'
import { clampToRect } from '../field/layout'
import { edgeMidpoints, insertCorner, MAX_CORNERS, MIN_CORNERS, removeCorner, zoneCorners } from '../items/zones'
import type { Point, Zone } from '../model/types'
import { useDrillStore, type DrillContent } from '../store/drillStore'
import { useToolStore } from '../store/toolStore'
import { SELECTION_COLOR, setCursor } from './konvaUtils'
import { ZoneShape } from './ZoneShape'

interface FieldZonesProps {
  /** Zones to draw; opacity is used while fading in or out during the animation */
  zones: (Zone & { opacity?: number })[]
  viewport: ViewRect
  /** Pixels per meter */
  scale: number
  /** When false (line tools, playback, export), zones cannot be selected or moved. */
  interactive: boolean
}

/**
 * Marked areas below lines and items. Each zone group has the zone id as Konva id,
 * so the editor can attach its resize/rotate handles to it.
 */
export function FieldZones({ zones, viewport, scale, interactive }: FieldZonesProps) {
  const select = useDrillStore((s) => s.select)
  const updateZone = useDrillStore((s) => s.updateZone)
  const setDraggingId = useToolStore((s) => s.setDraggingId)

  return (
    <Group listening={interactive}>
      {zones.map((zone) => (
        <Group
          key={zone.id}
          id={zone.id}
          x={zone.x}
          y={zone.y}
          rotation={zone.rotation}
          opacity={zone.opacity ?? 1}
          draggable={interactive}
          onPointerDown={() => select(zone.id)}
          onMouseEnter={(e) => setCursor(e, 'grab')}
          onMouseLeave={(e) => setCursor(e, '')}
          onDragStart={() => {
            select(zone.id)
            setDraggingId(zone.id)
          }}
          onDragEnd={(e) => {
            setDraggingId(null)
            const pos = clampToRect(viewport, e.target.x(), e.target.y())
            e.target.position(pos)
            updateZone(zone.id, pos)
          }}
        >
          <ZoneShape {...zone} scale={scale} />
        </Group>
      ))}
    </Group>
  )
}

function rotate(p: Point, degrees: number): Point {
  const rad = (degrees * Math.PI) / 180
  return { x: p.x * Math.cos(rad) - p.y * Math.sin(rad), y: p.x * Math.sin(rad) + p.y * Math.cos(rad) }
}

/**
 * Handles on every corner of a zone (drag to move, double-tap to remove) and "+" handles on
 * every edge (drag to add a corner there), for rhombus, trapezoid or any other outline.
 */
export function ZoneCornerHandles({ zone, scale }: { zone: Zone; scale: number }) {
  const setZoneLive = useDrillStore((s) => s.setZoneLive)
  const snapshot = useDrillStore((s) => s.snapshot)
  const pushHistory = useDrillStore((s) => s.pushHistory)
  const beforeRef = useRef<DrillContent | null>(null)
  /** Edge whose "+" handle is being dragged; its new corner sits at index edge + 1 */
  const [insertingEdge, setInsertingEdge] = useState<number | null>(null)
  const radius = Math.max(0.5, 9 / scale)
  const corners = zoneCorners(zone)
  const toWorld = (p: Point): Point => {
    const r = rotate(p, zone.rotation)
    return { x: zone.x + r.x, y: zone.y + r.y }
  }
  // Back from the field into the zone's own (unrotated) coordinates.
  const toLocal = (x: number, y: number): Point => rotate({ x: x - zone.x, y: y - zone.y }, -zone.rotation)

  // "+" handles in the middle of every edge (also the closing edge back to the first corner).
  const plusHandles =
    insertingEdge !== null
      ? [{ edge: insertingEdge, at: corners[insertingEdge + 1] }]
      : corners.length >= MAX_CORNERS
        ? []
        : edgeMidpoints(corners).flatMap((at, edge) => {
            const next = corners[(edge + 1) % corners.length]
            const tooShort = Math.hypot(next.x - corners[edge].x, next.y - corners[edge].y) * scale < 40
            return tooShort ? [] : [{ edge, at }]
          })

  return (
    <Group>
      {plusHandles.map(({ edge, at }) => {
        const world = toWorld(at)
        return (
          <Group
            key={`plus-${edge}`}
            x={world.x}
            y={world.y}
            draggable
            onMouseEnter={(e) => setCursor(e, 'copy')}
            onMouseLeave={(e) => setCursor(e, '')}
            onDragStart={(e) => {
              beforeRef.current = snapshot()
              setZoneLive(zone.id, { corners: insertCorner(corners, edge, toLocal(e.target.x(), e.target.y())) })
              setInsertingEdge(edge)
            }}
            onDragMove={(e) => {
              const next = corners.map((p, i) => (i === edge + 1 ? toLocal(e.target.x(), e.target.y()) : p))
              setZoneLive(zone.id, { corners: next })
            }}
            onDragEnd={() => {
              if (beforeRef.current) pushHistory(beforeRef.current)
              beforeRef.current = null
              setInsertingEdge(null)
            }}
          >
            <Circle
              radius={radius * 0.75}
              fill={SELECTION_COLOR}
              opacity={0.85}
              stroke="#0f172a"
              strokeWidth={radius * 0.12}
              hitStrokeWidth={radius}
            />
            {insertingEdge === null && (
              <Line
                points={[-radius * 0.4, 0, radius * 0.4, 0, 0, 0, 0, -radius * 0.4, 0, radius * 0.4]}
                stroke="#0f172a"
                strokeWidth={radius * 0.2}
                listening={false}
              />
            )}
          </Group>
        )
      })}
      {corners.map((corner, index) => {
        const world = rotate(corner, zone.rotation)
        const remove = () => {
          if (corners.length <= MIN_CORNERS) return
          const before = snapshot()
          setZoneLive(zone.id, { corners: removeCorner(corners, index) })
          pushHistory(before)
        }
        return (
          <Circle
            key={index}
            onDblClick={remove}
            onDblTap={remove}
            x={zone.x + world.x}
            y={zone.y + world.y}
            radius={radius}
            fill="#ffffff"
            stroke={SELECTION_COLOR}
            strokeWidth={radius * 0.3}
            hitStrokeWidth={radius}
            draggable
            onMouseEnter={(e) => setCursor(e, 'move')}
            onMouseLeave={(e) => setCursor(e, '')}
            onDragStart={() => {
              beforeRef.current = snapshot()
            }}
            onDragMove={(e) => {
              const next = corners.map((p, i) => (i === index ? toLocal(e.target.x(), e.target.y()) : p))
              setZoneLive(zone.id, { corners: next })
            }}
            onDragEnd={() => {
              if (beforeRef.current) pushHistory(beforeRef.current)
              beforeRef.current = null
            }}
          />
        )
      })}
    </Group>
  )
}
