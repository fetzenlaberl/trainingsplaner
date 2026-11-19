const DB_NAME = 'trainingsplaner'
// Version 1: drills. Version 2: sessions. Version 3: teams. Version 4: day intensities.
const DB_VERSION = 4

export type StoreName = 'drills' | 'sessions' | 'teams' | 'days'
const STORES: StoreName[] = ['drills', 'sessions', 'teams', 'days']

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
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' })
      }
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
  storeName: StoreName,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDb()
  const tx = db.transaction(storeName, mode)
  const done = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
  const request = action(tx.objectStore(storeName))
  const result = request ? await promisify(request) : undefined
  await done
  return result
}

export async function getAll<T>(storeName: StoreName): Promise<T[]> {
  return (await withStore<T[]>(storeName, 'readonly', (store) => store.getAll())) ?? []
}

export function getOne<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  return withStore<T>(storeName, 'readonly', (store) => store.get(id))
}

export async function putAll(storeName: StoreName, values: unknown[]): Promise<void> {
  await withStore(storeName, 'readwrite', (store) => {
    for (const value of values) store.put(value)
  })
}

export async function removeOne(storeName: StoreName, id: string): Promise<void> {
  await withStore(storeName, 'readwrite', (store) => store.delete(id))
}

/** For tests: closes and forgets the connection. */
export function resetDbConnection(): void {
  void dbPromise?.then((db) => db.close())
  dbPromise = null
}
