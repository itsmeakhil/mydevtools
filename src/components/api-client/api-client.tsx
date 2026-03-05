"use client"

import * as React from "react"
import { Card } from "@/components/ui/card"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { RequestPanel } from "./request-panel"
import { RequestTabs } from "./request-tabs"
import { ResponsePanel } from "./response-panel"
import { TabBar } from "./tab-bar"
import { ImportCurlDialog } from "./import-curl-dialog"
import { parseCurlCommand } from "@/utils/curl-parser"
import { CollectionsSidebar } from "./collections/collections-sidebar"
import { useCollections } from "./collections/use-collections"
import { useHistory } from "./use-history"
import { useEnvironments } from "./use-environments"
import { EnvironmentManager } from "./environment-manager"
import { CodeGenerator } from "./code-generator"
import {
    RequestMethod,
    KeyValueItem,
    RequestBody,
    RequestAuth,
    ApiResponse,
    ApiRequestState,
    CollectionRequest,
} from "./types"
import { toast } from "sonner"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { FolderOpen } from "lucide-react"

const createNewTab = (): ApiRequestState => ({
    id: crypto.randomUUID(),
    name: "New Request",
    method: "GET",
    url: "",
    params: [{ id: "1", key: "", value: "", active: true }],
    headers: [{ id: "1", key: "", value: "", active: true }],
    body: { type: "none", content: "" },
    auth: { type: "none" },
    response: null,
    isLoading: false,
})

const TABS_STORAGE_KEY = "api-client-tabs"
const ACTIVE_TAB_STORAGE_KEY = "api-client-active-tab"

