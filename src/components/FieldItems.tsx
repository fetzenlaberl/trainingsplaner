import { useRef } from 'react'
import { Circle, Group, Line } from 'react-konva'
import type { Rect as ViewRect } from '../field/dimensions'
import { clampToRect } from '../field/layout'
import { ITEM_EXTENT, ROTATABLE_TYPES } from '../items/palette'
import type { Item } from '../model/types'
import { useDrillStore, type DrillContent } from '../store/drillStore'
import { useToolStore } from '../store/toolStore'
import { ItemShape } from './ItemShape'
import { SELECTION_COLOR, setCursor } from './konvaUtils'

/** Minimum grab radius in pixels so small items stay easy to touch. */
const MIN_HIT_RADIUS_PX = 18
/** Rotation snaps to multiples of this angle when close to it. */
const ROTATION_SNAP = 15
const ROTATION_SNAP_TOLERANCE = 4

interface FieldItemsProps {
  viewport: ViewRect
  /** Pixels per meter */
  scale: number
  /** When false (e.g. while a line tool is active), items cannot be selected or dragged. */
  interactive: boolean
}

function snapAngle(degrees: number): number {
  const snapped = Math.round(degrees / ROTATION_SNAP) * ROTATION_SNAP
  return Math.abs(snapped - degrees) <= ROTATION_SNAP_TOLERANCE ? snapped : degrees
}

/** All placed items; they can be selected, dragged and rotated. */
export function FieldItems({ viewport, scale, interactive }: FieldItemsProps) {
  const items = useDrillStore((s) => s.items)
  const selectedId = useDrillStore((s) => s.selectedId)
  const select = useDrillStore((s) => s.select)
  const moveItem = useDrillStore((s) => s.moveItem)
  const draggingId = useToolStore((s) => s.draggingId)
  const setDraggingId = useToolStore((s) => s.setDraggingId)

  const selectedItem = interactive ? items.find((i) => i.id === selectedId) : undefined

  return (
    <Group listening={interactive}>
      {items.map((item) => {
        const selected = item.id === selectedItem?.id
        return (
          <Group
            key={item.id}
            x={item.x}
            y={item.y}
            draggable={interactive}
            onPointerDown={() => select(item.id)}
            onMouseEnter={(e) => setCursor(e, 'grab')}
            onMouseLeave={(e) => setCursor(e, '')}
            onDragStart={() => {
              select(item.id)
              setDraggingId(item.id)
            }}
            onDragEnd={(e) => {
              setDraggingId(null)
              const pos = clampToRect(viewport, e.target.x(), e.target.y())
              e.target.position(pos)
              moveItem(item.id, pos.x, pos.y)
            }}
          >
            <Circle
              radius={Math.max(ITEM_EXTENT[item.type] / 2, MIN_HIT_RADIUS_PX / scale)}
              fill="transparent"
            />
            {selected && (
              <Circle
                radius={ITEM_EXTENT[item.type] / 2 + 0.3}
                stroke={SELECTION_COLOR}
                strokeWidth={Math.max(0.12, 2 / scale)}
                dash={[0.5, 0.35]}
                listening={false}
              />
            )}
            <ItemShape
              type={item.type}
              color={item.color}
              label={item.label}
              rotation={item.rotation}
            />
          </Group>
        )
      })}
      {selectedItem &&
        draggingId !== selectedItem.id &&
        ROTATABLE_TYPES.includes(selectedItem.type) && (
          <RotationHandle item={selectedItem} scale={scale} />
        )}
    </Group>
  )
}

/** A handle in the item's facing direction; dragging it around the item rotates it. */
function RotationHandle({ item, scale }: { item: Item; scale: number }) {
  const setItemRotation = useDrillStore((s) => s.setItemRotation)
  const snapshot = useDrillStore((s) => s.snapshot)
  const pushHistory = useDrillStore((s) => s.pushHistory)
  const beforeRef = useRef<DrillContent | null>(null)

  const distance = ITEM_EXTENT[item.type] / 2 + Math.max(0.8, 16 / scale)
  const radius = Math.max(0.35, 8 / scale)
  const rad = (item.rotation * Math.PI) / 180
  const hx = item.x + Math.cos(rad) * distance
  const hy = item.y + Math.sin(rad) * distance
  const strokeWidth = Math.max(0.08, 1.5 / scale)

  return (
    <Group>
      <Line
        points={[item.x, item.y, hx, hy]}
        stroke={SELECTION_COLOR}
        strokeWidth={strokeWidth}
        listening={false}
      />
      <Circle
        x={hx}
        y={hy}
        radius={radius}
        fill="#ffffff"
        stroke={SELECTION_COLOR}
        strokeWidth={strokeWidth * 1.5}
        hitStrokeWidth={radius * 2}
        draggable
        onMouseEnter={(e) => setCursor(e, 'alias')}
        onMouseLeave={(e) => setCursor(e, '')}
        onDragStart={() => {
          beforeRef.current = snapshot()
        }}
        onDragMove={(e) => {
          const angle = snapAngle(
            (Math.atan2(e.target.y() - item.y, e.target.x() - item.x) * 180) / Math.PI,
          )
          const a = (angle * Math.PI) / 180
          e.target.position({ x: item.x + Math.cos(a) * distance, y: item.y + Math.sin(a) * distance })
          setItemRotation(item.id, angle)
        }}
        onDragEnd={() => {
          if (beforeRef.current) pushHistory(beforeRef.current)
          beforeRef.current = null
        }}
      />
    </Group>
  )
}
