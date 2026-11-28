import { getAll, putAll, removeOne } from '../storage/db'
import { BUILT_IN_DESIGNS, designFromData, type Design } from './design'

/** Own designs (broken records are skipped), by name. */
export async function listOwnDesigns(): Promise<Design[]> {
  const all = await getAll<unknown>('designs')
  return all
    .map(designFromData)
    .filter((d): d is Design => d !== null)
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

/** Ready-made designs first, then the own ones. */
export async function listDesigns(): Promise<Design[]> {
  let own: Design[] = []
  try {
    own = await listOwnDesigns()
  } catch (err) {
    console.error(err)
  }
  return [...BUILT_IN_DESIGNS, ...own]
}

export function putDesigns(designs: Design[]): Promise<void> {
  return putAll(
    'designs',
    designs.filter((d) => !d.builtIn),
  )
}

export function deleteDesign(id: string): Promise<void> {
  return removeOne('designs', id)
}
