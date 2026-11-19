import { getAll, putAll, removeOne } from '../storage/db'
import { sortTeams, type Team } from './team'

export async function listTeams(): Promise<Team[]> {
  return sortTeams(await getAll<Team>('teams'))
}

export function putTeams(teams: Team[]): Promise<void> {
  return putAll('teams', teams)
}

export function putTeam(team: Team): Promise<void> {
  return putTeams([team])
}

export function deleteTeam(id: string): Promise<void> {
  return removeOne('teams', id)
}
