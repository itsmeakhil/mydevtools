/**
 * Register the API-client service worker. Idempotent; safe to call multiple times.
 * Scope narrowed so other parts of the site stay un-cached.
 */

export async function registerApiClientServiceWorker(): Promise<void> {
    if (typeof navigator === "undefined") return
    if (!("serviceWorker" in navigator)) return
    if (process.env.NODE_ENV === "development") return  // dev hot-reload doesn't mix with SW caches
    try {
        await navigator.serviceWorker.register("/api-client-sw.js", { scope: "/app/api-client" })
    } catch (err) {
        // SW failure is non-fatal — collections still load via direct fetch.
        console.warn("api-client SW registration failed", err)
    }
}

export async function unregisterApiClientServiceWorker(): Promise<void> {
    if (typeof navigator === "undefined") return
    if (!("serviceWorker" in navigator)) return
    const reg = await navigator.serviceWorker.getRegistration("/app/api-client")
    if (reg) await reg.unregister()
}
