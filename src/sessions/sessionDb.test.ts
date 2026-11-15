import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { listEntries } from '../library/libraryDb'
import { emptyDrill } from '../model/serialize'
import { resetDbConnection } from '../storage/db'
import { createSession, type TrainingSession } from './session'
import { deleteSession, listSessions, putSession, putSessions } from './sessionDb'

function session(id: string, date: string): TrainingSession {
  return { ...createSession(0, date), id }
}

function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('trainingsplaner')
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
}

beforeEach(async () => {
  resetDbConnection()
  await deleteDatabase()
})

describe('sessionDb', () => {
  it('stores, lists (sorted by date) and deletes sessions', async () => {
    await putSessions([session('a', '2026-11-01'), session('b', '2026-11-20')])
    expect((await listSessions()).map((s) => s.id)).toEqual(['b', 'a'])
    await deleteSession('b')
    expect((await listSessions()).map((s) => s.id)).toEqual(['a'])
  })

  it('overwrites a session with the same id', async () => {
    await putSession(session('a', '2026-11-01'))
    await putSession({ ...session('a', '2026-11-01'), title: 'Geändert' })
    const all = await listSessions()
    expect(all).toHaveLength(1)
    expect(all[0].title).toBe('Geändert')
  })

  it('upgrades a database from version 1 and keeps the drills', async () => {
    // Version 1 of the app only had the "drills" store.
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('trainingsplaner', 1)
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('drills', { keyPath: 'id' })
        store.put({ id: 'old', drill: emptyDrill(), thumbnail: null, createdAt: 0, updatedAt: 1 })
      }
      request.onsuccess = () => {
        request.result.close()
        resolve()
      }
      request.onerror = () => reject(request.error)
    })

    expect((await listEntries()).map((e) => e.id)).toEqual(['old'])
    expect(await listSessions()).toEqual([])
  })
})