export function ApiClient() {
    const [tabs, setTabs] = React.useState<ApiRequestState[]>([createNewTab()])
    const [activeTabId, setActiveTabId] = React.useState<string>(tabs[0].id)
    const [isInitialized, setIsInitialized] = React.useState(false)
    const { collections, addFolder, deleteItem, saveRequest, toggleFolder, createCollection, renameCollection } = useCollections()
    const { history, addHistoryItem, clearHistory, deleteHistoryItem } = useHistory()
    const {
        environments,
        activeEnvId,
        setActiveEnvId,
        addEnvironment,
        updateEnvironment,
        deleteEnvironment,
        substituteVariables
    } = useEnvironments()

    const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0]
    const isMobile = useIsMobile()
    const [collectionsOpen, setCollectionsOpen] = React.useState(false)

    // Load state from localStorage
    React.useEffect(() => {
        const storedTabs = localStorage.getItem(TABS_STORAGE_KEY)
        const storedActiveTabId = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)

        if (storedTabs) {
            try {
                const parsedTabs = JSON.parse(storedTabs)
                if (Array.isArray(parsedTabs) && parsedTabs.length > 0) {
                    setTabs(parsedTabs)
                    if (storedActiveTabId) {
                        setActiveTabId(storedActiveTabId)
                    } else {
                        setActiveTabId(parsedTabs[0].id)
                    }
                }
            } catch (e) {
                console.error("Failed to parse stored tabs", e)
            }
        }
        setIsInitialized(true)
    }, [])

    // Save state to localStorage
    React.useEffect(() => {
        if (!isInitialized) return
        localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs))
    }, [tabs, isInitialized])

    React.useEffect(() => {
        if (!isInitialized) return
        localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTabId)
    }, [activeTabId, isInitialized])

    const updateActiveTab = (updates: Partial<ApiRequestState>) => {
        setTabs((prev) =>
            prev.map((tab) =>
                tab.id === activeTabId ? { ...tab, ...updates } : tab
            )
        )
    }

    const handleAddTab = () => {
        const newTab = createNewTab()
        setTabs((prev) => [...prev, newTab])
        setActiveTabId(newTab.id)
    }

    const handleCloseTab = (id: string) => {
        if (tabs.length === 1) {
            // Don't close the last tab, just reset it
            setTabs([createNewTab()])
            return
        }

        const newTabs = tabs.filter((t) => t.id !== id)
        setTabs(newTabs)

        if (activeTabId === id) {
            setActiveTabId(newTabs[newTabs.length - 1].id)
        }
    }

    const handleImportCurl = (curl: string) => {
        try {
            const parsed = parseCurlCommand(curl)
            const newTab: ApiRequestState = {
                ...createNewTab(),
                ...parsed,
                name: parsed.url || "Imported Request",
                id: crypto.randomUUID(),
            }
            setTabs((prev) => [...prev, newTab])
            setActiveTabId(newTab.id)
            toast.success("cURL imported successfully")
        } catch (error) {
            console.error(error)
            toast.error("Failed to parse cURL command")
        }
    }

    const handleSaveRequest = (parentId: string, name: string) => {
        const requestToSave: CollectionRequest = {
            id: crypto.randomUUID(),
            name,
            method: activeTab.method,
            url: activeTab.url,
            params: activeTab.params,
            headers: activeTab.headers,
            body: activeTab.body,
            auth: activeTab.auth,
        }
        saveRequest(parentId, requestToSave)
        updateActiveTab({ name })
    }

    const handleLoadRequest = (request: CollectionRequest) => {
        const newTab: ApiRequestState = {
            ...createNewTab(),
            ...request,
            id: crypto.randomUUID(), // New ID for the tab instance
            response: null,
            isLoading: false,
        }
        setTabs((prev) => [...prev, newTab])
        setActiveTabId(newTab.id)
    }

    const handleSend = async () => {
        if (!activeTab.url) return

        updateActiveTab({ isLoading: true, response: null })
        const startTime = performance.now()

        try {
            // Substitute variables in URL
            const finalUrl = substituteVariables(activeTab.url)

            // Construct URL with params
            const urlObj = new URL(finalUrl)
            activeTab.params.forEach((p) => {
                if (p.active && p.key) {
                    urlObj.searchParams.append(substituteVariables(p.key), substituteVariables(p.value))
                }
            })

            // Construct headers
            const headersObj: Record<string, string> = {}
            activeTab.headers.forEach((h) => {
                if (h.active && h.key) {
                    headersObj[substituteVariables(h.key)] = substituteVariables(h.value)
                }
            })

            // Add Auth
            if (activeTab.auth.type === "bearer" && activeTab.auth.token) {
                headersObj["Authorization"] = `Bearer ${substituteVariables(activeTab.auth.token)}`
            } else if (activeTab.auth.type === "basic" && activeTab.auth.username && activeTab.auth.password) {
                const credentials = btoa(`${substituteVariables(activeTab.auth.username)}:${substituteVariables(activeTab.auth.password)}`)
                headersObj["Authorization"] = `Basic ${credentials}`
            } else if (activeTab.auth.type === "api-key" && activeTab.auth.apiKeyKey && activeTab.auth.apiKeyValue) {
                const key = substituteVariables(activeTab.auth.apiKeyKey)
                const val = substituteVariables(activeTab.auth.apiKeyValue)
                if (activeTab.auth.apiKeyLocation === "query") {
                    urlObj.searchParams.append(key, val)
                } else {
                    headersObj[key] = val
                }
            }

            // Prepare body
            let bodyContent: string | null = null
            if (activeTab.method !== "GET" && activeTab.method !== "HEAD" && activeTab.body.type !== "none") {
                if (activeTab.body.type === "json") {
                    try {
                        const substitutedBody = substituteVariables(activeTab.body.content)
                        // Validate JSON
                        JSON.parse(substitutedBody)
                        bodyContent = substitutedBody
                        headersObj["Content-Type"] = "application/json"
                    } catch (e) {
                        toast.error("Invalid JSON body")
                        updateActiveTab({ isLoading: false })
                        return
                    }
                } else {
                    bodyContent = substituteVariables(activeTab.body.content)
                    if (!headersObj["Content-Type"]) {
                        headersObj["Content-Type"] = "text/plain"
                    }
                }
            }

            // Send via Proxy
            const res = await fetch("/api/proxy", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url: urlObj.toString(),
                    method: activeTab.method,
                    headers: headersObj,
                    body: bodyContent,
                }),
            })

            const proxyData = await res.json()

            let formattedBody = proxyData.body
            try {
                if (formattedBody && !proxyData.isBase64) {
                    formattedBody = JSON.stringify(JSON.parse(formattedBody), null, 2)
                }
            } catch {
                // Not JSON, keep as text
            }

            updateActiveTab({
                response: {
                    status: proxyData.status,
                    statusText: proxyData.statusText,
                    headers: proxyData.headers,
                    body: formattedBody,
                    isBase64: proxyData.isBase64,
                    time: proxyData.time,
                    size: proxyData.size,
                    error: proxyData.error,
                },
                isLoading: false,
            })

            addHistoryItem({
                method: activeTab.method,
                url: activeTab.url,
                params: activeTab.params,
                headers: activeTab.headers,
                body: activeTab.body,
                auth: activeTab.auth,
            }, activeTab.name !== "New Request" ? activeTab.name : activeTab.url, proxyData.status)

        } catch (error) {
            console.error(error)
            toast.error("Request failed: " + (error as Error).message)
            updateActiveTab({
                response: {
                    status: 0,
                    statusText: "Error",
                    headers: {},
                    body: (error as Error).message,
                    time: 0,
                    size: 0,
                    error: (error as Error).message,
                },
                isLoading: false,
            })

            addHistoryItem({
                method: activeTab.method,
                url: activeTab.url,
                params: activeTab.params,
                headers: activeTab.headers,
                body: activeTab.body,
                auth: activeTab.auth,
            }, activeTab.name !== "New Request" ? activeTab.name : activeTab.url, 0)
        }
    }

    const handleCurlPaste = (curl: string) => {
        try {
            const parsed = parseCurlCommand(curl)
            updateActiveTab({
                ...parsed,
                name: parsed.url || activeTab.name,
            })
            toast.success("cURL pasted and parsed successfully")
        } catch (error) {
            console.error(error)
            toast.error("Failed to parse cURL command")
        }
    }

    return (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)] gap-4 mobile-nav-offset">
            <div className="flex-1 flex flex-col gap-4 md:gap-6 min-w-0">
                <div className="flex flex-wrap justify-between gap-2">
                    {/* Mobile Collections Button */}
                    {isMobile && (
                        <Sheet open={collectionsOpen} onOpenChange={setCollectionsOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="sm" className="touch-target-sm">
                                    <FolderOpen className="h-4 w-4 mr-2" />
                                    Collections
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="h-[70vh] bottom-sheet">
                                <div className="bottom-sheet-handle" />
                                <CollectionsSidebar
                                    collections={collections}
                                    onAddFolder={addFolder}
                                    onDelete={deleteItem}
                                    onToggle={toggleFolder}
                                    onLoadRequest={(request) => {
                                        handleLoadRequest(request)
                                        setCollectionsOpen(false)
                                    }}
                                    onCreateCollection={createCollection}
                                    onRenameCollection={renameCollection}
                                    history={history}
                                    onClearHistory={clearHistory}
                                    onDeleteHistoryItem={deleteHistoryItem}
                                />
                            </SheetContent>
                        </Sheet>
                    )}
                    <div className="flex flex-wrap gap-2 ml-auto">
                        <EnvironmentManager
                            environments={environments}
                            activeEnvId={activeEnvId}
                            setActiveEnvId={setActiveEnvId}
                            addEnvironment={addEnvironment}
                            updateEnvironment={updateEnvironment}
                            deleteEnvironment={deleteEnvironment}
                        />
                        <CodeGenerator request={activeTab} />
                        <ImportCurlDialog onImport={handleImportCurl} />
                    </div>
                </div>
                <Card className="overflow-hidden flex-1 flex flex-col">
                    <TabBar
                        tabs={tabs}
                        activeTabId={activeTabId}
                        onTabChange={setActiveTabId}
                        onTabClose={handleCloseTab}
                        onTabAdd={handleAddTab}
                    />
                    <div className="flex-1 overflow-hidden min-h-0">
                        <ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"} className="h-full w-full">
                            <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col h-full bg-card">
                                <div className="p-4 md:p-6 space-y-4 md:space-y-6 flex-1 overflow-y-auto min-h-0">
                                    <RequestPanel
                                        method={activeTab.method}
                                        setMethod={(method) => updateActiveTab({ method })}
                                        url={activeTab.url}
                                        setUrl={(url) => updateActiveTab({ url, name: url || "New Request" })}
                                        onSend={handleSend}
                                        isLoading={activeTab.isLoading}
                                        collections={collections}
                                        onSave={handleSaveRequest}
                                        saveDefaultName={activeTab.name !== "New Request" ? activeTab.name : ""}
                                        onPaste={handleCurlPaste}
                                    />
                                    <RequestTabs
                                        params={activeTab.params}
                                        setParams={(params) => updateActiveTab({ params })}
                                        headers={activeTab.headers}
                                        setHeaders={(headers) => updateActiveTab({ headers })}
                                        body={activeTab.body}
                                        setBody={(body) => updateActiveTab({ body })}
                                        auth={activeTab.auth}
                                        setAuth={(auth) => updateActiveTab({ auth })}
                                    />
                                </div>
                            </ResizablePanel>
                            <ResizableHandle withHandle className="bg-border" />
                            <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col h-full bg-card">
                                <div className="p-4 md:p-6 flex-1 overflow-y-auto min-h-0 h-full">
                                    <ResponsePanel response={activeTab.response} />
                                </div>
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </div>
                </Card>
            </div>
            {/* Desktop Collections Sidebar */}
            {!isMobile && (
                <CollectionsSidebar
                    collections={collections}
                    onAddFolder={addFolder}
                    onDelete={deleteItem}
                    onToggle={toggleFolder}
                    onLoadRequest={handleLoadRequest}
                    onCreateCollection={createCollection}
                    onRenameCollection={renameCollection}
                    history={history}
                    onClearHistory={clearHistory}
                    onDeleteHistoryItem={deleteHistoryItem}
                />
            )}
        </div>
    )
}
