import { useEffect, useRef, useState } from 'react'
import { buttonClass } from './ui'

export interface DropdownItem {
  label: string
  /** Small second line, e.g. why an item is disabled */
  hint?: string
  disabled?: boolean
  onSelect: () => void
}

interface DropdownProps {
  label: string
  items: DropdownItem[]
  disabled?: boolean
}

/** A button that opens a small menu; closes on selection or a click elsewhere. */
export function Dropdown({ label, items, disabled }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
          role="menu"
          className="absolute left-0 z-40 mt-1 flex w-60 flex-col rounded-lg border border-slate-700 bg-slate-800 p-1 shadow-xl"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
              className="flex min-h-10 flex-col items-start justify-center rounded-md px-3 py-1 text-left text-sm text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              {item.label}
              {item.hint && <span className="text-xs text-slate-400">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
