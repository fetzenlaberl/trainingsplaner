import type { LibraryEntry } from './library'
import { sortEntries } from './library'

const DB_NAME = 'trainingsplaner'
const DB_VERSION = 1
const DRILLS = 'drills'

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DRILLS)) db.createObjectStore(DRILLS, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }).catch((err) => {
    dbPromise = null
    throw err
  })
  return dbPromise
}

function promisify<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDb()
  const tx = db.transaction(DRILLS, mode)
  const done = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
  const request = action(tx.objectStore(DRILLS))
  const result = request ? await promisify(request) : undefined
  await done
  return result
}

/** All library entries, newest first. */
export async function listEntries(): Promise<LibraryEntry[]> {
  const entries = await withStore<LibraryEntry[]>('readonly', (store) => store.getAll())
  return sortEntries(entries ?? [])
}

export async function getEntry(id: string): Promise<LibraryEntry | undefined> {
  return withStore<LibraryEntry>('readonly', (store) => store.get(id))
}

export async function putEntries(entries: LibraryEntry[]): Promise<void> {
  await withStore('readwrite', (store) => {
    for (const entry of entries) store.put(entry)
  })
}

export async function putEntry(entry: LibraryEntry): Promise<void> {
  await putEntries([entry])
}

export async function deleteEntry(id: string): Promise<void> {
  await withStore('readwrite', (store) => store.delete(id))
}

/** For tests: closes and forgets the connection. */
export function resetDbConnection(): void {
  void dbPromise?.then((db) => db.close())
  dbPromise = null
}
