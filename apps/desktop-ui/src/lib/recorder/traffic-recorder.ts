/**
 * Capture-replay traffic recorder.
 *
 * Sessions are arrays of request+response pairs. The recorder pushes pairs as
 * `handleSend` completes; the replay engine fires them sequentially against a
 * new env, returning a side-by-side log of original vs replay statuses.
 */

import type { RequestMethod } from "@/components/api-client/types"

export interface RecordedExchange {
    id: string
    timestamp: number
    request: {
        method: RequestMethod | string
        url: string
        headers: Record<string, string>
        body?: string
    }
    response: {
        status: number
        statusText: string
        timeMs: number
        bodyExcerpt: string  // first 4 KB to keep sessions small
    }
}

export interface RecordedSession {
    id: string
    name: string
    createdAt: number
    exchanges: RecordedExchange[]
}

const SESSIONS_KEY = "mdt-recorder-sessions"
const BODY_EXCERPT_MAX = 4096

function read(): RecordedSession[] {
    if (typeof window === "undefined") return []
    try {
        const raw = localStorage.getItem(SESSIONS_KEY)
        return raw ? (JSON.parse(raw) as RecordedSession[]) : []
    } catch { return [] }
}

function write(sessions: RecordedSession[]): void {
    if (typeof window === "undefined") return
    try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)) }
    catch { /* quota — drop */ }
}

let activeId: string | null = null

export function startSession(name: string): RecordedSession {
    const session: RecordedSession = {
        id: crypto.randomUUID(),
        name,
        createdAt: Date.now(),
        exchanges: [],
    }
    const all = read()
    all.push(session)
    write(all)
    activeId = session.id
    return session
}

export function stopSession(): void {
    activeId = null
}

export function getActiveSessionId(): string | null {
    return activeId
}

export function recordExchange(exchange: Omit<RecordedExchange, "id" | "timestamp">): void {
    if (!activeId) return
    const all = read()
    const target = all.find((s) => s.id === activeId)
    if (!target) return
    target.exchanges.push({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...exchange,
        response: {
            ...exchange.response,
            bodyExcerpt: exchange.response.bodyExcerpt.slice(0, BODY_EXCERPT_MAX),
        },
    })
    write(all)
}

export function listSessions(): RecordedSession[] { return read() }
export function getSession(id: string): RecordedSession | undefined {
    return read().find((s) => s.id === id)
}
export function deleteSession(id: string): void {
    const next = read().filter((s) => s.id !== id)
    write(next)
    if (activeId === id) activeId = null
}

/** Replay every exchange in `session` through `fetcher`; emit per-exchange status. */
export async function replaySession(
    session: RecordedSession,
    fetcher: (req: RecordedExchange["request"]) => Promise<{ status: number; timeMs: number }>,
    onResult?: (orig: RecordedExchange, replay: { status: number; timeMs: number; diff: boolean }) => void,
): Promise<{ matched: number; mismatched: number }> {
    let matched = 0, mismatched = 0
    for (const ex of session.exchanges) {
        try {
            const r = await fetcher(ex.request)
            const diff = r.status !== ex.response.status
            if (diff) mismatched++
            else matched++
            onResult?.(ex, { ...r, diff })
        } catch {
            mismatched++
            onResult?.(ex, { status: 0, timeMs: 0, diff: true })
        }
    }
    return { matched, mismatched }
}
