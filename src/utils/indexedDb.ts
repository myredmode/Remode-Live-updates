/**
 * Native IndexedDB helper for RedMode Store
 * Provides robust, high-capacity client storage for products, uploaded photos, and catalog data
 * without the 5MB browser localStorage quota limitations.
 */

const DB_NAME = 'redmode_store_idb';
const DB_VERSION = 1;
const STORE_NAME = 'catalog_store';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available in current environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => {
        console.warn(`IndexedDB get error for key "${key}":`, request.error);
        resolve(undefined);
      };
    });
  } catch (err) {
    console.warn(`IndexedDB open failed in idbGet("${key}"):`, err);
    return undefined;
  }
}

export async function idbSet(key: string, value: any): Promise<boolean> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.warn(`IndexedDB set error for key "${key}":`, request.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn(`IndexedDB open failed in idbSet("${key}"):`, err);
    return false;
  }
}

export async function idbDelete(key: string): Promise<boolean> {
  try {
    const db = await openDb();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
        console.warn(`IndexedDB delete error for key "${key}":`, request.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn(`IndexedDB open failed in idbDelete("${key}"):`, err);
    return false;
  }
}
