import { fieldSize } from '../field/dimensions'
import { KEEPER_LABEL, TEAM_COLORS, type NewItem } from '../items/palette'
import { useDrillStore } from '../store/drillStore'
import { usePlaybackStore } from '../store/playbackStore'
import { useToolStore } from '../store/toolStore'
import { assignLineup, slotPosition, type Formation, type Side } from './formations'
import { nameForStyle, type NameStyle, type Team, type TeamPlayer } from './team'

/** Player item for a squad member (number, name tag and team color). */
export function itemForPlayer(team: Team, player: TeamPlayer, nameStyle: NameStyle = 'full'): NewItem {
  const keeper = player.position === 'TW'
  return {
    type: 'player',
    color: keeper ? TEAM_COLORS.keeper : team.color,
    label: player.number || (keeper ? KEEPER_LABEL : undefined),
    name: nameForStyle(player.name, nameStyle) || undefined,
    shape: 'circle',
  }
}

/** Puts a team in a formation onto the current scene (one undo step). */
export function placeLineup(team: Team, formation: Formation, side: Side, nameStyle: NameStyle = 'full'): void {
  const lineup = assignLineup(team.players, formation)
  const entries = formation.slots.map((slot, i) => {
    const { x, y, rotation } = slotPosition(slot, side, fieldSize(useDrillStore.getState().fieldType))
    const player = lineup[i]
    const item: NewItem = player
      ? itemForPlayer(team, player, nameStyle)
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
