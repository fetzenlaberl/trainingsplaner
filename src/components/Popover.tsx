import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { buttonClass } from './ui'

interface PopoverProps {
  /** Content of the button */
  label: ReactNode
  /** Tooltip and accessible name of the button */
  title: string
  children: ReactNode
  /** Which edge of the button the panel lines up with */
  align?: 'left' | 'right'
  /** Closes the panel after a click on a button inside (e.g. a color) */
  closeOnPick?: boolean
  /** Width of the panel */
  width?: string
}

/** A button that opens a small panel with any controls; closes on a tap outside or Escape. */
export function Popover({ label, title, children, align = 'left', closeOnPick = false, width = 'w-80' }: PopoverProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [shift, setShift] = useState(0)

  useLayoutEffect(() => {
    if (!open || !panelRef.current) {
      setShift(0)
      return
    }
    // Keep the panel on screen.
    const margin = 8
    const viewWidth = Math.min(window.innerWidth, document.documentElement.clientWidth)
    const rect = panelRef.current.getBoundingClientRect()
    if (rect.left < margin) setShift(margin - rect.left)
    else if (rect.right > viewWidth - margin) setShift(Math.max(margin - rect.left, viewWidth - margin - rect.right))
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
        className={open ? buttonClass.replace('bg-slate-800', 'bg-slate-600') : buttonClass}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={title}
        title={title}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <span aria-hidden className="text-xs text-slate-400">
          ▾
        </span>
      </button>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={title}
          style={shift ? { transform: `translateX(${shift}px)` } : undefined}
          onClick={(e) => {
            if (closeOnPick && (e.target as HTMLElement).closest('button')) setOpen(false)
          }}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} z-40 mt-1 flex max-h-[70vh] ${width} max-w-[calc(100vw-1rem)] flex-col gap-3 overflow-y-auto rounded-xl border border-slate-600 bg-slate-900 p-3 shadow-2xl`}
        >
          {children}
        </div>
      )}
    </div>
  )
}

/** A titled group inside a popover. */
export function PopoverSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-xs font-semibold tracking-wide text-slate-400 uppercase">{title}</div>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}

/** Color button showing the current color; the panel holds the swatches. */
export function ColorPopover({
  label,
  colors,
  value,
  onSelect,
}: {
  label: string
  colors: { value: string; name: string; swatch?: string }[]
  value: string
  onSelect: (color: string) => void
}) {
  const current = colors.find((c) => c.value === value)
  return (
    <Popover
      title={`${label}: ${current?.name ?? 'gemischt'}`}
      closeOnPick
      width="w-72"
      label={
        <>
          <span
            aria-hidden
            className="h-5 w-5 rounded-full border-2 border-slate-500"
            style={{ background: current?.swatch ?? (value || 'linear-gradient(135deg, #64748b 50%, #cbd5e1 50%)') }}
          />
          <span className="hidden sm:inline">{label}</span>
        </>
      }
    >
      <div className="grid grid-cols-7 gap-1.5">
        {colors.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.name}
            aria-label={`${label}: ${c.name}`}
            aria-pressed={value === c.value}
            onClick={() => onSelect(c.value)}
            className={`aspect-square rounded-full border-2 ${
              value === c.value ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-slate-600'
            }`}
            style={{ background: c.swatch ?? c.value }}
          />
        ))}
      </div>
    </Popover>
  )
}
