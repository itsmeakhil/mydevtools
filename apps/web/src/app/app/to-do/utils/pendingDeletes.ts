import { Task } from "@/app/app/to-do/types/Task";

const DB_NAME = "todo-app";
const DB_VERSION = 1;
const STORE_NAME = "pending-deletes";

export interface PendingDelete {
  taskId: string;
  task: Task;
  deleteAt: number;
  userId: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "taskId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function promisifyRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueuePendingDelete(entry: PendingDelete): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    await promisifyRequest(tx.objectStore(STORE_NAME).put(entry));
    db.close();
  } catch (err) {
    console.warn("pendingDeletes.enqueue failed", err);
  }
}

export async function removePendingDelete(taskId: string): Promise<void> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    await promisifyRequest(tx.objectStore(STORE_NAME).delete(taskId));
    db.close();
  } catch (err) {
    console.warn("pendingDeletes.remove failed", err);
  }
}

export async function getAllPendingDeletes(userId: string): Promise<PendingDelete[]> {
  try {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readonly");
    const all = await promisifyRequest(tx.objectStore(STORE_NAME).getAll());
    db.close();
    return ((all as PendingDelete[]) ?? []).filter((entry) => entry.userId === userId);
  } catch (err) {
    console.warn("pendingDeletes.getAll failed", err);
    return [];
  }
}
