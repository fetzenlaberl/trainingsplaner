import { useRef } from 'react'
import { Circle, Group } from 'react-konva'
import type { Rect as ViewRect } from '../field/dimensions'
import { clampToRect } from '../field/layout'
import { zoneCorners } from '../items/zones'
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

/** Handles on every corner of a zone; dragging one makes the shape uneven (rhombus, trapezoid …). */
export function ZoneCornerHandles({ zone, scale }: { zone: Zone; scale: number }) {
  const setZoneLive = useDrillStore((s) => s.setZoneLive)
  const snapshot = useDrillStore((s) => s.snapshot)
  const pushHistory = useDrillStore((s) => s.pushHistory)
  const beforeRef = useRef<DrillContent | null>(null)
  const radius = Math.max(0.5, 9 / scale)
  const corners = zoneCorners(zone)

  return (
    <Group>
      {corners.map((corner, index) => {
        const world = rotate(corner, zone.rotation)
        return (
          <Circle
            key={index}
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
              // Back from the field into the zone's own (unrotated) coordinates.
              const local = rotate({ x: e.target.x() - zone.x, y: e.target.y() - zone.y }, -zone.rotation)
              const next = corners.map((p, i) => (i === index ? local : p))
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
