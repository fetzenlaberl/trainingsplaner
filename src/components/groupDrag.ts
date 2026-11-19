import type Konva from 'konva'
import type { KonvaEventObject } from 'konva/lib/Node'
import { useDrillStore } from '../store/drillStore'
import { useToolStore } from '../store/toolStore'

// Dragging one of several selected elements moves the others along. During the drag
// only the Konva nodes move; the store is updated once at the end (one undo step).
// Every draggable element group carries its element id as Konva id; line groups are
// named "line-group" because they are drawn from their points at offset (0, 0).

interface GroupDragSession {
  ids: string[]
  leaderStart: { x: number; y: number }
  others: { node: Konva.Node; start: { x: number; y: number } }[]
}

let session: GroupDragSession | null = null

/** Starts a group drag if the dragged element is part of a multi-selection. */
export function beginGroupDrag(leader: Konva.Node, leaderId: string): boolean {
  const { selectedIds } = useDrillStore.getState()
  const stage = leader.getStage()
  if (!stage || selectedIds.length < 2 || !selectedIds.includes(leaderId)) {
    session = null
    return false
  }
  const others = selectedIds
    .filter((id) => id !== leaderId)
    .map((id) => stage.findOne(`#${id}`))
    .filter((node): node is Konva.Node => node !== undefined)
    .map((node) => ({ node, start: node.position() }))
  session = { ids: selectedIds, leaderStart: leader.position(), others }
  return true
}

export function updateGroupDrag(leader: Konva.Node): void {
  if (!session) return
  const dx = leader.x() - session.leaderStart.x
  const dy = leader.y() - session.leaderStart.y
  for (const { node, start } of session.others) node.position({ x: start.x + dx, y: start.y + dy })
}

/** Ends a group drag and stores the move; returns false if no group drag was running. */
export function endGroupDrag(leader: Konva.Node): boolean {
  if (!session) return false
  const { ids, leaderStart, others } = session
  session = null
  const dx = leader.x() - leaderStart.x
  const dy = leader.y() - leaderStart.y
  for (const node of [leader, ...others.map((o) => o.node)]) {
    if (node.name() === 'line-group') node.position({ x: 0, y: 0 })
  }
  useDrillStore.getState().moveElements(ids, dx, dy)
  return true
}

function isAdditive(evt: MouseEvent | PointerEvent | TouchEvent): boolean {
  const modifier = 'shiftKey' in evt && (evt.shiftKey || evt.ctrlKey || evt.metaKey)
  return modifier || useToolStore.getState().multiSelect
}

/**
 * Selection on pointer down: Shift/Ctrl (or "Mehrfach") adds or removes the element;
 * otherwise an unselected element becomes the only selection, while an already
 * selected one keeps the group so it can be dragged together.
 */
export function selectOnPointerDown(e: KonvaEventObject<PointerEvent>, id: string): void {
  const { selectedIds, select, toggleSelect } = useDrillStore.getState()
  if (isAdditive(e.evt)) toggleSelect(id)
  else if (!selectedIds.includes(id)) select(id)
}

/** A click without dragging on a member of a group selects only that element. */
export function selectOnClick(e: KonvaEventObject<MouseEvent | TouchEvent>, id: string): void {
  const { selectedIds, select } = useDrillStore.getState()
  if (!isAdditive(e.evt) && selectedIds.length > 1 && selectedIds.includes(id)) select(id)
}
