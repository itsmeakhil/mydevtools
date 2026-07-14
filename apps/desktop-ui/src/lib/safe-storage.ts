/**
 * Safe localStorage wrappers that swallow QuotaExceededError and other
 * runtime failures (private mode, disabled storage, etc) so a single failed
 * setItem cannot crash a React render or unmount the route.
 *
 * Use these in any mount-path useEffect that persists state.
 */

function isStorageAvailable(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function safeGetItem(key: string): string | null {
    if (!isStorageAvailable()) return null
    try {
        return window.localStorage.getItem(key)
    } catch {
        return null
    }
}

export function safeSetItem(key: string, value: string): boolean {
    if (!isStorageAvailable()) return false
    try {
        window.localStorage.setItem(key, value)
        return true
    } catch (e) {
        console.warn(`safe-storage: setItem failed for "${key}" (likely quota); dropping value`, e)
        try { window.localStorage.removeItem(key) } catch { /* noop */ }
        return false
    }
}

export function safeRemoveItem(key: string): void {
    if (!isStorageAvailable()) return
    try {
        window.localStorage.removeItem(key)
    } catch { /* noop */ }
}

/** JSON.stringify + setItem with quota-safe fallback. Returns success. */
export function safeSetJSON(key: string, value: unknown): boolean {
    let serialized: string
    try {
        serialized = JSON.stringify(value)
    } catch (e) {
        console.warn(`safe-storage: JSON.stringify failed for "${key}"`, e)
        return false
    }
    return safeSetItem(key, serialized)
}

/** getItem + JSON.parse with safe fallback. Returns `null` on miss or parse error. */
export function safeGetJSON<T>(key: string): T | null {
    const raw = safeGetItem(key)
    if (raw === null) return null
    try {
        return JSON.parse(raw) as T
    } catch (e) {
        console.warn(`safe-storage: JSON.parse failed for "${key}", removing`, e)
        safeRemoveItem(key)
        return null
    }
}
