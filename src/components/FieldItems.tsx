import { dropOnTrash } from './trashDrop'
import { useRef } from 'react'
import { Circle, Group, Line } from 'react-konva'
import type { Rect as ViewRect } from '../field/dimensions'
import { clampToRect } from '../field/layout'
import { ITEM_EXTENT, ROTATABLE_TYPES } from '../items/palette'
import type { Item } from '../model/types'
import { useDrillStore, type DrillContent } from '../store/drillStore'
import { useToolStore } from '../store/toolStore'
import { beginGroupDrag, endGroupDrag, selectOnClick, selectOnPointerDown, updateGroupDrag } from './groupDrag'
import { ItemShape } from './ItemShape'
import { cancelLongPress, startLongPress } from './longPress'
import { SELECTION_COLOR, setCursor } from './konvaUtils'

/** Minimum grab radius in pixels so small items stay easy to touch. */
const MIN_HIT_RADIUS_PX = 18
/** Rotation snaps to multiples of this angle when close to it. */
const ROTATION_SNAP = 15
const ROTATION_SNAP_TOLERANCE = 4

interface FieldItemsProps {
  /** Items to draw; opacity is used while fading in or out during the animation */
  items: (Item & { opacity?: number; glow?: number })[]
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
export function FieldItems({ items, viewport, scale, interactive }: FieldItemsProps) {
  const showLocked = useToolStore((s) => s.showLocked)
  const selectedId = useDrillStore((s) => s.selectedId)
  const selectedIds = useDrillStore((s) => s.selectedIds)
  const select = useDrillStore((s) => s.select)
  const moveItem = useDrillStore((s) => s.moveItem)
  const draggingId = useToolStore((s) => s.draggingId)
  const setDraggingId = useToolStore((s) => s.setDraggingId)

  const selectedItem = interactive ? items.find((i) => i.id === selectedId) : undefined

  return (
    <Group listening={interactive}>
      {items.map((item) => {
        const selected = interactive && selectedIds.includes(item.id)
        const extent = ITEM_EXTENT[item.type] * item.size
        return (
          <Group
            key={item.id}
            id={item.id}
            // Fixed elements let taps and drags go through to the pitch.
            listening={!item.locked || showLocked}
            x={item.x}
            y={item.y}
            // Fading in the animation; the own opacity only applies to the shape (not the selection ring).
            opacity={item.opacity ?? 1}
            draggable={interactive && !item.locked}
            onPointerDown={(e) => {
              selectOnPointerDown(e, item.id)
              if (e.evt.pointerType === 'touch') {
                startLongPress(e.evt, (x, y) => {
                  select(item.id)
                  useToolStore.getState().setQuickMenu({ itemId: item.id, x, y })
                })
              }
            }}
            onContextMenu={(e) => {
              e.evt.preventDefault()
              select(item.id)
              useToolStore.getState().setQuickMenu({ itemId: item.id, x: e.evt.clientX, y: e.evt.clientY })
            }}
            onClick={(e) => selectOnClick(e, item.id)}
            onTap={(e) => selectOnClick(e, item.id)}
            onDblClick={() => openTextEditor(item)}
            onDblTap={() => openTextEditor(item)}
            onMouseEnter={(e) => setCursor(e, 'grab')}
            onMouseLeave={(e) => setCursor(e, '')}
            onDragStart={(e) => {
              cancelLongPress()
              if (!useDrillStore.getState().selectedIds.includes(item.id)) select(item.id)
              setDraggingId(item.id)
              beginGroupDrag(e.target, item.id)
            }}
            onDragMove={(e) => updateGroupDrag(e.target)}
            onDragEnd={(e) => {
              setDraggingId(null)
              if (dropOnTrash(e.target, item.id)) return
              if (endGroupDrag(e.target)) return
              const pos = clampToRect(viewport, e.target.x(), e.target.y())
              e.target.position(pos)
              moveItem(item.id, pos.x, pos.y)
            }}
          >
            <Circle
              radius={Math.max(extent / 2, MIN_HIT_RADIUS_PX / scale)}
              fill="transparent"
            />
            {selected && (
              <Circle
                radius={extent / 2 + 0.3}
                stroke={SELECTION_COLOR}
                strokeWidth={Math.max(0.12, 2 / scale)}
                dash={[0.5, 0.35]}
                listening={false}
              />
            )}
            <Group scaleX={item.size} scaleY={item.size} opacity={item.alpha ?? 1}>
              <ItemShape
                type={item.type}
                color={item.color}
                label={item.label}
                rotation={item.rotation}
                shape={item.shape}
                facing={item.facing}
                pose={item.pose}
                box={item.box}
                lean={item.lean}
                name={item.name}
                glow={item.glow ?? (item.highlight ? 1 : 0)}
              />
            </Group>
          </Group>
        )
      })}
      {selectedItem &&
        !selectedItem.locked &&
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

  const distance = (ITEM_EXTENT[item.type] * item.size) / 2 + Math.max(0.8, 16 / scale)
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

/** Double click or double tap on a text or crest opens its input window. */
function openTextEditor(item: { id: string; type: string }) {
  if (item.type !== 'text' && item.type !== 'textbox' && item.type !== 'crest') return
  useToolStore.getState().setEditingContentId(item.id)
}
