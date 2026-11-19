import { useEffect, useState } from 'react'
import { totalMinutes, type TrainingSession } from '../sessions/session'
import { listDayIntensities, setDayIntensity } from '../sessions/dayDb'
import {
  addDays,
  isoWeek,
  kindInfo,
  MAX_INTENSITY,
  MIN_INTENSITY,
  SESSION_KINDS,
  sessionsOnDay,
  toIsoDate,
  WEEKDAY_NAMES,
  weekDays,
} from '../sessions/week'
import { buttonClass } from './ui'

interface WeekViewProps {
  sessions: TrainingSession[]
  onOpen: (sessionId: string) => void
  onCreate: (date: string) => void
}

function formatDay(date: string): string {
  const [, m, d] = date.split('-')
  return `${d}.${m}.`
}

/** Color from green (light) over yellow to red (hard) for an intensity of 1–10. */
function intensityColor(value: number): string {
  const hue = 120 - ((value - MIN_INTENSITY) / (MAX_INTENSITY - MIN_INTENSITY)) * 120
  return `hsl(${hue} 70% 40%)`
}

/** Week overview: sessions per day as colored cards and the intensity of each day. */
export function WeekView({ sessions, onOpen, onCreate }: WeekViewProps) {
  // Determined once when the view opens.
  const [today] = useState(() => toIsoDate(new Date()))
  const [anchor, setAnchor] = useState(today)
  const [intensities, setIntensities] = useState<Map<string, number>>(new Map())
  const days = weekDays(anchor)

  useEffect(() => {
    let cancelled = false
    listDayIntensities().then(
      (list) => {
        if (!cancelled) setIntensities(new Map(list.map((d) => [d.id, d.intensity])))
      },
      (err) => console.error(err),
    )
    return () => {
      cancelled = true
    }
  }, [])

  function changeIntensity(date: string, value: number | null) {
    setIntensities((map) => {
      const next = new Map(map)
      if (value === null) next.delete(date)
      else next.set(date, value)
      return next
    })
    setDayIntensity(date, value).catch((err) => {
      console.error(err)
      window.alert('Die Intensität konnte nicht gespeichert werden.')
    })
  }

  return (
    <div className="flex h-full flex-col gap-3 overflow-auto p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={buttonClass} onClick={() => setAnchor(addDays(anchor, -7))}>
          ← Vorherige
        </button>
        <button type="button" className={buttonClass} onClick={() => setAnchor(today)}>
          Heute
        </button>
        <button type="button" className={buttonClass} onClick={() => setAnchor(addDays(anchor, 7))}>
          Nächste →
        </button>
        <h2 className="ml-2 text-base font-semibold text-white">
          KW {isoWeek(days[0])} · {formatDay(days[0])} – {formatDay(days[6])}
          {days[6].slice(0, 4)}
        </h2>
        <div className="ml-auto flex flex-wrap gap-2">
          {SESSION_KINDS.map((k) => (
            <span key={k.key} className="flex items-center gap-1 text-xs text-slate-400">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: k.color }} />
              {k.name}
            </span>
          ))}
        </div>
      </div>

      <div className="grid min-w-[56rem] grid-cols-7 gap-2">
        {days.map((date, i) => {
          const daySessions = sessionsOnDay(sessions, date)
          const intensity = intensities.get(date) ?? null
          return (
            <div
              key={date}
              className={`flex min-h-64 flex-col gap-2 rounded-xl border bg-slate-900 p-2 ${
                date === today ? 'border-emerald-500' : 'border-slate-700'
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-semibold text-white">{WEEKDAY_NAMES[i]}</span>
                <span className="text-xs text-slate-400">{formatDay(date)}</span>
              </div>

              <div className="flex flex-1 flex-col gap-1.5">
                {daySessions.map((s) => {
                  const kind = kindInfo(s.kind)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onOpen(s.id)}
                      title={`${kind.name} öffnen`}
                      className="flex flex-col rounded-lg px-2 py-1.5 text-left text-white shadow hover:brightness-110"
                      style={{ backgroundColor: kind.color }}
                    >
                      <span className="text-xs font-semibold opacity-90">
                        {s.startTime || '–'} · {kind.name}
                      </span>
                      <span className="text-sm font-medium break-words">{s.title || 'Ohne Titel'}</span>
                      {s.blocks.length > 0 && <span className="text-xs opacity-80">{totalMinutes(s)} min</span>}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => onCreate(date)}
                  className="rounded-lg border border-dashed border-slate-600 py-1.5 text-sm text-slate-400 hover:border-slate-400 hover:text-slate-200"
                >
                  + Einheit
                </button>
              </div>

              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Intensität
                <select
                  className="min-h-9 rounded-md border border-slate-600 px-1 text-sm font-semibold text-white"
                  style={{ backgroundColor: intensity === null ? '#1e293b' : intensityColor(intensity) }}
                  value={intensity ?? ''}
                  onChange={(e) => changeIntensity(date, e.target.value === '' ? null : Number(e.target.value))}
                >
                  <option value="">Ruhetag / –</option>
                  {Array.from({ length: MAX_INTENSITY }, (_, n) => n + 1).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}
