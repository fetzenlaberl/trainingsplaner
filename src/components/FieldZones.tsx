import { Group } from 'react-konva'
import type { Rect as ViewRect } from '../field/dimensions'
import { clampToRect } from '../field/layout'
import type { Zone } from '../model/types'
import { useDrillStore } from '../store/drillStore'
import { useToolStore } from '../store/toolStore'
import { setCursor } from './konvaUtils'
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
