import { useEffect, useRef } from 'react'

/**
 * Closes an open menu or panel on Escape. The key press is marked as used up (`defaultPrevented`)
 * before anything else sees it, so the editor shortcut keeps the selection.
 */
export function useCloseOnEscape(open: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const mark = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault()
    }
    // Last, so that a text field inside can still finish its change.
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', mark, true)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('keydown', mark, true)
      window.removeEventListener('keydown', close)
    }
  }, [open])
}
