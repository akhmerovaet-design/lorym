const DATABASE = "lorym-prototype-files";
const STORE = "files";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (error: unknown) => void) => void): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result: T;
    action(store, (value) => { result = value; }, reject);
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.oncomplete = () => { db.close(); resolve(result); };
  });
}

export function saveFile(id: number, file: File): Promise<void> {
  return transaction<void>("readwrite", (store, resolve, reject) => {
    const request = store.put(file, id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export function readFile(id: number): Promise<Blob | undefined> {
  return transaction<Blob | undefined>("readonly", (store, resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as Blob | undefined);
    request.onerror = () => reject(request.error);
  });
}

export function deleteFile(id: number): Promise<void> {
  return transaction<void>("readwrite", (store, resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
