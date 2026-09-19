/**
 * IndexedDB-based store for temporarily holding large video blobs
 * between the Record page and Upload page.
 */

export interface PendingUpload {
  blob: Blob;
  duration: number;
  title?: string;
  videoId?: string;
}

const DB_NAME = "snappit-temp";
const STORE_NAME = "pending-upload";
const KEY = "current";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE_NAME)) {
        req.result.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function savePendingUpload(data: PendingUpload): Promise<void> {
  const arrayBuffer = await data.blob.arrayBuffer();
  const mimeType = data.blob.type;

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(
      {
        buffer: arrayBuffer,
        type: mimeType,
        duration: data.duration,
        title: data.title,
        videoId: data.videoId,
      },
      KEY,
    );
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingUpload(): Promise<PendingUpload | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(KEY);
    req.onsuccess = () => {
      const result = req.result;
      if (!result) return resolve(null);
      const blob = new Blob([result.buffer || result.blob], {
        type: result.type || "video/webm",
      });
      resolve({ blob, duration: result.duration, title: result.title, videoId: result.videoId });
    };
    req.onerror = () => reject(req.error);
  });
}

export async function setPendingUploadVideoId(videoId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(KEY);
    req.onsuccess = () => {
      if (!req.result) {
        tx.abort();
        return;
      }
      store.put({ ...req.result, videoId }, KEY);
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("Pending recording is missing."));
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function clearPendingUpload(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
