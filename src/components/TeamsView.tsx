import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { downloadBlob } from '../export/download'
import { PLAYER_COLORS } from '../items/palette'
import {
  addPlayer,
  createTeam,
  importPlayers,
  movePlayer,
  playerLabel,
  purgeTrash,
  restorePlayer,
  trashPlayer,
  POSITIONS,
  positionText,
  sortTeams,
  type ImportMode,
  type Position,
  type Team,
  type TeamPlayer,
} from '../teams/team'
import { CSV_TEMPLATE, decodeCsv, parsePlayersCsv, type CsvPlayer } from '../teams/teamCsv'
import { ImportError, readPdfText } from '../import/fileImport'
import { parseMatchReport, type ReportTeam } from '../teams/matchReport'
import { MatchReportDialog } from './MatchReportDialog'
import { deleteTeam, listTeams, putTeam } from '../teams/teamDb'
import { TrashIcon } from './TrashIcon'
import { buttonClass, dangerButtonClass, inputClass } from './ui'

const LOAD_ERROR =
  'Die Mannschaften konnten nicht geladen werden. Möglicherweise erlaubt dieser Browser (z. B. im privaten Modus) keine dauerhafte Speicherung.'

function reportSaveError(err: unknown) {
  console.error(err)
  window.alert('Die Mannschaft konnte nicht gespeichert werden.')
}

