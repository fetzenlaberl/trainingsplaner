// Long press on touch screens: holding a finger still for a moment opens the quick menu.

const LONG_PRESS_MS = 550
/** Moving the finger further than this (pixels) is a drag, not a long press. */
const MOVE_TOLERANCE = 8

let cancelCurrent: (() => void) | null = null

/** Calls `onLongPress` if the pointer stays down and still long enough. */
export function startLongPress(evt: PointerEvent, onLongPress: (clientX: number, clientY: number) => void): void {
  cancelLongPress()
  const start = { x: evt.clientX, y: evt.clientY }
  const timer = window.setTimeout(() => {
    cleanup()
    onLongPress(start.x, start.y)
  }, LONG_PRESS_MS)
  const onMove = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_TOLERANCE) cleanup()
  }
  const cleanup = () => {
    window.clearTimeout(timer)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', cleanup)
    window.removeEventListener('pointercancel', cleanup)
    cancelCurrent = null
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', cleanup)
  window.addEventListener('pointercancel', cleanup)
  cancelCurrent = cleanup
}

/** Stops a pending long press (e.g. when a drag starts). */
export function cancelLongPress(): void {
  cancelCurrent?.()
}
