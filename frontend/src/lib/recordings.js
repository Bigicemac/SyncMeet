// Recordings Storage Service using IndexedDB (persists recordings across browser refreshes & restarts)
const DB_NAME = "SyncMeetRecordingsDB";
const STORE_NAME = "recordings_store";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

export function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function savePersistentRecording(meta, blob) {
  try {
    let dataUrl = "";
    if (blob) {
      dataUrl = await blobToDataURL(blob);
    } else {
      dataUrl = meta.videoUrl || "";
    }

    const recordingObj = {
      ...meta,
      videoUrl: dataUrl,
    };

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(recordingObj);

    return new Promise((resolve) => {
      tx.oncomplete = () => {
        // Also save index meta to localStorage for instant UI responsiveness
        const index = getRecordingsIndex();
        const updatedIndex = [
          {
            id: meta.id,
            title: meta.title,
            roomId: meta.roomId,
            date: meta.date,
            duration: meta.duration,
            size: meta.size,
          },
          ...index.filter((r) => r.id !== meta.id),
        ];
        localStorage.setItem(
          "syncmeet_recordings_index",
          JSON.stringify(updatedIndex),
        );
        resolve(recordingObj);
      };
    });
  } catch (err) {
    console.error("IndexedDB save failed:", err);
    return meta;
  }
}

export async function getPersistentRecordings() {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const records = req.result || [];
        resolve(records.sort((a, b) => b.id.localeCompare(a.id)));
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function deletePersistentRecording(id) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);

    const index = getRecordingsIndex().filter((r) => r.id !== id);
    localStorage.setItem("syncmeet_recordings_index", JSON.stringify(index));

    return getPersistentRecordings();
  } catch (err) {
    console.error("Failed to delete recording:", err);
    return [];
  }
}

function getRecordingsIndex() {
  try {
    return JSON.parse(
      localStorage.getItem("syncmeet_recordings_index") || "[]",
    );
  } catch {
    return [];
  }
}

// Fallback synchronous methods for initial render
export function getRecordings() {
  return getRecordingsIndex();
}
export function saveRecording(recording) {
  savePersistentRecording(recording);
  return getRecordingsIndex();
}
export function deleteRecording(id) {
  deletePersistentRecording(id);
  return getRecordingsIndex();
}
