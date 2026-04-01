
const DB_NAME = "PasswordManagerDB";
const STORE_NAME = "keys";
const KEY_ID = "vaultKey";

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
        console.log("[Key Storage] Key saved to IndexedDB, verifying...");
        const savedKey = await loadKey();
        if (!savedKey) {
            console.error("[Key Storage] Verification failed: Key was not found after saving");
            throw new Error("Failed to verify key persistence");
        }
        console.log("[Key Storage] Key verified successfully in IndexedDB");
    } catch (e) {
        console.error("[Key Storage] Failed to save key:", e);
        throw e; // Re-throw so calling code knows save failed
    }
};

export const loadKey = async (): Promise<CryptoKey | null> => {
    try {
        console.log("[Key Storage] Attempting to load key from IndexedDB...");
        const db = await openDB();
        const key = await new Promise<CryptoKey | null>((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, "readonly");
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(KEY_ID);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });

        if (key) {
            console.log("[Key Storage] Key loaded successfully from IndexedDB");
        } else {
            console.log("[Key Storage] No key found in IndexedDB");
        }
        return key;
    } catch (e) {
        console.error("[Key Storage] Failed to load key:", e);
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
        console.error("Failed to clear key:", e);
    }
};
