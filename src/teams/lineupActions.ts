import { KEEPER_LABEL, TEAM_COLORS, type NewItem } from '../items/palette'
import { useDrillStore } from '../store/drillStore'
import { usePlaybackStore } from '../store/playbackStore'
import { useToolStore } from '../store/toolStore'
import { assignLineup, slotPosition, type Formation, type Side } from './formations'
import type { Team, TeamPlayer } from './team'

/** Player item for a squad member (number, name tag and team color). */
export function itemForPlayer(team: Team, player: TeamPlayer): NewItem {
  const keeper = player.position === 'TW'
  return {
    type: 'player',
    color: keeper ? TEAM_COLORS.keeper : team.color,
    label: player.number || (keeper ? KEEPER_LABEL : undefined),
    name: player.name,
    shape: 'circle',
  }
}

/** Puts a team in a formation onto the current scene (one undo step). */
export function placeLineup(team: Team, formation: Formation, side: Side): void {
  const lineup = assignLineup(team.players, formation)
  const entries = formation.slots.map((slot, i) => {
    const { x, y, rotation } = slotPosition(slot, side)
    const player = lineup[i]
    const item: NewItem = player
      ? itemForPlayer(team, player)
      : slot.position === 'TW'
        ? { type: 'player', color: TEAM_COLORS.keeper, label: KEEPER_LABEL, shape: 'circle' }
        : { type: 'player', color: team.color, shape: 'circle' }
    return { item: { ...item, rotation }, x, y }
  })
  usePlaybackStore.getState().stop()
  useToolStore.getState().setTool('select')
  useDrillStore.getState().select(null)
  useDrillStore.getState().addItems(entries)
}
