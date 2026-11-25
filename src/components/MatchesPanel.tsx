import { useEffect, useState } from 'react'
import {
  createEvent,
  createMatch,
  dateText,
  EVENT_KINDS,
  eventText,
  halfTimeText,
  MAX_MATCH_NOTES,
  matchOutcome,
  matchPlayerLabel,
  matchScore,
  matchTitle,
  scoreText,
  sortedEvents,
  sortMatches,
  type Match,
  type MatchEvent,
  type MatchEventKind,
  type MatchPlayer,
} from '../teams/match'
import { deleteMatch, listMatches, putMatch } from '../teams/matchDb'
import { exportMatchPdf } from '../teams/matchPdf'
import type { Team } from '../teams/team'
import { useSaveState } from '../hooks/useSaveState'
import { SaveButton } from './SaveButton'
import { TrashIcon } from './TrashIcon'
import { buttonClass, dangerButtonClass, inputClass } from './ui'

const OUTCOME_STYLE = {
  S: 'bg-emerald-600 text-white',
  U: 'bg-slate-500 text-white',
  N: 'bg-red-700 text-white',
} as const

function reportError(err: unknown) {
  console.error(err)
  window.alert('Der Spielbericht konnte nicht gespeichert werden.')
}

const changed = (match: Match, change: Partial<Match>): Match => ({ ...match, ...change, updatedAt: Date.now() })

