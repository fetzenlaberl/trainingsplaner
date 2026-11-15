import { getAll, putAll, removeOne } from '../storage/db'
import { sortSessions, type TrainingSession } from './session'

export async function listSessions(): Promise<TrainingSession[]> {
  return sortSessions(await getAll<TrainingSession>('sessions'))
}

export function putSessions(sessions: TrainingSession[]): Promise<void> {
  return putAll('sessions', sessions)
}

export function putSession(session: TrainingSession): Promise<void> {
  return putSessions([session])
}

export function deleteSession(id: string): Promise<void> {
  return removeOne('sessions', id)
}
