"use client"

import * as React from "react"
import { useHistory } from "../use-history"
import type { HistoryRequest, CollectionRequest } from "../types"

// ── Types ──────────────────────────────────────────────────────────────────

type HistoryState = {
    history: HistoryRequest[]
}

type HistoryActions = {
    addHistoryItem: (
        request: Omit<CollectionRequest, "id" | "name">,
        name: string,
        status?: number
    ) => Promise<void>
    clearHistory: () => Promise<void>
    deleteHistoryItem: (id: string) => Promise<void>
}

// ── Contexts ───────────────────────────────────────────────────────────────

const HistoryStateCtx = React.createContext<HistoryState | null>(null)
const HistoryActionsCtx = React.createContext<HistoryActions | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────

export function HistoryProvider({ children }: { children: React.ReactNode }) {
    const { history, addHistoryItem, clearHistory, deleteHistoryItem } = useHistory()

    const state = React.useMemo<HistoryState>(
        () => ({ history }),
        [history]
    )

    const actions = React.useMemo<HistoryActions>(
        () => ({ addHistoryItem, clearHistory, deleteHistoryItem }),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [addHistoryItem, clearHistory, deleteHistoryItem]
    )

    return (
        <HistoryStateCtx.Provider value={state}>
            <HistoryActionsCtx.Provider value={actions}>
                {children}
            </HistoryActionsCtx.Provider>
        </HistoryStateCtx.Provider>
    )
}

// ── Consumer hooks ─────────────────────────────────────────────────────────

export function useHistoryState(): HistoryState {
    const v = React.useContext(HistoryStateCtx)
    if (!v) throw new Error("useHistoryState must be used within a HistoryProvider")
    return v
}

export function useHistoryActions(): HistoryActions {
    const v = React.useContext(HistoryActionsCtx)
    if (!v) throw new Error("useHistoryActions must be used within a HistoryProvider")
    return v
}