/** Squads: teams with players (number, name, position, starting eleven). Saved automatically. */
export function TeamsView() {
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listTeams().then(
      (loaded) => {
        if (cancelled) return
        setTeams(loaded)
        setSelectedId(loaded[0]?.id ?? null)
      },
      (err) => {
        console.error(err)
        if (!cancelled) setError(LOAD_ERROR)
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const selected = teams?.find((t) => t.id === selectedId) ?? null

  function save(team: Team) {
    setTeams((list) => sortTeams([...(list ?? []).filter((t) => t.id !== team.id), team]))
    putTeam(team).catch(reportSaveError)
  }

  function update(change: Partial<Team>) {
    if (selected) save({ ...selected, ...change, updatedAt: Date.now() })
  }

  function handleNew() {
    const team = createTeam(Date.now(), PLAYER_COLORS[0].value)
    save(team)
    setSelectedId(team.id)
  }

  function handleDelete() {
    if (!selected || !window.confirm(`„${selected.name}“ mit allen Spielern löschen?`)) return
    const remaining = (teams ?? []).filter((t) => t.id !== selected.id)
    setTeams(remaining)
    setSelectedId(remaining[0]?.id ?? null)
    deleteTeam(selected.id).catch(reportSaveError)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden md:flex-row">
      <aside className="flex max-h-48 shrink-0 flex-col border-b border-slate-700 bg-slate-900 md:max-h-none md:w-64 md:border-r md:border-b-0">
        <div className="p-3">
          <button type="button" className={`${buttonClass} w-full justify-center`} onClick={handleNew}>
            + Neue Mannschaft
          </button>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {error && <li className="p-2 text-sm text-red-300">{error}</li>}
          {!error && teams === null && <li className="p-2 text-sm text-slate-400">Wird geladen …</li>}
          {teams?.length === 0 && (
            <li className="p-2 text-sm text-slate-400">Noch keine Mannschaft. Leg mit „+ Neue Mannschaft“ los.</li>
          )}
          {teams?.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                aria-current={t.id === selectedId ? 'true' : undefined}
                onClick={() => setSelectedId(t.id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left ${
                  t.id === selectedId ? 'bg-emerald-700 text-white' : 'text-slate-200 hover:bg-slate-800'
                }`}
              >
                <span className="h-3 w-3 shrink-0 rounded-full border border-white/40" style={{ backgroundColor: t.color }} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{t.name || 'Ohne Namen'}</span>
                  <span className="text-xs opacity-75">{t.players.length} Spieler</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="min-h-0 flex-1 overflow-y-auto p-4">
        {selected ? (
          <TeamEditor key={selected.id} team={selected} onChange={update} onDelete={handleDelete} />
        ) : (
          teams && <p className="text-sm text-slate-400">Wähle links eine Mannschaft oder leg eine neue an.</p>
        )}
      </section>
    </div>
  )
}

interface TeamEditorProps {
  team: Team
  onChange: (change: Partial<Team>) => void
  onDelete: () => void
}

function TeamEditor({ team, onChange, onDelete }: TeamEditorProps) {
  const setPlayers = (players: TeamPlayer[]) => onChange({ players })
  const updatePlayer = (id: string, change: Partial<TeamPlayer>) =>
    setPlayers(team.players.map((p) => (p.id === id ? { ...p, ...change } : p)))
  const starters = team.players.filter((p) => p.starter).length
  const csvInputRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<CsvPlayer[] | null>(null)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const reportInputRef = useRef<HTMLInputElement>(null)
  const [reportTeams, setReportTeams] = useState<ReportTeam[] | null>(null)
  const [readingReport, setReadingReport] = useState(false)

  function applyImport(players: CsvPlayer[], mode: ImportMode) {
    onChange({ players: importPlayers(team, players, mode).players })
    setPendingImport(null)
    setImportMessage(`${players.length} Spieler importiert.`)
  }

  async function handleCsvFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportMessage(null)
    try {
      const { players, skipped } = parsePlayersCsv(decodeCsv(await file.arrayBuffer()))
      if (players.length === 0) {
        setImportMessage('In der Datei wurden keine Spieler gefunden. Tipp: „Vorlage herunterladen“ zeigt das erwartete Format.')
        return
      }
      if (skipped > 0) setImportMessage(`${skipped} leere Zeile(n) übersprungen.`)
      offerImport(players)
    } catch (err) {
      console.error(err)
      setImportMessage('Die Datei konnte nicht gelesen werden.')
    }
  }

  /** Players taken from a file: straight in for an empty squad, otherwise ask replace/append. */
  function offerImport(players: CsvPlayer[]) {
    if (team.players.length === 0) applyImport(players, 'replace')
    else setPendingImport(players)
  }

  async function handleReportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImportMessage(null)
    setReadingReport(true)
    try {
      const pages = await readPdfText(file)
      if (!pages.some((items) => items.some((i) => i.str.trim() !== ''))) {
        setImportMessage('Im PDF ist kein Text, nur ein Bild (z. B. ein Scan). Solche Spielberichte kann die App nicht lesen.')
        return
      }
      const teams = parseMatchReport(pages)
      if (teams.length === 0) {
        setImportMessage('Im Spielbericht wurden keine Zeilen mit Nummer und Name gefunden.')
        return
      }
      setReportTeams(teams)
    } catch (err) {
      console.error(err)
      setImportMessage(err instanceof ImportError ? err.message : 'Das PDF konnte nicht gelesen werden.')
    } finally {
      setReadingReport(false)
    }
  }

  function handleTemplate() {
    downloadBlob(new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' }), 'kader-vorlage.csv')
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${inputClass} min-w-0 flex-1 text-lg font-semibold`}
          aria-label="Name der Mannschaft"
          value={team.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <button type="button" className={dangerButtonClass} onClick={onDelete}>
          Löschen
        </button>
      </div>

      <div role="group" aria-label="Teamfarbe" className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm text-slate-400">Teamfarbe</span>
        {PLAYER_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            title={c.name}
            aria-label={c.name}
            aria-pressed={team.color === c.value}
            onClick={() => onChange({ color: c.value })}
            className={`h-8 w-8 rounded-full border-2 ${
              team.color === c.value ? 'border-emerald-400 ring-2 ring-emerald-400/50' : 'border-slate-600'
            }`}
            style={{ backgroundColor: c.value }}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-white">
          Kader <span className="font-normal text-slate-400">· {team.players.length} Spieler, {starters} in der Startelf</span>
        </h2>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            className={buttonClass}
            title="Kader aus einer Tabelle laden (z. B. aus Excel als CSV gespeichert): Nummer, Name, Position, Startelf"
            onClick={() => csvInputRef.current?.click()}
          >
            CSV importieren
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={readingReport}
            title="Nummern und Namen aus einem Spielbericht (PDF) übernehmen; das PDF wird nur auf diesem Gerät gelesen"
            onClick={() => reportInputRef.current?.click()}
          >
            {readingReport ? 'PDF wird gelesen …' : 'Aus PDF-Spielbericht …'}
          </button>
          <input
            ref={reportInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => void handleReportFile(e)}
          />
          <button type="button" className={buttonClass} onClick={handleTemplate}>
            Vorlage herunterladen
          </button>
          <button type="button" className={buttonClass} onClick={() => onChange(addPlayer(team))}>
            + Spieler
          </button>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={(e) => void handleCsvFile(e)}
          />
        </div>
      </div>

      {pendingImport && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-600/60 bg-emerald-600/10 px-4 py-3 text-sm text-emerald-50">
          <span className="mr-auto">
            {pendingImport.length} Spieler gefunden. Die Mannschaft hat schon {team.players.length} Spieler.
          </span>
          <button type="button" className={buttonClass} onClick={() => applyImport(pendingImport, 'replace')}>
            Kader ersetzen
          </button>
          <button type="button" className={buttonClass} onClick={() => applyImport(pendingImport, 'append')}>
            Anhängen
          </button>
          <button type="button" className={buttonClass} onClick={() => setPendingImport(null)}>
            Abbrechen
          </button>
        </div>
      )}
      {importMessage && <p className="text-sm text-slate-300">{importMessage}</p>}
      {reportTeams && (
        <MatchReportDialog
          teams={reportTeams}
          onClose={() => setReportTeams(null)}
          onTake={(players) => {
            setReportTeams(null)
            offerImport(players)
          }}
        />
      )}

      {team.players.length === 0 && (
        <p className="text-sm text-slate-400">Noch keine Spieler. Füge sie mit „+ Spieler“ hinzu.</p>
      )}

      <ol className="flex flex-col gap-1.5">
        {team.players.map((player, index) => (
          <li key={player.id} className="flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 p-2">
            <input
              className={`${inputClass} w-14 text-center`}
              aria-label="Nummer"
              inputMode="numeric"
              maxLength={3}
              value={player.number}
              onChange={(e) => updatePlayer(player.id, { number: e.target.value })}
            />
            <input
              className={`${inputClass} min-w-32 flex-1`}
              aria-label="Name"
              placeholder="Name"
              value={player.name}
              onChange={(e) => updatePlayer(player.id, { name: e.target.value })}
            />
            <select
              className={inputClass}
              aria-label="Position"
              value={player.position ?? ''}
              onChange={(e) =>
                updatePlayer(player.id, { position: e.target.value === '' ? null : (e.target.value as Position) })
              }
            >
              <option value="">Position –</option>
              {POSITIONS.map((p) => (
                <option key={p.code} value={p.code}>
                  {positionText(p)}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 px-1 text-sm text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-500"
                checked={player.starter}
                onChange={(e) => updatePlayer(player.id, { starter: e.target.checked })}
              />
              Startelf
            </label>
            <button
              type="button"
              className={buttonClass}
              aria-label="Nach oben"
              disabled={index === 0}
              onClick={() => setPlayers(movePlayer(team.players, index, -1))}
            >
              ↑
            </button>
            <button
              type="button"
              className={buttonClass}
              aria-label="Nach unten"
              disabled={index === team.players.length - 1}
              onClick={() => setPlayers(movePlayer(team.players, index, 1))}
            >
              ↓
            </button>
            <button
              type="button"
              className={dangerButtonClass}
              aria-label="Spieler in den Papierkorb"
              title="In den Papierkorb"
              onClick={() => onChange(trashPlayer(team, player.id))}
            >
              <TrashIcon />
            </button>
          </li>
        ))}
      </ol>
      {(team.trash?.length ?? 0) > 0 && (
        <details className="rounded-lg border border-slate-700 bg-slate-900/60 p-2">
          <summary className="flex min-h-10 cursor-pointer items-center gap-2 px-1 text-sm text-slate-300">
            <TrashIcon />
            Papierkorb ({team.trash?.length})
          </summary>
          <ul className="mt-1 flex flex-col gap-1">
            {team.trash?.map((player) => (
              <li key={player.id} className="flex flex-wrap items-center gap-1.5 rounded-md bg-slate-800/60 px-2 py-1">
                <span className="mr-auto text-sm text-slate-300">{playerLabel(player)}</span>
                <button type="button" className={buttonClass} onClick={() => onChange(restorePlayer(team, player.id))}>
                  Wiederherstellen
                </button>
                <button
                  type="button"
                  className={dangerButtonClass}
                  onClick={() => {
                    if (window.confirm(`${playerLabel(player)} endgültig löschen?`)) onChange(purgeTrash(team, player.id))
                  }}
                >
                  Endgültig löschen
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-1 flex justify-end">
            <button
              type="button"
              className={dangerButtonClass}
              onClick={() => {
                if (window.confirm('Papierkorb leeren? Die Spieler sind dann endgültig gelöscht.')) onChange(purgeTrash(team))
              }}
            >
              Papierkorb leeren
            </button>
          </div>
        </details>
      )}
      <p className="text-xs text-slate-500">
        Die Daten bleiben nur in diesem Browser. Für die Aufstellung genügen Name, Nummer und Position – bitte keine
        weiteren persönlichen Daten eintragen.
      </p>
    </div>
  )
}
