import { useState, type ReactNode } from 'react'
import { useIsPhone } from '../hooks/useIsPhone'

/**
 * On the phone, extra controls (filters, backup, tags …) fold away behind one button that
 * shows how many of them are active; on tablet and PC they are shown as they are.
 */
export function PhoneFold({ label, activeCount = 0, children }: { label: string; activeCount?: number; children: ReactNode }) {
  const phone = useIsPhone()
  const [open, setOpen] = useState(false)
  if (!phone) return <>{children}</>
  return (
    <div className="flex w-full flex-col gap-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={`flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold ${
          activeCount > 0 ? 'bg-emerald-900/60 text-emerald-200' : 'bg-slate-800 text-slate-300'
        }`}
      >
        <span aria-hidden className="w-3 text-xs">
          {open ? '▾' : '▸'}
        </span>
        {label}
        {activeCount > 0 && <span className="ml-auto rounded-full bg-emerald-600 px-2 text-xs text-white">{activeCount} aktiv</span>}
      </button>
      {open && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