/** Match reports of one team: list, view and edit (saved automatically). */
export function MatchesPanel({ team }: { team: Team }) {
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let cancelled = false
    listMatches().then(
      (all) => {
        if (!cancelled) setMatches(all.filter((m) => m.teamId === team.id))
      },
      (err) => {
        console.error(err)
        if (!cancelled) setMatches([])
      },
    )
    return () => {
      cancelled = true
    }
  }, [team.id])

  const open = matches?.find((m) => m.id === openId) ?? null
  const { stateOf, track } = useSaveState()

  function save(match: Match) {
    setMatches((list) => sortMatches([...(list ?? []).filter((m) => m.id !== match.id), match]))
    track(match.id, putMatch(match), reportError)
  }

  function handleNew() {
    const match = createMatch(team, Date.now())
    save(match)
    setOpenId(match.id)
    setEditing(true)
  }

  function handleDelete(match: Match) {
    if (!window.confirm(`Spielbericht „${matchTitle(match, team.name)}“ vom ${dateText(match.date)} löschen?`)) return
    setMatches((list) => (list ?? []).filter((m) => m.id !== match.id))
    setOpenId(null)
    deleteMatch(match.id).catch(reportError)
  }

  if (matches === null) return <p className="text-sm text-slate-400">Wird geladen …</p>

  if (open) {
    const back = (
      <button type="button" className={buttonClass} onClick={() => (editing ? setEditing(false) : setOpenId(null))}>
        ← {editing ? 'Fertig' : 'Alle Spielberichte'}
      </button>
    )
    return editing ? (
      <MatchEditor
        key={open.id}
        match={open}
        team={team}
        onChange={(change) => save(changed(open, change))}
        header={
          <div className="sticky -top-4 z-10 flex flex-wrap gap-2 bg-slate-900 py-2">
            {back}
            <SaveButton
              dirty={stateOf(open.id) === 'failed'}
              saving={stateOf(open.id) === 'saving'}
              onSave={() => save(changed(open, {}))}
              savedTitle="Spielbericht gespeichert"
            />
          </div>
        }
      />
    ) : (
      <MatchView
        match={open}
        teamName={team.name}
        header={
          <div className="flex flex-wrap gap-2">
            {back}
            <button type="button" className={buttonClass} onClick={() => setEditing(true)}>
              Bearbeiten
            </button>
            <button
              type="button"
              className={buttonClass}
              onClick={() =>
                exportMatchPdf(open, team.name).catch((err) => {
                  console.error(err)
                  window.alert('Das PDF konnte nicht erstellt werden.')
                })
              }
            >
              Als PDF speichern
            </button>
            <button type="button" className={dangerButtonClass} onClick={() => handleDelete(open)}>
              <TrashIcon /> Löschen
            </button>
          </div>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={`${buttonClass} bg-emerald-700 hover:bg-emerald-600`} onClick={handleNew}>
          + Neuer Spielbericht
        </button>
        {matches.length > 0 && <MatchStats matches={matches} />}
      </div>
      {matches.length === 0 && (
        <p className="text-sm text-slate-400">
          Noch keine Spielberichte. Mit „+ Neuer Spielbericht“ legst du einen an – der Kader wird übernommen.
        </p>
      )}
      <ul className="flex flex-col gap-1.5">
        {matches.map((match) => {
          const outcome = matchOutcome(match)
          return (
            <li key={match.id}>
              <button
                type="button"
                onClick={() => {
                  setOpenId(match.id)
                  setEditing(false)
                }}
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-700 bg-slate-900 p-3 text-left hover:bg-slate-800"
              >
                <span className="w-24 shrink-0 text-sm text-slate-400 tabular-nums">{dateText(match.date)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-white">{matchTitle(match, team.name)}</span>
                  {match.competition && <span className="block truncate text-xs text-slate-400">{match.competition}</span>}
                </span>
                <span className="text-lg font-bold text-white tabular-nums">{scoreText(match)}</span>
                <span className={`rounded px-2 py-0.5 text-xs font-bold ${OUTCOME_STYLE[outcome]}`}>{outcome}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Short record of all reports: wins, draws, losses and goals. */
function MatchStats({ matches }: { matches: Match[] }) {
  const outcomes = matches.map(matchOutcome)
  const goals = matches.reduce(
    (sum, m) => {
      const s = matchScore(m)
      return { for: sum.for + s.for, against: sum.against + s.against }
    },
    { for: 0, against: 0 },
  )
  const count = (o: string) => outcomes.filter((x) => x === o).length
  return (
    <span className="text-sm text-slate-300">
      {matches.length} Spiele · {count('S')} S · {count('U')} U · {count('N')} N · Tore {goals.for}:{goals.against}
    </span>
  )
}

/** Clean read-only view of one report. */
function MatchView({ match, teamName, header }: { match: Match; teamName: string; header: React.ReactNode }) {
  const starters = match.players.filter((p) => p.role === 'starter')
  const bench = match.players.filter((p) => p.role === 'bench')
  const half = halfTimeText(match)
  const outcome = matchOutcome(match)
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {header}
      <div className="rounded-xl border border-slate-700 bg-slate-900 p-5 text-center">
        <p className="text-sm text-slate-400">
          {[dateText(match.date), match.time && `${match.time} Uhr`, match.competition].filter(Boolean).join(' · ')}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-white">{matchTitle(match, teamName)}</h2>
        <p className="mt-2 flex items-center justify-center gap-3">
          <span className="text-4xl font-bold text-white tabular-nums">{scoreText(match)}</span>
          <span className={`rounded px-2 py-0.5 text-sm font-bold ${OUTCOME_STYLE[outcome]}`}>{outcome}</span>
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {match.venue === 'home' ? 'Heimspiel' : 'Auswärtsspiel'}
          {half && ` · Halbzeit ${half}`}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PlayerList title="Startelf" players={starters} />
        <PlayerList title="Ersatzbank" players={bench} />
      </div>

      <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
        <h3 className="mb-2 font-semibold text-white">Spielverlauf</h3>
        {match.events.length === 0 ? (
          <p className="text-sm text-slate-400">Keine Ereignisse eingetragen.</p>
        ) : (
          <ol className="flex flex-col gap-1">
            {sortedEvents(match.events).map((event) => (
              <li key={event.id} className="flex items-baseline gap-3 text-sm text-slate-200">
                <span className="w-12 shrink-0 text-right font-semibold tabular-nums text-slate-300">
                  {event.minute ? `${event.minute}.` : '–'}
                </span>
                <span aria-hidden="true" className="w-5 shrink-0 text-center">
                  {EVENT_KINDS.find((k) => k.kind === event.kind)?.symbol}
                </span>
                <span className={event.kind === 'opponentGoal' || event.kind === 'ownGoal' ? 'text-red-300' : ''}>
                  {eventText(event, match.players)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {match.notes.trim() && (
        <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
          <h3 className="mb-2 font-semibold text-white">Notizen</h3>
          <p className="text-sm whitespace-pre-wrap text-slate-200">{match.notes}</p>
        </section>
      )}
    </div>
  )
}

function PlayerList({ title, players }: { title: string; players: MatchPlayer[] }) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <h3 className="mb-2 font-semibold text-white">
        {title} <span className="text-sm font-normal text-slate-400">({players.length})</span>
      </h3>
      {players.length === 0 ? (
        <p className="text-sm text-slate-400">–</p>
      ) : (
        <ul className="flex flex-col gap-0.5 text-sm text-slate-200">
          {players.map((p) => (
            <li key={p.playerId} className="flex gap-2">
              <span className="w-7 text-right font-semibold tabular-nums text-slate-400">{p.number}</span>
              <span>{p.name || 'Spieler'}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

const scoreValue = (v: string): number | null => {
  if (v.trim() === '') return null
  const n = Number.parseInt(v, 10)
  return Number.isNaN(n) ? null : Math.min(Math.max(n, 0), 99)
}

/** Form for one report; every change is saved right away. */
function MatchEditor({
  match,
  team,
  onChange,
  header,
}: {
  match: Match
  team: Team
  onChange: (change: Partial<Match>) => void
  header: React.ReactNode
}) {
  // Everyone of the squad, plus report players who have left the squad since.
  const rows: { playerId: string; name: string; number: string }[] = [
    ...team.players.map((p) => ({ playerId: p.id, name: p.name, number: p.number })),
    ...match.players.filter((mp) => !team.players.some((p) => p.id === mp.playerId)),
  ]
  const roleOf = (id: string) => match.players.find((p) => p.playerId === id)?.role ?? 'none'
  const setRole = (row: (typeof rows)[number], role: 'starter' | 'bench' | 'none') => {
    const rest = match.players.filter((p) => p.playerId !== row.playerId)
    if (role === 'none') {
      onChange({ players: rest })
      return
    }
    const existing = match.players.find((p) => p.playerId === row.playerId)
    const player: MatchPlayer = existing ? { ...existing, role } : { ...row, role }
    // Keep the squad order.
    const order = rows.map((r) => r.playerId)
    onChange({ players: [...rest, player].sort((a, b) => order.indexOf(a.playerId) - order.indexOf(b.playerId)) })
  }
  const starters = match.players.filter((p) => p.role === 'starter').length

  const updateEvent = (id: string, change: Partial<MatchEvent>) =>
    onChange({ events: match.events.map((e) => (e.id === id ? { ...e, ...change } : e)) })
  const counted = matchScore({ ...match, goalsFor: null, goalsAgainst: null })

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {header}

      <section className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900 p-4">
        <h3 className="font-semibold text-white">Spiel</h3>
        <div className="flex flex-wrap gap-2">
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Datum
            <input type="date" className={inputClass} value={match.date} onChange={(e) => onChange({ date: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-slate-400">
            Anstoß
            <input type="time" className={inputClass} value={match.time} onChange={(e) => onChange({ time: e.target.value })} />
          </label>
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-slate-400">
            Wettbewerb
            <input
              className={inputClass}
              placeholder="z. B. Meisterschaft, 10. Runde"
              maxLength={80}
              value={match.competition}
              onChange={(e) => onChange({ competition: e.target.value })}
            />
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs text-slate-400">
            Gegner
            <input
              className={inputClass}
              placeholder="Name der gegnerischen Mannschaft"
              maxLength={80}
              value={match.opponent}
              onChange={(e) => onChange({ opponent: e.target.value })}
            />
          </label>
          <div role="group" aria-label="Heim oder auswärts" className="flex gap-1 rounded-lg bg-slate-800 p-1">
            {(['home', 'away'] as const).map((venue) => (
              <button
                key={venue}
                type="button"
                aria-pressed={match.venue === venue}
                onClick={() => onChange({ venue })}
                className={`min-h-8 rounded-md px-3 text-sm ${
                  match.venue === venue ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                {venue === 'home' ? 'Heim' : 'Auswärts'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <ScoreInput
            label="Ergebnis (wir : Gegner)"
            ours={match.goalsFor}
            theirs={match.goalsAgainst}
            placeholder={counted}
            onChange={(goalsFor, goalsAgainst) => onChange({ goalsFor, goalsAgainst })}
          />
          <ScoreInput
            label="Halbzeit (wir : Gegner)"
            ours={match.halfFor}
            theirs={match.halfAgainst}
            onChange={(halfFor, halfAgainst) => onChange({ halfFor, halfAgainst })}
          />
          <p className="pb-2 text-xs text-slate-500">Leer lassen = Tore aus dem Spielverlauf zählen.</p>
        </div>
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900 p-4">
        <h3 className="font-semibold text-white">
          Aufstellung <span className="text-sm font-normal text-slate-400">· Startelf {starters}</span>
        </h3>
        {rows.length === 0 && <p className="text-sm text-slate-400">Der Kader ist leer.</p>}
        <ul className="flex flex-col gap-1">
          {rows.map((row) => {
            const role = roleOf(row.playerId)
            return (
              <li key={row.playerId} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{matchPlayerLabel({ ...row, role: 'bench' })}</span>
                <div role="group" aria-label={`Rolle von ${row.name || row.number}`} className="flex gap-1 rounded-lg bg-slate-800 p-1">
                  {(
                    [
                      ['starter', 'Startelf'],
                      ['bench', 'Bank'],
                      ['none', 'nicht dabei'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={role === key}
                      onClick={() => setRole(row, key)}
                      className={`min-h-8 rounded-md px-2 text-xs ${
                        role === key ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900 p-4">
        <h3 className="font-semibold text-white">Spielverlauf</h3>
        <div className="flex flex-wrap gap-1">
          {EVENT_KINDS.map(({ kind, label, symbol }) => (
            <button
              key={kind}
              type="button"
              className={buttonClass}
              onClick={() => onChange({ events: [...match.events, createEvent(kind)] })}
            >
              <span aria-hidden="true">{symbol}</span> + {label}
            </button>
          ))}
        </div>
        {match.events.length === 0 && <p className="text-sm text-slate-400">Noch keine Ereignisse.</p>}
        <ul className="flex flex-col gap-1.5">
          {sortedEvents(match.events).map((event) => (
            <EventRow
              key={event.id}
              event={event}
              players={match.players}
              onChange={(change) => updateEvent(event.id, change)}
              onDelete={() => onChange({ events: match.events.filter((e) => e.id !== event.id) })}
            />
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-slate-700 bg-slate-900 p-4">
        <h3 className="font-semibold text-white">Notizen</h3>
        <textarea
          className={`${inputClass} min-h-28 py-2`}
          maxLength={MAX_MATCH_NOTES}
          placeholder="Was lief gut, was nicht? Besonderheiten, Verletzungen …"
          value={match.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </section>
      <p className="text-xs text-slate-500">
        Wird automatisch gespeichert, nur in diesem Browser. Erfasst werden nur Spieler des eigenen Kaders.
      </p>
    </div>
  )
}

function ScoreInput({
  label,
  ours,
  theirs,
  placeholder,
  onChange,
}: {
  label: string
  ours: number | null
  theirs: number | null
  placeholder?: { for: number; against: number }
  onChange: (ours: number | null, theirs: number | null) => void
}) {
  return (
    <div className="flex flex-col gap-1 text-xs text-slate-400">
      {label}
      <div className="flex items-center gap-1">
        <input
          className={`${inputClass} w-14 text-center`}
          inputMode="numeric"
          aria-label={`${label}: wir`}
          placeholder={placeholder ? String(placeholder.for) : ''}
          value={ours ?? ''}
          onChange={(e) => onChange(scoreValue(e.target.value), theirs)}
        />
        <span className="text-white">:</span>
        <input
          className={`${inputClass} w-14 text-center`}
          inputMode="numeric"
          aria-label={`${label}: Gegner`}
          placeholder={placeholder ? String(placeholder.against) : ''}
          value={theirs ?? ''}
          onChange={(e) => onChange(ours, scoreValue(e.target.value))}
        />
      </div>
    </div>
  )
}

const PLAYER_CAPTION: Record<MatchEventKind, [string | null, string | null]> = {
  goal: ['Torschütze', 'Vorlage'],
  opponentGoal: [null, null],
  ownGoal: ['Spieler', null],
  yellow: ['Spieler', null],
  yellowRed: ['Spieler', null],
  red: ['Spieler', null],
  sub: ['raus', 'rein'],
}

function EventRow({
  event,
  players,
  onChange,
  onDelete,
}: {
  event: MatchEvent
  players: MatchPlayer[]
  onChange: (change: Partial<MatchEvent>) => void
  onDelete: () => void
}) {
  const [first, second] = PLAYER_CAPTION[event.kind]
  const select = (caption: string, value: string | null, set: (id: string | null) => void) => (
    <select
      className={`${inputClass} min-w-0 flex-1`}
      aria-label={caption}
      value={value ?? ''}
      onChange={(e) => set(e.target.value || null)}
    >
      <option value="">{caption} –</option>
      {players.map((p) => (
        <option key={p.playerId} value={p.playerId}>
          {matchPlayerLabel(p)}
          {p.role === 'bench' ? ' (Bank)' : ''}
        </option>
      ))}
    </select>
  )
  return (
    <li className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-800/60 p-1.5">
      <input
        className={`${inputClass} w-16 text-center`}
        aria-label="Minute"
        placeholder="Min."
        maxLength={6}
        value={event.minute}
        onChange={(e) => onChange({ minute: e.target.value })}
      />
      <select
        className={inputClass}
        aria-label="Ereignis"
        value={event.kind}
        onChange={(e) => onChange({ kind: e.target.value as MatchEventKind })}
      >
        {EVENT_KINDS.map((k) => (
          <option key={k.kind} value={k.kind}>
            {k.label}
          </option>
        ))}
      </select>
      {first && select(first, event.playerId, (playerId) => onChange({ playerId }))}
      {second && select(second, event.otherId, (otherId) => onChange({ otherId }))}
      <button type="button" className={dangerButtonClass} aria-label="Ereignis löschen" onClick={onDelete}>
        <TrashIcon />
      </button>
    </li>
  )
}
