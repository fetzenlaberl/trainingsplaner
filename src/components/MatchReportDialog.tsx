import { useEffect, useRef, useState } from 'react'
import { useFocusTrap } from '../hooks/useFocusTrap'
import type { ReportTeam } from '../teams/matchReport'
import type { CsvPlayer } from '../teams/teamCsv'
import { buttonClass, inputClass } from './ui'

interface Row extends CsvPlayer {
  take: boolean
}

const toRows = (team: ReportTeam): Row[] => team.players.map((p) => ({ ...p, take: true }))

const isChanged = (row: Row, original: CsvPlayer) =>
  !row.take || row.number !== original.number || row.name !== original.name

const DISCARD_QUESTION = 'Deine Korrekturen in diesem Fenster gehen verloren. Trotzdem schließen?'

/**
 * Preview of the players found in a match report: choose the team (column), untick wrong
 * rows and correct numbers or names before they are taken into the squad.
 */
export function MatchReportDialog({
  teams,
  onTake,
  onClose,
}: {
  teams: ReportTeam[]
  onTake: (players: CsvPlayer[]) => void
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDivElement>(null)
  useFocusTrap(dialogRef)
  const [teamIndex, setTeamIndex] = useState(0)
  // One list per team, so that looking at the other team keeps the corrections.
  const [rowLists, setRowLists] = useState<Row[][]>(() => teams.map(toRows))
  const rows = rowLists[teamIndex]
  const chosen = rows.filter((r) => r.take)

  function close() {
    const changed = rowLists.some((list, t) => list.some((row, i) => isChanged(row, teams[t].players[i])))
    if (!changed || window.confirm(DISCARD_QUESTION)) onClose()
  }
  const closeRef = useRef(close)
  useEffect(() => {
    closeRef.current = close
  })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const update = (index: number, change: Partial<Row>) =>
    setRowLists((lists) =>
      lists.map((list, t) => (t === teamIndex ? list.map((r, i) => (i === index ? { ...r, ...change } : r)) : list)),
    )

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
        className="outline-none flex max-h-full w-full max-w-lg flex-col gap-3 rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
      >
        <h2 id="report-title" className="text-base font-semibold text-white">
          Spieler aus dem Spielbericht
        </h2>
        {teams.length > 1 && (
          <div role="group" aria-label="Mannschaft im Spielbericht" className="flex flex-wrap gap-1">
            {teams.map((team, i) => (
              <button
                key={team.label}
                type="button"
                aria-pressed={i === teamIndex}
                onClick={() => setTeamIndex(i)}
                className={`min-h-10 rounded-md px-3 text-sm ${
                  i === teamIndex ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {team.label} · {team.players.length}
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-400">
          Häkchen weg bei Zeilen, die nicht passen. Nummer und Name kannst du hier noch korrigieren.
        </p>
        <ul className="flex min-h-0 flex-col gap-1 overflow-y-auto">
          {rows.map((row, i) => (
            <li key={i} className={`flex items-center gap-1.5 ${row.take ? '' : 'opacity-50'}`}>
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-emerald-500"
                aria-label="Übernehmen"
                checked={row.take}
                onChange={(e) => update(i, { take: e.target.checked })}
              />
              <input
                className={`${inputClass} w-14 text-center`}
                aria-label="Nummer"
                inputMode="numeric"
                maxLength={3}
                value={row.number}
                onChange={(e) => update(i, { number: e.target.value })}
              />
              <input
                className={`${inputClass} min-w-0 flex-1`}
                aria-label="Name"
                value={row.name}
                onChange={(e) => update(i, { name: e.target.value })}
              />
              <span className="w-16 shrink-0 text-xs text-slate-400">
                {[row.position ?? '', row.starter === false ? 'Ersatz' : ''].filter(Boolean).join(' · ')}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={buttonClass} onClick={close}>
            Abbrechen
          </button>
          <button
            type="button"
            disabled={chosen.length === 0}
            className={`${buttonClass} bg-emerald-700 hover:bg-emerald-600`}
            onClick={() => onTake(chosen.map(({ take: _take, ...player }) => ({ ...player, name: player.name.trim() })))}
          >
            {chosen.length} Spieler übernehmen
          </button>
        </div>
      </div>
    </div>
  )
}
