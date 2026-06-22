const inflight = new Map<string, Promise<unknown>>()

export function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = inflight.get(key) as Promise<T> | undefined
    if (existing) return existing

    const p = (async () => {
        try {
            return await fn()
        } finally {
            inflight.delete(key)
        }
    })()

    inflight.set(key, p as Promise<unknown>)
    return p
}

/** Test-only: reset the in-flight map between cases. */
export function clearInflight(): void {
    inflight.clear()
}
