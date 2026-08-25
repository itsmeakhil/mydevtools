"use client"

import * as React from "react"
import { ApiRequestState, API_CLIENT_DEFAULT_TAB_NAME } from "../types"

const TABS_STORAGE_KEY = "api-client-tabs"
const ACTIVE_TAB_STORAGE_KEY = "api-client-active-tab"

/**
 * Shape a tab for localStorage. Always drops runtime state (response, loading,
 * websocket transcript) and the re-fetchable GraphQL schema. With `aggressive`
 * it also drops saved-example bodies and uploaded file bytes — used only as a
 * fallback when the full copy overflows the ~5 MB quota, so one big example
 * can't wipe every open tab.
 */
export function slimTabsForStorage(tabs: ApiRequestState[], aggressive = false): Partial<ApiRequestState>[] {
    return tabs.map((t) => {
        const { response: _r, isLoading: _l, websocket: _ws, graphqlSchema: _gs, ...rest } = t
        if (!aggressive) return rest
        return {
            ...rest,
            examples: rest.examples?.map((e) => ({ ...e, response: { ...e.response, body: "" } })),
            body: {
                ...rest.body,
                formData: rest.body.formData?.map((f) =>
                    f.fileContentBase64 ? { ...f, fileContentBase64: "" } : f),
            },
        }
    })
}

function persistTabs(tabs: ApiRequestState[]) {
    for (const aggressive of [false, true]) {
        try {
            localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(slimTabsForStorage(tabs, aggressive)))
            return
        } catch (e) {
            console.warn(`api-client tabs: localStorage write failed (aggressive=${aggressive})`, e)
        }
    }
}

export const createNewTab = (kind: "rest" | "websocket" | "grpc" = "rest"): ApiRequestState => ({
    id: crypto.randomUUID(),
    name: kind === "websocket" ? "New WebSocket" : kind === "grpc" ? "New gRPC" : API_CLIENT_DEFAULT_TAB_NAME,
    kind,
    method: "GET",
    url: "",
    params: [{ id: "1", key: "", value: "", active: true }],
    headers: [{ id: "1", key: "", value: "", active: true }],
    body: {
        type: "none",
        content: "",
        formData: [{ id: crypto.randomUUID(), key: "", value: "", active: true, valueType: "text" }],
        urlEncoded: [{ id: crypto.randomUUID(), key: "", value: "", active: true }],
    },
    auth: { type: "none" },
    response: null,
    isLoading: false,
    ...(kind === "websocket" && {
        websocket: { status: "idle", messages: [], draft: "" },
    }),
    ...(kind === "grpc" && {
        grpc: { protoSource: "", requestJson: "{}\n" },
    }),
})

type TabsState = {
    tabs: ApiRequestState[]
    activeTabId: string
    activeTab: ApiRequestState
}

type TabsActions = {
    addTab(kind?: "rest" | "websocket" | "grpc"): void
    appendTab(tab: ApiRequestState): void
    closeTab(id: string): void
    duplicateTab(id: string): void
    renameTab(id: string, name: string): void
    reorderTabs(next: ApiRequestState[]): void
    setActiveTabId(id: string): void
    updateActiveTab(updates: Partial<ApiRequestState> | ((tab: ApiRequestState) => Partial<ApiRequestState>)): void
}

const TabsStateCtx = React.createContext<TabsState | null>(null)
const TabsActionsCtx = React.createContext<TabsActions | null>(null)

