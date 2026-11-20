"use client"

import * as React from "react"
import { withoutFileBytes } from "@/lib/api-client/body-files"
import { ApiRequestState, API_CLIENT_DEFAULT_TAB_NAME } from "../types"

const TABS_STORAGE_KEY = "api-client-tabs"
const ACTIVE_TAB_STORAGE_KEY = "api-client-active-tab"
/** Set once tabs saved before `none` stopped meaning "inherit" are rewritten. */
const TABS_AUTH_V2_KEY = "api-client-tabs-auth-v2"

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
            body: withoutFileBytes(rest.body, ""),
        }
    })
}

/**
 * Tabs read back from localStorage. Drops persisted responses from older builds
 * (MB-sized bodies blow the per-origin quota). With `legacyAuth` (saved before
 * `none` stopped meaning "inherit"), a tab's `none` becomes `inherit` so it keeps
 * sending its folder/collection auth.
 */
export function restoreTabs(tabs: ApiRequestState[], legacyAuth: boolean): ApiRequestState[] {
    return tabs.map((t) => ({
        ...t,
        ...(legacyAuth && t.auth?.type === "none" && { auth: { ...t.auth, type: "inherit" as const } }),
        response: null,
        isLoading: false,
    }))
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

/** Move the tab `fromId` into `toId`'s slot; returns `tabs` unchanged when either id is missing. */
export function moveTab<T extends { id: string }>(tabs: T[], fromId: string, toId: string): T[] {
    const from = tabs.findIndex((t) => t.id === fromId)
    const to = tabs.findIndex((t) => t.id === toId)
    if (from === -1 || to === -1 || from === to) return tabs
    const next = [...tabs]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    return next
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
    auth: { type: "inherit" },
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
    /** Patch any tab by id (an async save may finish after the user switched tabs). */
    updateTab(id: string, patch: Partial<ApiRequestState> | ((tab: ApiRequestState) => Partial<ApiRequestState>)): void
    /** Move `fromId` to `toId`'s slot. Id-based so a memoized caller holding a stale tabs array can't overwrite edits. */
    reorderTabs(fromId: string, toId: string): void
    setActiveTabId(id: string): void
    updateActiveTab(updates: Partial<ApiRequestState> | ((tab: ApiRequestState) => Partial<ApiRequestState>)): void
}

const TabsStateCtx = React.createContext<TabsState | null>(null)
const TabsActionsCtx = React.createContext<TabsActions | null>(null)

/**
 * `id` when it names an open tab, otherwise the first tab's. The tab list is
 * persisted on a 500 ms debounce but the active id immediately, so quitting
 * right after opening a tab can store an id with no tab. Unresolved, the UI
 * shows tabs[0] while every edit targets the missing id and is dropped.
 */
export function resolveActiveTabId(tabs: Pick<ApiRequestState, "id">[], id: string): string {
    return tabs.some((t) => t.id === id) ? id : (tabs[0]?.id ?? id)
}

export function TabsProvider({ children }: { children: React.ReactNode }) {
    const initialTab = React.useMemo(() => createNewTab(), [])
    const [tabs, setTabs] = React.useState<ApiRequestState[]>([initialTab])
    const [storedActiveTabId, setActiveTabId] = React.useState<string>(initialTab.id)
    const activeTabId = resolveActiveTabId(tabs, storedActiveTabId)
    const [isInitialized, setIsInitialized] = React.useState(false)

    const activeTab = tabs.find((t) => t.id === activeTabId)!

    // Load state from localStorage (once on mount)
    React.useEffect(() => {
        const storedTabs = localStorage.getItem(TABS_STORAGE_KEY)
        const storedActiveTabId = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)

        if (storedTabs) {
            try {
                const parsedTabs = JSON.parse(storedTabs)
                if (Array.isArray(parsedTabs) && parsedTabs.length > 0) {
                    const legacyAuth = localStorage.getItem(TABS_AUTH_V2_KEY) === null
                    const sanitized = restoreTabs(parsedTabs, legacyAuth)
                    setTabs(sanitized)
                    if (legacyAuth) persistTabs(sanitized)
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
        // After any legacy rewrite above (fresh installs too): a `none` saved from now on is explicit.
        try { localStorage.setItem(TABS_AUTH_V2_KEY, "1") } catch { /* noop */ }
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
                // A copy is a new draft — ⌘S on it must not overwrite the original.
                source: undefined,
                savedFingerprint: undefined,
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

        updateTab(id: string, patch: Partial<ApiRequestState> | ((tab: ApiRequestState) => Partial<ApiRequestState>)) {
            setTabs((prev) => prev.map((tab) => tab.id === id ? { ...tab, ...(typeof patch === "function" ? patch(tab) : patch) } : tab))
        },

        reorderTabs(fromId: string, toId: string) {
            setTabs((prev) => moveTab(prev, fromId, toId))
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
