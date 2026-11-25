import { useEffect, useState, type RefObject } from 'react'

const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]'

/** Controls the Tab key can reach, in page order. */
function tabStops(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => el.tabIndex >= 0 && !el.matches(':disabled') && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden',
  )
}

/** Open windows; only the newest one keeps the focus. */
const openWindows: HTMLElement[] = []

/**
 * Keeps the keyboard focus inside a window while it is open: it starts there, and Tab goes around
 * instead of reaching the covered page behind. The window element needs `tabIndex={-1}`.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>): void {
  // Remembered before the window takes the focus.
  const [before] = useState(() => document.activeElement)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    openWindows.push(root)
    const isTop = () => openWindows[openWindows.length - 1] === root
    // The window itself, not its first field: no on-screen keyboard on a tablet.
    if (!root.contains(document.activeElement)) root.focus({ preventScroll: true })

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || e.ctrlKey || e.metaKey || e.altKey || !isTop()) return
      const stops = tabStops(root)
      const active = document.activeElement
      const inside = active !== root && root.contains(active)
      const edge = e.shiftKey ? stops[0] : stops[stops.length - 1]
      if (inside && active !== edge) return
      e.preventDefault()
      const next = e.shiftKey ? stops[stops.length - 1] : stops[0]
      if (next) next.focus()
      else root.focus()
    }
    // E.g. Safari, where Tab can skip buttons and so pass the last one.
    const onFocusIn = (e: FocusEvent) => {
      if (isTop() && !root.contains(e.target as Node)) (tabStops(root)[0] ?? root).focus()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('focusin', onFocusIn)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('focusin', onFocusIn)
      openWindows.splice(openWindows.indexOf(root), 1)
      // Back to the button that opened it; not to a text field (on-screen keyboard).
      const lost = document.activeElement === document.body || root.contains(document.activeElement)
      if (lost && before instanceof HTMLButtonElement && before.isConnected) before.focus({ preventScroll: true })
    }
  }, [ref, before])
}
