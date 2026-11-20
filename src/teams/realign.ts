// Moves the players of a team that are already on the pitch onto the places of another
// formation ("system change"): no players are added, other items stay where they are.

import { KEEPER_LABEL, TEAM_COLORS } from '../items/palette'
import type { Item } from '../model/types'
import { assignLineup, slotPosition, type Formation, type Side } from './formations'
import { isKeeper, nameInitials, type Team, type TeamPlayer } from './team'

export interface ItemMove {
  id: string
  x: number
  y: number
  rotation: number
}

/** Does this pitch item show this squad member (color, number and name tag as placed by the squad)? */
function showsPlayer(item: Item, team: Team, player: TeamPlayer): boolean {
  const keeper = isKeeper(player.position)
  const color = keeper ? TEAM_COLORS.keeper : team.color
  if (item.color.toLowerCase() !== color.toLowerCase()) return false
  const label = player.number || (keeper ? KEEPER_LABEL : '')
  if (item.label !== label) return false
  const names = [player.name, nameInitials(player.name), '']
  return names.includes(item.name)
}

/**
 * New places for the team's players on the pitch in the given formation.
 * Squad members found on the pitch get places by their positions (a "6er" on ZDM);
 * other players in the team color fill the remaining places, the keeper stays in goal.
 */
export function realignLineup(
  team: Team,
  formation: Formation,
  side: Side,
  size: { length: number; width: number },
  items: Item[],
): ItemMove[] {
  const players = items.filter((i) => i.type === 'player')
  const used = new Set<string>()
  // Squad members on the pitch, each with its item.
  const onPitch: { player: TeamPlayer; item: Item }[] = []
  for (const player of team.players) {
    const item = players.find((i) => !used.has(i.id) && showsPlayer(i, team, player))
    if (item) {
      used.add(item.id)
      onPitch.push({ player, item })
    }
  }
  // Everyone on the pitch counts as starter for the new formation.
  const lineup = assignLineup(
    onPitch.map(({ player }) => ({ ...player, starter: true })),
    formation,
  )
  const slots = formation.slots.map((slot, i) => {
    const player = lineup[i]
    return { slot, item: player ? onPitch.find((o) => o.player.id === player.id)?.item : undefined }
  })

  // Other items of the team: field players in the team color, and a keeper (keeper color,
  // label TM) nearest to the own goal (the other team's keeper looks the same).
  const ownGoalX = side === 'left' ? 0 : size.length
  const placed = new Set(slots.flatMap((s) => (s.item ? [s.item.id] : [])))
  const unknownField = players
    .filter((i) => !used.has(i.id) && i.color.toLowerCase() === team.color.toLowerCase())
    .sort((a, b) => (Number(a.label) || 999) - (Number(b.label) || 999))
  const unknownKeepers = players
    .filter((i) => !used.has(i.id) && i.color.toLowerCase() === TEAM_COLORS.keeper.toLowerCase() && i.label === KEEPER_LABEL)
    .sort((a, b) => Math.abs(a.x - ownGoalX) - Math.abs(b.x - ownGoalX))
  // Squad members not chosen for a place (e.g. more than 11 on the pitch) also fill gaps.
  const spare = onPitch.filter((o) => !placed.has(o.item.id)).map((o) => o.item)
  const spareField = spare.filter((i) => i.color.toLowerCase() !== TEAM_COLORS.keeper.toLowerCase())
  const spareKeepers = spare.filter((i) => i.color.toLowerCase() === TEAM_COLORS.keeper.toLowerCase())

  for (const entry of slots) {
    if (entry.item) continue
    const keeperSlot = entry.slot.position === 'TW'
    entry.item = keeperSlot ? (spareKeepers.shift() ?? unknownKeepers.shift()) : (spareField.shift() ?? unknownField.shift())
  }

  return slots.flatMap(({ slot, item }) => {
    if (!item) return []
    const { x, y, rotation } = slotPosition(slot, side, size)
    return [{ id: item.id, x, y, rotation }]
  })
}
