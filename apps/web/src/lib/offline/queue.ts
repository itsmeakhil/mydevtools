/**
 * Offline mutation queue.
 *
 * When a backend mutation fails because the user is offline (or the server is
 * unreachable), it lands here. Reconnect drains the queue automatically.
 *
 * Survives reload via localStorage. Drops requests older than 7 days to avoid
 * stale auth tokens shipping months-old payloads.
 */

const STORAGE_KEY = "api-client-offline-queue"
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export interface QueuedMutation {
    id: string
    /** Endpoint path (relative to /api/backend or full). */
    path: string
    method: "POST" | "PUT" | "PATCH" | "DELETE"
    body?: string
    /** Free-form label for the offline UI ("Save request 'login'", "Rename collection X"). */
    label: string
    queuedAt: number
}

function read(): QueuedMutation[] {
    if (typeof window === "undefined") return []
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw) as QueuedMutation[]
        const cutoff = Date.now() - MAX_AGE_MS
        return parsed.filter((m) => m.queuedAt >= cutoff)
    } catch { return [] }
}

function write(queue: QueuedMutation[]): void {
    if (typeof window === "undefined") return
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(queue)) }
    catch { /* quota or storage error — drop silently */ }
}

type Listener = (queue: QueuedMutation[]) => void
const listeners = new Set<Listener>()

function notify(): void {
    const q = read()
    for (const fn of listeners) {
        try { fn(q) } catch { /* noop */ }
    }
}

export function subscribe(fn: Listener): () => void {
    listeners.add(fn)
    fn(read())
    return () => listeners.delete(fn)
}

export function enqueue(mutation: Omit<QueuedMutation, "id" | "queuedAt">): void {
    const queue = read()
    queue.push({
        ...mutation,
        id: crypto.randomUUID(),
        queuedAt: Date.now(),
    })
    write(queue)
    notify()
}

export function dequeue(id: string): void {
    write(read().filter((m) => m.id !== id))
    notify()
}

export function listQueue(): QueuedMutation[] { return read() }

/** Replay every pending mutation. Stops on first network failure to preserve order. */
export async function drainQueue(
    fetcher: (path: string, init: RequestInit) => Promise<Response>,
): Promise<{ succeeded: number; failed: number }> {
    let succeeded = 0, failed = 0
    const queue = read()
    for (const m of queue) {
        try {
            const res = await fetcher(m.path, {
                method: m.method,
                headers: { "Content-Type": "application/json" },
                body: m.body,
            })
            if (!res.ok) { failed++; break }
            dequeue(m.id)
            succeeded++
        } catch {
            failed++
            break  // keep ordering; next reconnect will retry
        }
    }
    return { succeeded, failed }
}
