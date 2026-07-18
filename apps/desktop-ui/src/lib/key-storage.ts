
// ── Password-manager vault key ────────────────────────────────────────────────
const DB_NAME = "PasswordManagerDB";
const STORE_NAME = "keys";
const KEY_ID = "vaultKey";
const IS_DEV = typeof process !== "undefined" && process.env?.NODE_ENV === "development";

export const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.indexedDB) {
            reject(new Error("IndexedDB not supported"));
            return;
        }
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const saveKey = async (key: CryptoKey): Promise<void> => {
    try {
        const db = await openDB();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(key, KEY_ID);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // Verify the key was actually saved (important for mobile browsers)
        const savedKey = await loadKey();
        if (!savedKey) {
            if (IS_DEV) console.error("[Key Storage] Verification failed: Key was not found after saving");
            throw new Error("Failed to verify key persistence");
        }
    } catch (e) {
        if (IS_DEV) console.error("[Key Storage] Failed to save key:", e);
        throw e; // Re-throw so calling code knows save failed
    }
};

export const loadKey = async (): Promise<CryptoKey | null> => {
    try {
        const db = await openDB();
        const key = await new Promise<CryptoKey | null>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(KEY_ID);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });

        return key;
    } catch (e) {
        if (IS_DEV) console.error("[Key Storage] Failed to load key:", e);
        return null;
    }
};

export const clearKey = async (): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readwrite");
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(KEY_ID);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (e) {
        if (IS_DEV) console.error("Failed to clear key:", e);
    }
};

// ── Global master key ─────────────────────────────────────────────────────────
// The master key is intentionally NOT persisted — it lives only in the in-memory
// store while the app runs, so the vault re-locks on every restart. clearMasterKey
// remains to wipe any key left behind by older builds that did persist it.

const MASTER_DB_NAME = "MasterKeyDB";
const MASTER_STORE_NAME = "keys";
const MASTER_KEY_ID = "masterKey";

const openMasterDB = (): Promise<IDBDatabase> =>
    new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !window.indexedDB) {
            reject(new Error("IndexedDB not supported"));
            return;
        }
        const req = indexedDB.open(MASTER_DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(MASTER_STORE_NAME)) {
                db.createObjectStore(MASTER_STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

export const clearMasterKey = async (): Promise<void> => {
    try {
        const db = await openMasterDB();
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(MASTER_STORE_NAME, "readwrite");
            tx.objectStore(MASTER_STORE_NAME).delete(MASTER_KEY_ID);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        if (IS_DEV) console.error("[MasterKey] Failed to clear master key:", e);
    }
};
