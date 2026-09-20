/**
 * IndexedDB behind a promise API. Two stores: `cache` holds the last response
 * for each `useApi` key so a cold start with no network still paints, and
 * `outbox` holds writes made offline until a drain replays them.
 *
 * Hand-rolled rather than pulled from a package — the app needs exactly
 * get-all/put/delete/clear over two stores.
 *
 * Every call resolves rather than rejects. A private window, blocked storage
 * or a failed upgrade all surface as `null`/`[]`, which every caller reads as
 * "no cache": the app then behaves exactly as it did before, online-only.
 */

const DB_NAME = 'suklog-offline'
const DB_VERSION = 1

export const CACHE_STORE = 'cache'
export const OUTBOX_STORE = 'outbox'

export interface CachedEntry<T = unknown> {
  key: string
  data: T
  fetchedAt: number
  userId: string
}

export interface OutboxEntry {
  /** Assigned by IndexedDB on insert; also the replay order. */
  id?: number
  method: 'POST' | 'PATCH' | 'DELETE'
  url: string
  body?: Record<string, unknown>
  /** `ApiKey`s to invalidate once this entry replays. */
  invalidates: string[]
  /** Indonesian noun phrase for the failure toast. */
  label: string
  userId: string
  createdAt: number
  attempts: number
}

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  if (!import.meta.client || typeof indexedDB === 'undefined') return Promise.resolve(null)
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: 'id', autoIncrement: true })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })

  return dbPromise
}

function run<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest
): Promise<T | null> {
  return openDb().then(db => new Promise<T | null>((resolve) => {
    if (!db) {
      resolve(null)
      return
    }

    try {
      const request = fn(db.transaction(store, mode).objectStore(store))
      request.onsuccess = () => resolve(request.result as T)
      request.onerror = () => resolve(null)
    } catch {
      resolve(null)
    }
  }))
}

export async function idbGetAll<T>(store: string): Promise<T[]> {
  return (await run<T[]>(store, 'readonly', s => s.getAll())) ?? []
}

export async function idbPut<T>(store: string, value: T): Promise<IDBValidKey | null> {
  return await run<IDBValidKey>(store, 'readwrite', s => s.put(value as never))
}

export async function idbDelete(store: string, key: IDBValidKey): Promise<void> {
  await run(store, 'readwrite', s => s.delete(key))
}

export async function idbClear(store: string): Promise<void> {
  await run(store, 'readwrite', s => s.clear())
}
