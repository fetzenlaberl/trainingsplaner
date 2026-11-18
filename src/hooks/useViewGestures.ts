import { useEffect, useRef, type RefObject } from 'react'
import { panBy, zoomAround, type ViewState, type ZoomContext } from '../field/zoom'

/** Wheel sensitivity: zoom factor per pixel of wheel movement */
const WHEEL_ZOOM_SPEED = 0.0015

export interface ViewGestureState {
  view: ViewState
  ctx: ZoomContext
}

/**
 * Mouse wheel zoom and two-finger pinch/pan on the pitch container.
 * Returns the number of fingers currently touching the container.
 */
export function useViewGestures(
  containerRef: RefObject<HTMLDivElement | null>,
  latestRef: RefObject<ViewGestureState | null>,
  setView: (view: ViewState) => void,
  /** Called when a second finger touches down, e.g. to cancel a line being drawn */
  onPinchStart: () => void,
): RefObject<number> {
  const touchCountRef = useRef(0)
  const callbacksRef = useRef({ setView, onPinchStart })

  useEffect(() => {
    callbacksRef.current = { setView, onPinchStart }
  })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const touches = new Map<number, { x: number; y: number }>()
    let pinch: { distance: number; midX: number; midY: number; view: ViewState } | null = null

    const local = (e: { clientX: number; clientY: number }) => {
      const rect = el.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const twoFingers = () => {
      const [a, b] = [...touches.values()]
      return { distance: Math.hypot(b.x - a.x, b.y - a.y), midX: (a.x + b.x) / 2, midY: (a.y + b.y) / 2 }
    }

    // Capture phase: runs before Konva sees the event, so the second finger never draws.
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      touches.set(e.pointerId, local(e))
      touchCountRef.current = touches.size
      if (touches.size === 2 && latestRef.current) {
        pinch = { ...twoFingers(), view: latestRef.current.view }
        callbacksRef.current.onPinchStart()
      }
    }
    const onMove = (e: PointerEvent) => {
      if (!touches.has(e.pointerId)) return
      touches.set(e.pointerId, local(e))
      const latest = latestRef.current
      if (!pinch || touches.size < 2 || !latest || pinch.distance === 0) return
      const now = twoFingers()
      const zoomed = zoomAround(pinch.view, latest.ctx, now.distance / pinch.distance, pinch.midX, pinch.midY)
      callbacksRef.current.setView(panBy(zoomed, latest.ctx, now.midX - pinch.midX, now.midY - pinch.midY))
    }
    const onUp = (e: PointerEvent) => {
      if (!touches.delete(e.pointerId)) return
      touchCountRef.current = touches.size
      if (touches.size < 2) pinch = null
    }
    const onWheel = (e: WheelEvent) => {
      const latest = latestRef.current
      if (!latest) return
      e.preventDefault()
      const p = local(e)
      callbacksRef.current.setView(
        zoomAround(latest.view, latest.ctx, Math.exp(-e.deltaY * WHEEL_ZOOM_SPEED), p.x, p.y),
      )
    }

    el.addEventListener('pointerdown', onDown, { capture: true })
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      el.removeEventListener('pointerdown', onDown, { capture: true })
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      el.removeEventListener('wheel', onWheel)
    }
  }, [containerRef, latestRef])

  return touchCountRef
}
