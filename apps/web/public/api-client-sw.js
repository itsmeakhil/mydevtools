/**
 * API-client service worker.
 *
 * Two jobs:
 *   1. Cache GET responses from `/api/backend/api-client/*` with stale-while-revalidate
 *      so the sidebar / collections render from cache offline.
 *   2. Pass-through for everything else.
 *
 * Scope limited to /app/api-client paths so we don't shadow the rest of the site.
 */

const CACHE_NAME = "mdt-api-client-v1"
const CACHED_PREFIXES = [
    "/api/backend/api-client/collections",
    "/api/backend/api-client/environments",
    "/api/backend/api-client/history",
]

self.addEventListener("install", (event) => {
    self.skipWaiting()
    event.waitUntil(caches.open(CACHE_NAME))
})

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    )
    self.clients.claim()
})

function isCacheable(url) {
    return CACHED_PREFIXES.some((p) => url.pathname.startsWith(p))
}

self.addEventListener("fetch", (event) => {
    if (event.request.method !== "GET") return
    const url = new URL(event.request.url)
    if (!isCacheable(url)) return

    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME)
        const cached = await cache.match(event.request)
        const networkPromise = fetch(event.request)
            .then(async (res) => {
                if (res.ok) await cache.put(event.request, res.clone())
                return res
            })
            .catch(() => null)
        if (cached) {
            // Refresh in background.
            event.waitUntil(networkPromise)
            return cached
        }
        const fresh = await networkPromise
        if (fresh) return fresh
        return new Response(JSON.stringify({ error: "offline + no cached copy" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
        })
    })())
})
