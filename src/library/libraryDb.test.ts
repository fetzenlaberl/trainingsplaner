import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { emptyDrill } from '../model/serialize'
import type { LibraryEntry } from './library'
import { deleteEntry, getEntry, listEntries, putEntries, putEntry, resetDbConnection } from './libraryDb'

function entry(id: string, updatedAt: number): LibraryEntry {
  return { id, drill: { ...emptyDrill(), title: id }, thumbnail: null, createdAt: 0, updatedAt }
}

beforeEach(async () => {
  resetDbConnection()
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase('trainingsplaner')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
})

describe('libraryDb', () => {
  it('starts empty', async () => {
    expect(await listEntries()).toEqual([])
  })

  it('stores and reads entries', async () => {
    await putEntry(entry('a', 1))
    expect(await getEntry('a')).toEqual(entry('a', 1))
    expect(await getEntry('missing')).toBeUndefined()
  })

  it('lists newest first', async () => {
    await putEntries([entry('a', 1), entry('b', 3), entry('c', 2)])
    expect((await listEntries()).map((e) => e.id)).toEqual(['b', 'c', 'a'])
  })

  it('overwrites an entry with the same id', async () => {
    await putEntry(entry('a', 1))
    await putEntry({ ...entry('a', 2), drill: { ...emptyDrill(), title: 'Neu' } })
    const all = await listEntries()
    expect(all).toHaveLength(1)
    expect(all[0].drill.title).toBe('Neu')
  })

  it('converts old entries with single-bend lines when reading', async () => {
    const oldLine = {
      id: 'l1',
      type: 'pass',
      points: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      control: { x: 5, y: 8 },
      color: '#ffffff',
    }
    const old = entry('old', 1)
    old.drill.scenes[0] = { ...old.drill.scenes[0], lines: [oldLine as never] }
    await putEntry(old)
    const [loaded] = await listEntries()
    expect(loaded.drill.scenes[0].lines[0].points).toHaveLength(3)
    expect(loaded.drill.scenes[0].lines[0].smooth).toBe(true)
    expect((await getEntry('old'))?.drill.scenes[0].lines[0].points).toHaveLength(3)
  })

  it('skips broken entries instead of failing the whole library', async () => {
    const broken = { ...entry('broken', 2), drill: { title: 'kaputt' } as never }
    await putEntries([entry('ok', 1), broken])
    expect((await listEntries()).map((e) => e.id)).toEqual(['ok'])
  })

  it('deletes entries', async () => {
    await putEntries([entry('a', 1), entry('b', 2)])
    await deleteEntry('a')
    expect((await listEntries()).map((e) => e.id)).toEqual(['b'])
  })
})