export function TabsProvider({ children }: { children: React.ReactNode }) {
    const initialTab = React.useMemo(() => createNewTab(), [])
    const [tabs, setTabs] = React.useState<ApiRequestState[]>([initialTab])
    const [activeTabId, setActiveTabId] = React.useState<string>(initialTab.id)
    const [isInitialized, setIsInitialized] = React.useState(false)

    const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0]

    // Load state from localStorage (once on mount)
    React.useEffect(() => {
        const storedTabs = localStorage.getItem(TABS_STORAGE_KEY)
        const storedActiveTabId = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)

        if (storedTabs) {
            try {
                const parsedTabs = JSON.parse(storedTabs)
                if (Array.isArray(parsedTabs) && parsedTabs.length > 0) {
                    // Drop persisted responses from older builds — they could carry MB-sized
                    // bodies that blow the per-origin localStorage quota.
                    const sanitized = parsedTabs.map((t: ApiRequestState) => ({
                        ...t,
                        response: null,
                        isLoading: false,
                    }))
                    setTabs(sanitized)
                    if (storedActiveTabId) {
                        setActiveTabId(storedActiveTabId)
                    } else {
                        setActiveTabId(sanitized[0].id)
                    }
                }
            } catch (e) {
                console.error("Failed to parse stored tabs", e)
                try { localStorage.removeItem(TABS_STORAGE_KEY) } catch { /* noop */ }
            }
        }
        setIsInitialized(true)
    }, [])

    // Keep refs to latest tabs and activeTabId so callbacks always see the
    // freshest snapshot without stale-closure issues.
    const tabsRef = React.useRef(tabs)
    const activeTabIdRef = React.useRef(activeTabId)
    React.useEffect(() => {
        tabsRef.current = tabs
    })
    React.useEffect(() => {
        activeTabIdRef.current = activeTabId
    })

    // Save tabs to localStorage. Writes are debounced to 500ms so rapid edits
    // (e.g. typing in the URL input) don't saturate the storage layer.
    React.useEffect(() => {
        if (!isInitialized) return
        const timeoutId = setTimeout(() => persistTabs(tabsRef.current), 500)
        return () => clearTimeout(timeoutId)
    }, [tabs, isInitialized])

    // Flush the latest tab state immediately on unmount so mid-debounce edits
    // are not lost when the user navigates away.
    React.useEffect(() => {
        return () => { persistTabs(tabsRef.current) }
    }, [])

    // Save active tab id to localStorage
    React.useEffect(() => {
        if (!isInitialized) return
        try {
            localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTabId)
        } catch (e) {
            console.warn("api-client active tab: localStorage write failed", e)
        }
    }, [activeTabId, isInitialized])

    const updateActiveTab = React.useCallback((
        updates: Partial<ApiRequestState> | ((tab: ApiRequestState) => Partial<ApiRequestState>)
    ) => {
        setTabs((prev) =>
            prev.map((tab) => {
                if (tab.id !== activeTabId) return tab
                const patch = typeof updates === "function" ? updates(tab) : updates
                return { ...tab, ...patch }
            })
        )
    }, [activeTabId])

    const appendTab = React.useCallback((tab: ApiRequestState) => {
        setTabs((prev) => [...prev, tab])
        setActiveTabId(tab.id)
    }, [])

    const actions = React.useMemo<TabsActions>(() => ({
        addTab(kind: "rest" | "websocket" | "grpc" = "rest") {
            const newTab = createNewTab(kind)
            setTabs((prev) => [...prev, newTab])
            setActiveTabId(newTab.id)
        },

        appendTab,

        closeTab(id: string) {
            // Compute all state outside updaters so they remain pure (no side
            // effects, safe for React StrictMode double-invocation).
            const current = tabsRef.current
            if (current.length === 1) {
                const newTab = createNewTab()
                setTabs([newTab])
                setActiveTabId(newTab.id)
                return
            }
            const closedIdx = current.findIndex((t) => t.id === id)
            const next = current.filter((t) => t.id !== id)
            setTabs(next)
            if (activeTabIdRef.current === id) {
                const nextIdx = Math.min(closedIdx, next.length - 1)
                setActiveTabId(next[nextIdx]!.id)
            }
        },

        duplicateTab(id: string) {
            const current = tabsRef.current
            const source = current.find((t) => t.id === id)
            if (!source) return
            const newTab: ApiRequestState = {
                ...source,
                id: crypto.randomUUID(),
                response: null,
                isLoading: false,
            }
            const sourceIdx = current.findIndex((t) => t.id === id)
            const next = [...current]
            next.splice(sourceIdx + 1, 0, newTab)
            setTabs(next)
            setActiveTabId(newTab.id)
        },

        renameTab(id: string, name: string) {
            setTabs((prev) => prev.map((tab) => tab.id === id ? { ...tab, name } : tab))
        },

        reorderTabs(next: ApiRequestState[]) {
            setTabs(next)
        },

        setActiveTabId(id: string) {
            setActiveTabId(id)
        },

        updateActiveTab,
    }), [updateActiveTab, appendTab])

    const state = React.useMemo<TabsState>(() => ({
        tabs,
        activeTabId,
        activeTab: activeTab!,
    }), [tabs, activeTabId, activeTab])

    return (
        <TabsStateCtx.Provider value={state}>
            <TabsActionsCtx.Provider value={actions}>
                {children}
            </TabsActionsCtx.Provider>
        </TabsStateCtx.Provider>
    )
}

export function useTabs(): TabsState {
    const v = React.useContext(TabsStateCtx)
    if (!v) throw new Error("useTabs must be used within a TabsProvider")
    return v
}

export function useTabsActions(): TabsActions {
    const v = React.useContext(TabsActionsCtx)
    if (!v) throw new Error("useTabsActions must be used within a TabsProvider")
    return v
}
