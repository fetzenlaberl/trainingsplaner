import { fieldSize } from '../field/dimensions'
import { KEEPER_LABEL, TEAM_COLORS, type NewItem } from '../items/palette'
import { currentScene, useDrillStore } from '../store/drillStore'
import { usePlaybackStore } from '../store/playbackStore'
import { useToolStore } from '../store/toolStore'
import { realignLineup, teamItemIds } from './realign'
import { assignLineup, slotPosition, type Formation, type Side } from './formations'
import { isKeeper, nameForStyle, type NameStyle, type SquadLook, type Team, type TeamPlayer } from './team'

/** Shape and arrow of squad players in the chosen look */
function lookOf(look: SquadLook): Pick<NewItem, 'shape' | 'facing'> {
  return look === 'arrow' ? { shape: 'circle' } : { shape: look, facing: false }
}

/** Player item for a squad member (number, name tag and team color). */
export function itemForPlayer(team: Team, player: TeamPlayer, nameStyle: NameStyle = 'full', look: SquadLook = 'arrow'): NewItem {
  const keeper = isKeeper(player.position)
  return {
    type: 'player',
    color: keeper ? TEAM_COLORS.keeper : team.color,
    label: player.number || (keeper ? KEEPER_LABEL : undefined),
    name: nameForStyle(player.name, nameStyle) || undefined,
    ...lookOf(look),
  }
}

/**
 * Puts a team in a formation onto the current scene (one undo step). Players of this team
 * already on the pitch are replaced, so a new formation never lies on top of the old one.
 */
export function placeLineup(
  team: Team,
  formation: Formation,
  side: Side,
  nameStyle: NameStyle = 'full',
  look: SquadLook = 'arrow',
): void {
  const state = useDrillStore.getState()
  const size = fieldSize(state.fieldType, state.pitch.area)
  const lineup = assignLineup(team.players, formation)
  const entries = formation.slots.map((slot, i) => {
    const { x, y, rotation } = slotPosition(slot, side, size)
    const player = lineup[i]
    const item: NewItem = player
      ? itemForPlayer(team, player, nameStyle, look)
      : slot.position === 'TW'
        ? { type: 'player', color: TEAM_COLORS.keeper, label: KEEPER_LABEL, ...lookOf(look) }
        : { type: 'player', color: team.color, ...lookOf(look) }
    return { item: { ...item, rotation }, x, y }
  })
  usePlaybackStore.getState().stop()
  useToolStore.getState().setTool('select')
  state.select(null)
  state.addItems(entries, teamItemIds(team, side, size, currentScene(state).items))
}

/**
 * Moves the team's players on the pitch onto the places of another formation (one undo
 * step), optionally in a new scene. Returns how many players were moved.
 */
export function realignTeam(team: Team, formation: Formation, side: Side, newScene: boolean): number {
  const state = useDrillStore.getState()
  const moves = realignLineup(team, formation, side, fieldSize(state.fieldType, state.pitch.area), currentScene(state).items)
  if (moves.length === 0) return 0
  usePlaybackStore.getState().stop()
  useToolStore.getState().setTool('select')
  state.select(null)
  state.placeItems(moves, newScene)
  return moves.length
}
