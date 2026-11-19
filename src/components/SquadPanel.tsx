import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { contrastTextColor } from '../items/colors'
import type { ItemTemplate } from '../items/palette'
import { currentScene, useDrillStore } from '../store/drillStore'
import { FORMATIONS, type Side } from '../teams/formations'
import { itemForPlayer, placeLineup } from '../teams/lineupActions'
import { playerLabel, type Team } from '../teams/team'
import { listTeams } from '../teams/teamDb'
import { useViewStore } from '../store/viewStore'
import { buttonClass, inputClass } from './ui'

interface SquadPanelProps {
  /** Starts dragging a player onto the pitch (same mechanism as the item palette). */
  onStartDrag: (e: ReactPointerEvent, template: ItemTemplate) => void
}

/** Squad in the editor sidebar: drag single players or line up a whole team in a formation. */
export function SquadPanel({ onStartDrag }: SquadPanelProps) {
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [formationKey, setFormationKey] = useState(FORMATIONS[0].key)
  const [side, setSide] = useState<Side>('left')
  const setView = useViewStore((s) => s.setView)
  const sceneItems = useDrillStore((s) => currentScene(s).items)
  // Players already on the pitch (same name and number) get a check mark.
  const onPitch = useMemo(() => new Set(sceneItems.map((i) => `${i.label}|${i.name}`)), [sceneItems])

  useEffect(() => {
    let cancelled = false
    listTeams().then(
      (loaded) => {
        if (cancelled) return
        setTeams(loaded)
        setTeamId((id) => id ?? loaded[0]?.id ?? null)
      },
      (err) => {
        console.error(err)
        if (!cancelled) setTeams([])
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const team = teams?.find((t) => t.id === teamId) ?? null
  const formation = FORMATIONS.find((f) => f.key === formationKey) ?? FORMATIONS[0]

  if (teams === null) return <p className="p-2 text-xs text-slate-400">Wird geladen …</p>
  if (teams.length === 0) {
    return (
      <div className="flex flex-col gap-2 p-2 text-xs text-slate-400">
        Noch keine Mannschaft angelegt.
        <button type="button" className={buttonClass} onClick={() => setView('teams')}>
          Zur Mannschaft
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      <select className={inputClass} aria-label="Mannschaft" value={teamId ?? ''} onChange={(e) => setTeamId(e.target.value)}>
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name || 'Ohne Namen'}
          </option>
        ))}
      </select>

      {team && (
        <>
          <div className="flex flex-col gap-1.5 rounded-lg bg-slate-800/60 p-1.5">
            <select
              className={inputClass}
              aria-label="Formation"
              value={formationKey}
              onChange={(e) => setFormationKey(e.target.value)}
            >
              {FORMATIONS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.name}
                </option>
              ))}
            </select>
            <select className={inputClass} aria-label="Eigenes Tor" value={side} onChange={(e) => setSide(e.target.value as Side)}>
              <option value="left">Eigenes Tor links</option>
              <option value="right">Eigenes Tor rechts</option>
            </select>
            <button
              type="button"
              className={`${buttonClass} justify-center bg-emerald-700 text-white hover:bg-emerald-600`}
              title="Startelf in dieser Formation aufs Feld stellen"
              onClick={() => placeLineup(team, formation, side)}
            >
              Aufstellen
            </button>
          </div>

          <ul className="flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto md:max-h-none">
            {team.players.length === 0 && <li className="text-xs text-slate-400">Kader ist leer.</li>}
            {team.players.map((player) => {
              const item = itemForPlayer(team, player)
              const placed = onPitch.has(`${item.label ?? ''}|${player.name}`)
              return (
                <li key={player.id}>
                  <button
                    type="button"
                    title={`${playerLabel(player)} aufs Feld ziehen`}
                    onPointerDown={(e) =>
                      onStartDrag(e, { key: player.id, name: playerLabel(player), item: { ...item, size: 1.5 } })
                    }
                    className="flex w-full touch-none cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-200 select-none hover:bg-slate-800"
                  >
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                      style={{ backgroundColor: item.color, color: contrastTextColor(item.color) }}
                    >
                      {player.number || '–'}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{player.name || 'Ohne Namen'}</span>
                    {player.starter && <span className="text-[10px] text-emerald-300">S</span>}
                    {placed && <span className="text-xs text-emerald-400">✓</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
