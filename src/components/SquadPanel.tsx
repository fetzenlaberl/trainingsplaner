import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { contrastTextColor } from '../items/colors'
import type { ItemTemplate } from '../items/palette'
import { currentScene, useDrillStore } from '../store/drillStore'
import { FORMATION_GROUPS, FORMATIONS, type Side } from '../teams/formations'
import { itemForPlayer, placeLineup, realignTeam } from '../teams/lineupActions'
import { NAME_STYLES, playerLabel, SQUAD_LOOKS, type NameStyle, type SquadLook, type Team } from '../teams/team'
import { listTeams } from '../teams/teamDb'
import { useViewStore } from '../store/viewStore'
import { buttonClass, inputClass } from './ui'

const NAME_STYLE_KEY = 'trainingsplaner.squadNameStyle'

function loadNameStyle(): NameStyle {
  try {
    const value = localStorage.getItem(NAME_STYLE_KEY)
    return NAME_STYLES.some((o) => o.value === value) ? (value as NameStyle) : 'full'
  } catch {
    return 'full'
  }
}

const LOOK_KEY = 'trainingsplaner.squadLook'

function loadLook(): SquadLook {
  try {
    const value = localStorage.getItem(LOOK_KEY)
    return SQUAD_LOOKS.some((o) => o.value === value) ? (value as SquadLook) : 'arrow'
  } catch {
    return 'arrow'
  }
}

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
  const [asNewScene, setAsNewScene] = useState(true)
  const [realignMessage, setRealignMessage] = useState<string | null>(null)
  const [nameStyle, setNameStyleState] = useState<NameStyle>(loadNameStyle)
  const [look, setLookState] = useState<SquadLook>(loadLook)
  const setLook = (value: SquadLook) => {
    setLookState(value)
    try {
      localStorage.setItem(LOOK_KEY, value)
    } catch {
      // Only a convenience; the choice is simply not remembered.
    }
  }
  const setNameStyle = (value: NameStyle) => {
    setNameStyleState(value)
    try {
      localStorage.setItem(NAME_STYLE_KEY, value)
    } catch {
      // Only a convenience; the choice is simply not remembered.
    }
  }
  const setView = useViewStore((s) => s.setView)
  const sceneItems = useDrillStore((s) => currentScene(s).items)
  // Players already on the pitch (same name and number) get a check mark.
  const onPitch = useMemo(() => new Set(sceneItems.map((i) => `${i.label ?? ''}|${i.name ?? ''}`)), [sceneItems])

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
              {FORMATION_GROUPS.map((group) => (
                <optgroup key={group.key} label={group.label}>
                  {FORMATIONS.filter((f) => f.group === group.key).map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select className={inputClass} aria-label="Eigenes Tor" value={side} onChange={(e) => setSide(e.target.value as Side)}>
              <option value="left">Eigenes Tor links</option>
              <option value="right">Eigenes Tor rechts</option>
            </select>
            <select
              className={inputClass}
              aria-label="Name auf dem Feld"
              title="Für einzelne Spieler und für die Aufstellung"
              value={nameStyle}
              onChange={(e) => setNameStyle(e.target.value as NameStyle)}
            >
              {NAME_STYLES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <select
              className={inputClass}
              aria-label="Aussehen der Spieler"
              title="Für einzelne Spieler und für die Aufstellung"
              value={look}
              onChange={(e) => setLook(e.target.value as SquadLook)}
            >
              {SQUAD_LOOKS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`${buttonClass} justify-center bg-emerald-700 text-white hover:bg-emerald-600`}
              title="Startelf in dieser Formation aufs Feld stellen"
              onClick={() => placeLineup(team, formation, side, nameStyle, look)}
            >
              Aufstellen
            </button>
            <button
              type="button"
              className={`${buttonClass} justify-center`}
              title="Die Spieler dieser Mannschaft, die schon auf dem Feld stehen, auf die Plätze des gewählten Systems stellen"
              onClick={() => {
                const moved = realignTeam(team, formation, side, asNewScene)
                setRealignMessage(moved === 0 ? 'Keine Spieler dieser Mannschaft auf dem Feld. Erst „Aufstellen“.' : null)
              }}
            >
              Auf System ausrichten
            </button>
            <label className="flex items-center gap-1.5 px-1 text-xs text-slate-300">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-500"
                checked={asNewScene}
                onChange={(e) => setAsNewScene(e.target.checked)}
              />
              als neue Szene (Animation)
            </label>
            {realignMessage && <p className="px-1 text-xs text-amber-300">{realignMessage}</p>}
          </div>

          <ul className="flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto md:max-h-none">
            {team.players.length === 0 && <li className="text-xs text-slate-400">Kader ist leer.</li>}
            {team.players.map((player) => {
              const item = itemForPlayer(team, player, nameStyle, look)
              const placed = onPitch.has(`${item.label ?? ''}|${item.name ?? ''}`)
              return (
                <li key={player.id}>
                  <button
                    type="button"
                    title={`${playerLabel(player)} aufs Feld ziehen`}
                    onPointerDown={(e) =>
                      onStartDrag(e, { key: player.id, name: playerLabel(player), item: { ...item, size: 1.5 } })
                    }
                    className="flex w-full cursor-grab touch-pan-y items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-slate-200 select-none hover:bg-slate-800"
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
