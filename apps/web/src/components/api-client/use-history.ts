"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { HistoryRequest, CollectionRequest } from "./types"
import { auth } from "@/database/firebase"
import { useAuthState } from "react-firebase-hooks/auth"
import { backendFetch } from "@/lib/backend-auth"
import { broadcastApiClientUpdate, useApiClientSyncListener } from "@/lib/api-client-sync"

const HISTORY_STORAGE_KEY = "api-client-history"
const HISTORY_LIMIT = 100

/**
 * Drop heavy file payloads before persisting history entries to localStorage.
 * A single 3MB upload is enough to blow the 5MB quota with one entry; history
 * only needs the request shape, not the bytes — the user re-picks the file
 * on replay anyway.
 */
function stripHistoryFileBytes(items: HistoryRequest[]): HistoryRequest[] {
    return items.map((item) => {
        const formData = item.body?.formData
        if (!formData?.some((f) => f.valueType === "file" && f.fileContentBase64)) {
            return item
        }
        return {
            ...item,
            body: {
                ...item.body,
                formData: formData.map((f) =>
                    f.valueType === "file" && f.fileContentBase64
                        ? { ...f, fileContentBase64: "" }
                        : f
                ),
            },
        }
    })
}

function isQuotaExceededError(err: unknown): boolean {
    if (!(err instanceof DOMException)) return false
    return (
        err.name === "QuotaExceededError" ||
        err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
        err.code === 22 ||
        err.code === 1014
    )
}

/** Persist `items`, shedding oldest entries on quota errors until it fits (or we give up). */
function persistHistoryWithFallback(items: HistoryRequest[]): HistoryRequest[] {
    let attempt = stripHistoryFileBytes(items)
    for (let i = 0; i < 5; i++) {
        try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(attempt))
            return attempt
        } catch (err) {
            if (!isQuotaExceededError(err)) {
                console.warn("api-client history: localStorage write failed", err)
                return items
            }
            // Halve and retry.
            const next = attempt.slice(0, Math.floor(attempt.length / 2))
            if (next.length === attempt.length || next.length === 0) {
                try { localStorage.removeItem(HISTORY_STORAGE_KEY) } catch { /* noop */ }
                return items
            }
            attempt = next
        }
    }
    return items
}

