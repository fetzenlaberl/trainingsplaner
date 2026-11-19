import { getAll, putAll, removeOne } from '../storage/db'
import type { DayIntensity } from './week'

export function listDayIntensities(): Promise<DayIntensity[]> {
  return getAll<DayIntensity>('days')
}

export function putDayIntensities(days: DayIntensity[]): Promise<void> {
  return putAll('days', days)
}

/** Sets the intensity of a day, or removes it (null). */
export function setDayIntensity(date: string, intensity: number | null): Promise<void> {
  return intensity === null ? removeOne('days', date) : putAll('days', [{ id: date, intensity }])
}
