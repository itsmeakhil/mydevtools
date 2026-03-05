import { useState, useCallback, useEffect } from "react"
import { HistoryRequest, CollectionRequest } from "./types"

const HISTORY_STORAGE_KEY = "api-client-history"

export function useHistory() {
    const [history, setHistory] = useState<HistoryRequest[]>([])

    useEffect(() => {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
        if (stored) {
            try {
                setHistory(JSON.parse(stored))
            } catch (e) {
                console.error("Failed to parse history", e)
            }
        }
    }, [])

    const addHistoryItem = useCallback((request: Omit<CollectionRequest, "id" | "name">, name: string, status?: number) => {
        setHistory(prev => {
            const newItem: HistoryRequest = {
                ...request,
                id: crypto.randomUUID(),
                name,
                timestamp: Date.now(),
                status
            }
            const newHistory = [newItem, ...prev].slice(0, 100) // Keep last 100 requests
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory))
            return newHistory
        })
    }, [])

    const clearHistory = useCallback(() => {
        setHistory([])
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify([]))
    }, [])

    const deleteHistoryItem = useCallback((id: string) => {
        setHistory(prev => {
            const newHistory = prev.filter(item => item.id !== id)
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory))
            return newHistory
        })
    }, [])

    return { history, addHistoryItem, clearHistory, deleteHistoryItem }
}
