import { getAll, putAll, removeOne } from '../storage/db'
import { matchFromData, sortMatches, type Match } from './match'

/** All match reports (broken records are skipped), newest first. */
export async function listMatches(): Promise<Match[]> {
  const all = await getAll<unknown>('matches')
  return sortMatches(all.map(matchFromData).filter((m): m is Match => m !== null))
}

export function putMatches(matches: Match[]): Promise<void> {
  return putAll('matches', matches)
}

export function putMatch(match: Match): Promise<void> {
  return putMatches([match])
}

export function deleteMatch(id: string): Promise<void> {
  return removeOne('matches', id)
}
