import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { buttonClass } from './ui'

export interface DropdownItem {
  label: string
  /** Small second line, e.g. why an item is disabled */
  hint?: string
  disabled?: boolean
  /** Shows a check mark, e.g. for the current choice */
  checked?: boolean
  /** Heading shown above the first item of a group */
  section?: string
  onSelect: () => void
}

interface DropdownProps {
  label: string
  items: DropdownItem[]
  disabled?: boolean
  /** Which edge of the button the menu lines up with */
  align?: 'left' | 'right'
}

/** A button that opens a small menu; closes on selection or a click elsewhere. */
export function Dropdown({ label, items, disabled, align = 'left' }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  /** Sideways shift that keeps the menu on screen (e.g. a right-aligned menu near the left edge) */
  const [shift, setShift] = useState(0)

  useLayoutEffect(() => {
    if (!open || !menuRef.current) {
      setShift(0)
      return
    }
    const margin = 8
    const rect = menuRef.current.getBoundingClientRect()
    const left = rect.left - shift
    const right = rect.right - shift
    if (left < margin) setShift(margin - left)
    else if (right > window.innerWidth - margin) setShift(Math.max(margin - left, window.innerWidth - margin - right))
    else setShift(0)
    // Measured once per opening; shift itself is only read to undo the previous one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className={buttonClass}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
      >
        {label} ▾
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={shift ? { transform: `translateX(${shift}px)` } : undefined}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} z-40 mt-1 flex max-h-[70vh] w-72 max-w-[calc(100vw-1rem)] scheme-dark flex-col overflow-y-auto overscroll-contain rounded-lg border border-slate-700 bg-slate-800 p-1 shadow-xl`}
        >
          {items.map((item, index) => (
            <div key={`${item.section ?? ''}-${item.label}`} className="contents">
              {item.section && item.section !== items[index - 1]?.section && (
                <div className="shrink-0 px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-slate-400 uppercase">
                  {item.section}
                </div>
              )}
              <button
                type="button"
                role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
                aria-checked={item.checked}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false)
                  item.onSelect()
                }}
                className="flex min-h-10 shrink-0 flex-col items-start justify-center rounded-md px-3 py-1 text-left text-sm text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <span>
                  {item.checked !== undefined && (
                    <span className="mr-2 inline-block w-3 text-emerald-400">{item.checked ? '✓' : ''}</span>
                  )}
                  {item.label}
                </span>
                {item.hint && <span className="text-xs text-slate-400">{item.hint}</span>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
