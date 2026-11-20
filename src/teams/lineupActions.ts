import { fieldSize } from '../field/dimensions'
import { KEEPER_LABEL, TEAM_COLORS, type NewItem } from '../items/palette'
import { currentScene, useDrillStore } from '../store/drillStore'
import { usePlaybackStore } from '../store/playbackStore'
import { useToolStore } from '../store/toolStore'
import { realignLineup } from './realign'
import { assignLineup, slotPosition, type Formation, type Side } from './formations'
import { isKeeper, nameForStyle, type NameStyle, type Team, type TeamPlayer } from './team'

/** Player item for a squad member (number, name tag and team color). */
export function itemForPlayer(team: Team, player: TeamPlayer, nameStyle: NameStyle = 'full'): NewItem {
  const keeper = isKeeper(player.position)
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

/**
 * Moves the team's players on the pitch onto the places of another formation (one undo
 * step), optionally in a new scene. Returns how many players were moved.
 */
export function realignTeam(team: Team, formation: Formation, side: Side, newScene: boolean): number {
  const state = useDrillStore.getState()
  const moves = realignLineup(team, formation, side, fieldSize(state.fieldType), currentScene(state).items)
  if (moves.length === 0) return 0
  usePlaybackStore.getState().stop()
  useToolStore.getState().setTool('select')
  state.select(null)
  state.placeItems(moves, newScene)
  return moves.length
}
