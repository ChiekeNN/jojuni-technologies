/**
 * Attachment storage.
 *
 * The workspace state is a single JSON blob in localStorage, which is capped at
 * roughly 5 MB for the whole origin. A couple of phone photos would fill it and
 * take the ledger and every to-do down with it. So attachments are split:
 *
 * - Small files (and every image that is small enough to preview inline) travel
 *   inside the message as a data URL. They survive export/import, which is what
 *   makes a workspace backup actually complete.
 * - Anything bigger goes into IndexedDB, keyed by id, and the message only
 *   carries the key. IndexedDB has a far larger quota and does not touch the
 *   localStorage budget.
 *
 * If IndexedDB is unavailable the upload fails with a clear message rather than
 * silently dropping the file.
 */

const DB_NAME = "jojuni.chat.files";
const STORE = "attachments";

/** Below this, a file is small enough to live in the workspace blob. */
export const INLINE_LIMIT = 400 * 1024;
/** Above this, refuse rather than risk filling the disk. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser cannot store files."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open file storage."));
  });
}

export async function putAttachmentBlob(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not save the file."));
  });
  db.close();
}

export async function getAttachmentBlob(key: string): Promise<Blob | null> {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not read the file."));
  });
  db.close();
  return blob;
}

export async function deleteAttachmentBlob(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    // A missing file is not worth failing a delete over.
  }
}

/** Read a File as a data URL, for the inline path. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

/** Image dimensions, so a photo can be laid out before it loads. */
export function imageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = dataUrl;
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
