import { useEffect, useRef, type RefObject } from 'react'

/** Closes an open menu or panel when the focus moves to something outside of `ref` (Tab key). */
export function useCloseOnFocusOut(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void): void {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const onFocusIn = (e: FocusEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onCloseRef.current()
    }
    window.addEventListener('focusin', onFocusIn)
    return () => window.removeEventListener('focusin', onFocusIn)
  }, [open, ref])
}
