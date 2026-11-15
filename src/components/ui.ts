/** Shared Tailwind classes for toolbar buttons. */
export const buttonClass =
  'flex min-h-10 items-center gap-1.5 rounded-md bg-slate-800 px-3 text-sm font-medium text-slate-200 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-slate-800'

export const dangerButtonClass = `${buttonClass} hover:bg-red-700`

export const inputClass =
  'min-h-10 rounded-md border border-slate-600 bg-slate-800 px-2 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none'
