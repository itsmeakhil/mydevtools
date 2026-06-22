"use client"

import * as React from "react"
import { ApiRequestState, API_CLIENT_DEFAULT_TAB_NAME } from "../types"

const TABS_STORAGE_KEY = "api-client-tabs"
const ACTIVE_TAB_STORAGE_KEY = "api-client-active-tab"

export const createNewTab = (): ApiRequestState => ({
    id: crypto.randomUUID(),
    name: API_CLIENT_DEFAULT_TAB_NAME,
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
})

type TabsState = {
    tabs: ApiRequestState[]
    activeTabId: string
    activeTab: ApiRequestState
}

type TabsActions = {
    addTab(): void
    appendTab(tab: ApiRequestState): void
    closeTab(id: string): void
    duplicateTab(id: string): void
    renameTab(id: string, name: string): void
    reorderTabs(next: ApiRequestState[]): void
    setActiveTabId(id: string): void
    updateActiveTab(updates: Partial<ApiRequestState>): void
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

    // Keep a ref to the latest tabs so the unmount-flush handler always sees
    // the freshest snapshot without needing it in the effect dependency array.
    const tabsRef = React.useRef(tabs)
    React.useEffect(() => {
        tabsRef.current = tabs
    })

    // Save tabs to localStorage — strip `response`/`isLoading` (responses can be MBs and
    // would blow the per-origin localStorage quota). Writes are debounced to 500ms so rapid
    // edits (e.g. typing in the URL input) don't saturate the storage layer.
    React.useEffect(() => {
        if (!isInitialized) return
        const timeoutId = setTimeout(() => {
            const slim = tabsRef.current.map((t) => {
                const { response: _r, isLoading: _l, ...rest } = t
                return rest
            })
            try {
                localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(slim))
            } catch (e) {
                console.warn("api-client tabs: localStorage write failed, dropping persisted state", e)
                try { localStorage.removeItem(TABS_STORAGE_KEY) } catch { /* noop */ }
            }
        }, 500)
        return () => clearTimeout(timeoutId)
    }, [tabs, isInitialized])

    // Flush the latest tab state immediately on unmount so mid-debounce edits
    // are not lost when the user navigates away.
    React.useEffect(() => {
        return () => {
            const slim = tabsRef.current.map((t) => {
                const { response: _r, isLoading: _l, ...rest } = t
                return rest
            })
            try {
                localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(slim))
            } catch { /* noop */ }
        }
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

    const updateActiveTab = React.useCallback((updates: Partial<ApiRequestState>) => {
        setTabs((prev) =>
            prev.map((tab) =>
                tab.id === activeTabId ? { ...tab, ...updates } : tab
            )
        )
    }, [activeTabId])

    const appendTab = React.useCallback((tab: ApiRequestState) => {
        setTabs((prev) => [...prev, tab])
        setActiveTabId(tab.id)
    }, [])

    const actions = React.useMemo<TabsActions>(() => ({
        addTab() {
            const newTab = createNewTab()
            setTabs((prev) => [...prev, newTab])
            setActiveTabId(newTab.id)
        },

        appendTab,

        closeTab(id: string) {
            setTabs((prev) => {
                if (prev.length === 1) {
                    const newTab = createNewTab()
                    setActiveTabId(newTab.id)
                    return [newTab]
                }

                const closedIdx = prev.findIndex((t) => t.id === id)
                const newTabs = prev.filter((t) => t.id !== id)

                setActiveTabId((currentActiveId) => {
                    if (currentActiveId === id) {
                        const nextIdx = Math.min(closedIdx, newTabs.length - 1)
                        return newTabs[nextIdx]!.id
                    }
                    return currentActiveId
                })

                return newTabs
            })
        },

        duplicateTab(id: string) {
            setTabs((prev) => {
                const source = prev.find((t) => t.id === id)
                if (!source) return prev
                const newTab: ApiRequestState = {
                    ...source,
                    id: crypto.randomUUID(),
                    response: null,
                    isLoading: false,
                }
                const sourceIdx = prev.findIndex((t) => t.id === id)
                const next = [...prev]
                next.splice(sourceIdx + 1, 0, newTab)
                setActiveTabId(newTab.id)
                return next
            })
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