export function useHistory() {
    const [user, loading] = useAuthState(auth)
    const [history, setHistory] = useState<HistoryRequest[]>([])
    const [isHistoryLoading, setIsHistoryLoading] = useState(true)
    const migrationRanRef = useRef(false)

    const authedFetch = useCallback(
        async (path: string, init?: RequestInit) => {
            if (!user) throw new Error("Not authenticated")
            const res = await backendFetch(path, {
                ...init,
                headers: {
                    "Content-Type": "application/json",
                    ...(init?.headers || {}),
                },
            })
            if (!res.ok) {
                const text = await res.text().catch(() => "")
                throw new Error(text || `Request failed (${res.status})`)
            }
            return res
        },
        [user]
    )

    useEffect(() => {
        if (!user) migrationRanRef.current = false
    }, [user])

    const reload = useCallback(async () => {
        if (!user) return
        try {
            const res = await authedFetch(
                `/api/backend/api-client/history?limit=${HISTORY_LIMIT}`,
                { method: "GET" },
            )
            setHistory((await res.json()) as HistoryRequest[])
        } catch (e) {
            console.error("Failed to reload history", e)
        }
    }, [user, authedFetch])

    useApiClientSyncListener("history", () => { void reload() })

    // Load history: MongoDB when signed in, otherwise localStorage
    useEffect(() => {
        if (loading) return

        if (!user) {
            const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
            if (stored) {
                try {
                    setHistory(JSON.parse(stored) as HistoryRequest[])
                } catch (e) {
                    console.error("Failed to parse history", e)
                    setHistory([])
                }
            } else {
                setHistory([])
            }
            setIsHistoryLoading(false)
            return
        }

        let cancelled = false
        ;(async () => {
            try {
                const res = await authedFetch(
                    `/api/backend/api-client/history?limit=${HISTORY_LIMIT}`,
                    { method: "GET" }
                )
                const items = (await res.json()) as HistoryRequest[]
                if (!cancelled) {
                    setHistory(items)
                    setIsHistoryLoading(false)
                }
            } catch (e) {
                console.error("Failed to load API client history", e)
                if (!cancelled) {
                    setHistory([])
                    setIsHistoryLoading(false)
                }
            }
        })()

        return () => {
            cancelled = true
        }
    }, [user, loading, authedFetch])

    // One-time migration: localStorage → MongoDB when server history is empty
    useEffect(() => {
        const migrate = async () => {
            if (loading || !user || migrationRanRef.current) return
            const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
            if (!stored) return
            if (history.length > 0) return

            migrationRanRef.current = true
            try {
                const localItems: HistoryRequest[] = JSON.parse(stored)
                const ordered = [...localItems].sort((a, b) => a.timestamp - b.timestamp)
                for (const item of ordered) {
                    const { id: _id, ...rest } = item
                    await authedFetch("/api/backend/api-client/history", {
                        method: "POST",
                        body: JSON.stringify({
                            method: rest.method,
                            url: rest.url,
                            params: rest.params,
                            headers: rest.headers,
                            body: rest.body,
                            auth: rest.auth,
                            name: rest.name,
                            status: rest.status,
                            timestamp: rest.timestamp,
                        }),
                    })
                }
                // Reconcile from server-confirmed history BEFORE deleting the local backup;
                // a mid-flight tab close should never leave the user with nothing.
                const refreshed = await authedFetch(
                    `/api/backend/api-client/history?limit=${HISTORY_LIMIT}`,
                    { method: "GET" }
                )
                setHistory((await refreshed.json()) as HistoryRequest[])
                localStorage.removeItem(HISTORY_STORAGE_KEY)
            } catch (e) {
                migrationRanRef.current = false
                console.error("History migration failed", e)
            }
        }
        void migrate()
    }, [user, loading, history.length, authedFetch])

    const addHistoryItem = useCallback(
        async (
            request: Omit<CollectionRequest, "id" | "name">,
            name: string,
            status?: number
        ) => {
            const timestamp = Date.now()
            const payload = {
                ...request,
                name,
                timestamp,
                status,
            }

            if (user) {
                try {
                    const res = await authedFetch("/api/backend/api-client/history", {
                        method: "POST",
                        body: JSON.stringify(payload),
                    })
                    const created = (await res.json()) as HistoryRequest
                    setHistory((prev) => [created, ...prev].slice(0, HISTORY_LIMIT))
                    broadcastApiClientUpdate("history")
                } catch (e) {
                    console.error("Failed to save history entry", e)
                }
                return
            }

            setHistory((prev) => {
                const newItem: HistoryRequest = {
                    ...request,
                    id: crypto.randomUUID(),
                    name,
                    timestamp,
                    status,
                }
                const next = [newItem, ...prev].slice(0, HISTORY_LIMIT)
                return persistHistoryWithFallback(next)
            })
        },
        [user, authedFetch]
    )

    const clearHistory = useCallback(async () => {
        if (user) {
            try {
                await authedFetch("/api/backend/api-client/history/clear", { method: "DELETE" })
                setHistory([])
                broadcastApiClientUpdate("history")
            } catch (e) {
                console.error("Failed to clear history", e)
            }
            return
        }
        setHistory([])
        try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([]))
        } catch { /* noop */ }
    }, [user, authedFetch])

    const deleteHistoryItem = useCallback(
        async (id: string) => {
            if (user) {
                try {
                    await authedFetch(`/api/backend/api-client/history/${id}`, { method: "DELETE" })
                    setHistory((prev) => prev.filter((item) => item.id !== id))
                    broadcastApiClientUpdate("history")
                } catch (e) {
                    console.error("Failed to delete history entry", e)
                }
                return
            }
            setHistory((prev) => {
                const next = prev.filter((item) => item.id !== id)
                return persistHistoryWithFallback(next)
            })
        },
        [user, authedFetch]
    )

    return { history, isHistoryLoading, addHistoryItem, clearHistory, deleteHistoryItem }
}
