import type Konva from 'konva'
import { useDrillStore } from '../store/drillStore'
import { cancelGroupDrag } from './groupDrag'

// The trash bin on the pitch: elements dropped on it are deleted. The bin is an HTML
// element above the canvas, so it never shows up in exports. The pointer position is
// tracked on the window because Konva keeps the drag going there (mouse and touch).

let bin: HTMLElement | null = null
let pointer: { x: number; y: number } | null = null

export function registerTrashBin(element: HTMLElement | null): void {
  bin = element
}

export function trackPointer(x: number, y: number): void {
  pointer = { x, y }
}

/** Is the pointer (in screen pixels) over the trash bin? Some room around it makes it easier to hit. */
export function isOverTrash(x = pointer?.x, y = pointer?.y, margin = 8): boolean {
  if (!bin || x === undefined || y === undefined) return false
  const r = bin.getBoundingClientRect()
  if (r.width === 0 || r.height === 0) return false
  return x >= r.left - margin && x <= r.right + margin && y >= r.top - margin && y <= r.bottom + margin
}

/**
 * Called at the end of an element drag: when it ends on the bin, the dragged element and
 * the elements dragged along with it are deleted (one undo step) and true is returned.
 */
export function dropOnTrash(node: Konva.Node, id: string): boolean {
  if (!isOverTrash()) return false
  const { selectedIds, deleteElements } = useDrillStore.getState()
  cancelGroupDrag()
  if (node.name() === 'line-group') node.position({ x: 0, y: 0 })
  deleteElements(selectedIds.includes(id) ? selectedIds : [id])
  return true
}
