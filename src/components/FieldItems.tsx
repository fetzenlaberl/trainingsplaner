import type { KonvaEventObject } from 'konva/lib/Node'
import { Circle, Group } from 'react-konva'
import type { Rect as ViewRect } from '../field/dimensions'
import { clampToRect } from '../field/layout'
import { ITEM_EXTENT } from '../items/palette'
import { useDrillStore } from '../store/drillStore'
import { ItemShape } from './ItemShape'

/** Minimum grab radius in pixels so small items stay easy to touch. */
const MIN_HIT_RADIUS_PX = 18

interface FieldItemsProps {
  viewport: ViewRect
  /** Pixels per meter */
  scale: number
  /** When false (e.g. while a line tool is active), items cannot be dragged. */
  interactive: boolean
}

function setCursor(e: KonvaEventObject<MouseEvent>, cursor: string) {
  const container = e.target.getStage()?.container()
  if (container) container.style.cursor = cursor
}

/** All placed items; each can be dragged to a new position. */
export function FieldItems({ viewport, scale, interactive }: FieldItemsProps) {
  const items = useDrillStore((s) => s.items)
  const moveItem = useDrillStore((s) => s.moveItem)

  return (
    <Group listening={interactive}>
      {items.map((item) => (
        <Group
          key={item.id}
          x={item.x}
          y={item.y}
          draggable={interactive}
          onMouseEnter={(e) => setCursor(e, 'grab')}
          onMouseLeave={(e) => setCursor(e, '')}
          onDragEnd={(e) => {
            const pos = clampToRect(viewport, e.target.x(), e.target.y())
            e.target.position(pos)
            moveItem(item.id, pos.x, pos.y)
          }}
        >
          <Circle
            radius={Math.max(ITEM_EXTENT[item.type] / 2, MIN_HIT_RADIUS_PX / scale)}
            fill="transparent"
          />
          <ItemShape
            type={item.type}
            color={item.color}
            label={item.label}
            rotation={item.rotation}
          />
        </Group>
      ))}
    </Group>
  )
}
