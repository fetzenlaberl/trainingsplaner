// Right click with the mouse: the menu belongs to the element under the pressed button. Selecting it
// opens the selection bar, which moves the pitch away under the mouse before "contextmenu" is sent.

/** Moving the mouse further than this (pixels) while pressed is not a click. */
const MOVE_TOLERANCE = 8

let cancelCurrent: (() => void) | null = null

/** Calls `onRightClick` when the right button, just pressed, brings up the context menu. */
export function startRightPress(evt: PointerEvent, onRightClick: (clientX: number, clientY: number) => void): void {
  cancelCurrent?.()
  const start = { x: evt.clientX, y: evt.clientY }
  const onMenu = (e: MouseEvent) => {
    cleanup()
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_TOLERANCE) return
    // Neither the browser menu nor another element that is now below the mouse.
    e.preventDefault()
    e.stopPropagation()
    onRightClick(start.x, start.y)
  }
  // A press without a menu ends with the next press.
  const onPointerDown = (e: PointerEvent) => {
    if (e !== evt) cleanup()
  }
  const cleanup = () => {
    window.removeEventListener('contextmenu', onMenu, true)
    window.removeEventListener('pointerdown', onPointerDown, true)
    cancelCurrent = null
  }
  window.addEventListener('contextmenu', onMenu, true)
  window.addEventListener('pointerdown', onPointerDown, true)
  cancelCurrent = cleanup
}
