const idbName = 'sqlite-db'
const storeName = 'database'
const dbKey = 'user-db'

export function openIDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(idbName, 1)
    request.onerror = () => reject('Error opening IndexedDB')
    request.onsuccess = (event) => resolve(event.target.result)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      db.createObjectStore(storeName)
    }
  })
}

export async function saveDBToIndexedDB(dbInstance) {
  if (!dbInstance) return
  const idb = await openIDB()
  const transaction = idb.transaction([storeName], 'readwrite')
  const store = transaction.objectStore(storeName)
  const data = dbInstance.export()
  store.put(data, dbKey)
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject('Error saving DB to IndexedDB')
  })
}

export async function loadDBFromIndexedDB() {
  const idb = await openIDB()
  const transaction = idb.transaction([storeName], 'readonly')
  const store = transaction.objectStore(storeName)
  const request = store.get(dbKey)
  return new Promise((resolve, reject) => {
    request.onsuccess = (event) => {
      resolve(event.target.result) // This will be Uint8Array or undefined
    }
    request.onerror = () => reject('Error loading DB from IndexedDB')
  })
}

export async function clearDBFromIndexedDB() {
  const idb = await openIDB()
  const transaction = idb.transaction([storeName], 'readwrite')
  const store = transaction.objectStore(storeName)
  store.delete(dbKey)
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject('Error clearing DB from IndexedDB')
  })
}
