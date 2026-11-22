import { useContext, useRef } from 'react'
import { Circle, Group, Line, Rect } from 'react-konva'
import { rememberStyle } from '../items/rememberedStyle'
import { textAreaFromCorner } from '../items/textBoxGeometry'
import { MAX_TAIL_TIP, MAX_TEXTBOX_H, MAX_TEXTBOX_W, MIN_TEXTBOX_W, type TextBoxStyle } from '../items/textBoxStyle'
import type { Item } from '../model/types'
import { currentScene, useDrillStore, type DrillContent } from '../store/drillStore'
import { SELECTION_COLOR, setCursor } from './konvaUtils'
import { textBoxLayout } from './textBoxLayout'
import { ViewRotationContext } from './viewRotationContext'

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Handles of a selected text box or speech bubble: the corner sets its width and height,
 * the round handle at the tip of the tail moves the tip freely (e.g. onto a player).
 */
export function TextBoxHandles({ item, scale }: { item: Item; scale: number }) {
  const setTextBoxStyleLive = useDrillStore((s) => s.setTextBoxStyleLive)
  const snapshot = useDrillStore((s) => s.snapshot)
  const pushHistory = useDrillStore((s) => s.pushHistory)
  const beforeRef = useRef<DrillContent | null>(null)
  // The box is drawn turned by its rotation and kept upright against the view (see ItemShape).
  const angle = ((item.rotation - useContext(ViewRotationContext)) * Math.PI) / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const toField = (lx: number, ly: number) => ({
    x: item.x + (lx * cos - ly * sin) * item.size,
    y: item.y + (lx * sin + ly * cos) * item.size,
  })
  const toLocal = (fx: number, fy: number) => {
    const dx = (fx - item.x) / item.size
    const dy = (fy - item.y) / item.size
    return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos }
  }

  const layout = textBoxLayout(item.label, item.box)
  const corner = toField(layout.body.rx, layout.body.ry)
  const tip = layout.tail ? toField(layout.tail.tip.x, layout.tail.tip.y) : null
  const radius = Math.max(0.35, 8 / scale)
  const strokeWidth = Math.max(0.08, 1.5 / scale)

  const begin = () => {
    beforeRef.current = snapshot()
  }
  const finish = () => {
    if (beforeRef.current) pushHistory(beforeRef.current)
    beforeRef.current = null
    // The next text box from the same sidebar entry starts like this one.
    const now = currentScene(useDrillStore.getState()).items.find((i) => i.id === item.id)
    if (now) rememberStyle(now, { box: now.box ?? null })
  }
  const change = (c: Partial<TextBoxStyle>) => setTextBoxStyleLive(item.id, c)

  return (
    <Group>
      <Rect
        x={corner.x}
        y={corner.y}
        width={radius * 1.7}
        height={radius * 1.7}
        offsetX={radius * 0.85}
        offsetY={radius * 0.85}
        rotation={(angle * 180) / Math.PI}
        fill="#ffffff"
        stroke={SELECTION_COLOR}
        strokeWidth={strokeWidth * 1.5}
        hitStrokeWidth={radius * 2}
        draggable
        onMouseEnter={(e) => setCursor(e, 'nwse-resize')}
        onMouseLeave={(e) => setCursor(e, '')}
        onDragStart={begin}
        onDragMove={(e) => {
          const local = toLocal(e.target.x(), e.target.y())
          const area = textAreaFromCorner(layout.body.shape, Math.max(0.5, local.x), Math.max(0.2, local.y), layout.fontFactor)
          change({
            w: Math.round(clamp(area.w, MIN_TEXTBOX_W, MAX_TEXTBOX_W) * 10) / 10,
            h: Math.round(clamp(area.h, 0, MAX_TEXTBOX_H) * 10) / 10,
          })
        }}
        onDragEnd={finish}
      />
      {tip && (
        <>
          <Line points={[item.x, item.y, tip.x, tip.y]} stroke={SELECTION_COLOR} strokeWidth={strokeWidth} dash={[0.4, 0.3]} listening={false} />
          <Circle
            x={tip.x}
            y={tip.y}
            radius={radius}
            fill="#f97316"
            stroke="#ffffff"
            strokeWidth={strokeWidth * 1.5}
            hitStrokeWidth={radius * 2}
            draggable
            onMouseEnter={(e) => setCursor(e, 'move')}
            onMouseLeave={(e) => setCursor(e, '')}
            onDragStart={begin}
            onDragMove={(e) => {
              const local = toLocal(e.target.x(), e.target.y())
              change({
                tailTip: {
                  x: Math.round(clamp(local.x, -MAX_TAIL_TIP, MAX_TAIL_TIP) * 100) / 100,
                  y: Math.round(clamp(local.y, -MAX_TAIL_TIP, MAX_TAIL_TIP) * 100) / 100,
                },
              })
            }}
            onDragEnd={finish}
          />
        </>
      )}
    </Group>
  )
}
