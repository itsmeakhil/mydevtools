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
import { EnvironmentManager } from "./environment-manager"
import { CodeGenerator } from "./code-generator"
import {
    RequestMethod,
    ApiRequestState,
    CollectionRequest,
    API_CLIENT_DEFAULT_TAB_NAME,
    API_CLIENT_IMPORTED_TAB_NAME,
    API_CLIENT_ERROR_STATUS_TEXT,
} from "./types"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { FolderOpen, PanelRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { ensureHttpScheme } from "@/lib/url-normalize"
import { useJsonFormatter } from "./workers/use-json-formatter"
import { useTabs, useTabsActions, createNewTab } from "./context/tabs-context"
import { useCollectionsState, useCollectionsActions } from "./context/collections-context"
import { useEnvironmentsState, useEnvironmentsActions } from "./context/environments-context"
import { useHistoryState, useHistoryActions } from "./context/history-context"

/** `new URL()` requires a scheme; host-only URLs (e.g. `api.example.com/v1`) are common in API clients. */
function buildRequestUrl(raw: string): URL {
    const trimmed = raw.trim()
    if (!trimmed) {
        throw new Error("URL is empty")
    }
    try {
        return new URL(trimmed)
    } catch {
        try {
            return new URL(ensureHttpScheme(trimmed))
        } catch {
            throw new Error("Invalid URL")
        }
    }
}

function ApiClientInner() {
    const t = useTranslations("ApiClient")
    const { tabs, activeTabId, activeTab } = useTabs()
    const { addTab, appendTab, closeTab, duplicateTab, renameTab, reorderTabs, setActiveTabId, updateActiveTab } = useTabsActions()

    const abortControllerRef = React.useRef<AbortController | null>(null)
    const { format: formatJson } = useJsonFormatter()
    const { collections } = useCollectionsState()
    const { saveRequest } = useCollectionsActions()
    const { history } = useHistoryState()
    const { addHistoryItem } = useHistoryActions()
    const { environments, activeEnvId, activeEnvironmentVariables } = useEnvironmentsState()
    const { substituteVariables } = useEnvironmentsActions()

    const isMobile = useIsMobile()
    const [collectionsOpen, setCollectionsOpen] = React.useState(false)
    const [sidebarOpen, setSidebarOpen] = React.useState(true)
    const [mobilePanel, setMobilePanel] = React.useState<'request' | 'response'>('request')

    const urlHistory = React.useMemo(() => {
        const seen = new Set<string>()
        const urls: string[] = []
        for (const item of history) {
            if (item.url && !seen.has(item.url)) {
                seen.add(item.url)
                urls.push(item.url)
            }
        }
        return urls
    }, [history])

    const replaceUrlWithEnvBaseUrl = React.useCallback((url: string | undefined) => {
        if (!url || !activeEnvId) return url
        const activeEnv = environments.find(e => e.id === activeEnvId)
        if (!activeEnv) return url

        let newUrl = url
        const activeVars = activeEnv.variables
            .filter(v => v.enabled && v.value)
            .sort((a, b) => b.value.length - a.value.length)

        for (const v of activeVars) {
            if (newUrl.startsWith(v.value)) {
                newUrl = newUrl.replace(v.value, `{{${v.key}}}`)
                break
            }
        }
        return newUrl
    }, [environments, activeEnvId])

    const handleMethodChange = React.useCallback((method: RequestMethod) => {
        updateActiveTab({ method })
    }, [updateActiveTab])

    const handleUrlChange = React.useCallback((url: string) => {
        updateActiveTab({ url, name: url || API_CLIENT_DEFAULT_TAB_NAME })
    }, [updateActiveTab])

    const handleImportCurl = (curl: string) => {
        try {
            const parsed = parseCurlCommand(curl)
            const resolvedUrl = replaceUrlWithEnvBaseUrl(parsed.url)

            const newTab: ApiRequestState = {
                ...createNewTab(),
                ...parsed,
                url: resolvedUrl || "",
                name: resolvedUrl || API_CLIENT_IMPORTED_TAB_NAME,
                id: crypto.randomUUID(),
            }
            appendTab(newTab)
            toast.success(t("toasts.curlImported"))
        } catch (error) {
            console.error(error)
            toast.error(t("toasts.curlParseFailed"))
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
        appendTab(newTab)
    }

    const handleCancel = () => {
        abortControllerRef.current?.abort()
        abortControllerRef.current = null
        updateActiveTab({ isLoading: false })
    }

    const handleSend = React.useCallback(async () => {
        if (!activeTab.url?.trim()) return

        abortControllerRef.current?.abort()
        const controller = new AbortController()
        abortControllerRef.current = controller

        updateActiveTab({ isLoading: true, response: null })
        if (isMobile) setMobilePanel('response')
        const startTime = performance.now()

        try {
            // Substitute variables in URL
            const finalUrl = substituteVariables(activeTab.url)

            // Construct URL with params
            const urlObj = buildRequestUrl(finalUrl)
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
            let bodyPayload: unknown = null
            const deleteContentTypeHeader = (headersMap: Record<string, string>) => {
                const existingKey = Object.keys(headersMap).find((key) => key.toLowerCase() === "content-type")
                if (existingKey) {
                    delete headersMap[existingKey]
                }
            }
            if (activeTab.method !== "GET" && activeTab.method !== "HEAD" && activeTab.body.type !== "none") {
                if (activeTab.body.type === "json") {
                    try {
                        const substitutedBody = substituteVariables(activeTab.body.content)
                        // Validate JSON
                        JSON.parse(substitutedBody)
                        bodyContent = substitutedBody
                        bodyPayload = substitutedBody
                        headersObj["Content-Type"] = "application/json"
                    } catch (e) {
                        toast.error(t("toasts.invalidJsonBody"))
                        updateActiveTab({ isLoading: false })
                        return
                    }
                } else if (activeTab.body.type === "x-www-form-urlencoded") {
                    const params = new URLSearchParams()
                    ;(activeTab.body.urlEncoded ?? []).forEach((item) => {
                        if (item.active && item.key) {
                            params.append(substituteVariables(item.key), substituteVariables(item.value))
                        }
                    })
                    bodyContent = params.toString()
                    bodyPayload = bodyContent
                    if (!Object.keys(headersObj).some((key) => key.toLowerCase() === "content-type")) {
                        headersObj["Content-Type"] = "application/x-www-form-urlencoded"
                    }
                } else if (activeTab.body.type === "form-data") {
                    const entries = (activeTab.body.formData ?? [])
                        .filter((item) => item.active && item.key)
                        .map((item) => {
                            if (item.valueType === "file") {
                                return {
                                    key: substituteVariables(item.key),
                                    type: "file" as const,
                                    fileName: item.fileName || "upload.bin",
                                    fileType: item.fileType || "application/octet-stream",
                                    fileContentBase64: item.fileContentBase64 || "",
                                }
                            }

                            return {
                                key: substituteVariables(item.key),
                                type: "text" as const,
                                value: substituteVariables(item.value),
                            }
                        })

                    bodyPayload = {
                        mode: "form-data",
                        entries,
                    }
                    deleteContentTypeHeader(headersObj)
                } else {
                    bodyContent = substituteVariables(activeTab.body.content)
                    bodyPayload = bodyContent
                    if (!headersObj["Content-Type"]) {
                        headersObj["Content-Type"] = "text/plain"
                    }
                }
            }

            // Send via Proxy
            const res = await fetch("/api/proxy", {
                method: "POST",
                credentials: "include",
                signal: controller.signal,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url: urlObj.toString(),
                    method: activeTab.method,
                    headers: headersObj,
                    body: bodyPayload ?? bodyContent,
                }),
            })

            const proxyData = await res.json()

            let formattedBody = proxyData.body
            if (formattedBody && !proxyData.isBase64) {
                const responseContentType = (proxyData.headers as Record<string, string> | undefined)
                const rawCT = responseContentType
                    ? Object.entries(responseContentType).find(([k]) => k.toLowerCase() === "content-type")?.[1] ?? ""
                    : ""
                if (rawCT.includes("application/json")) {
                    const r = await formatJson(formattedBody)
                    if (r.ok) formattedBody = r.formatted
                } else {
                    // Non-JSON: attempt sync pretty-print as before (best-effort)
                    try {
                        formattedBody = JSON.stringify(JSON.parse(formattedBody), null, 2)
                    } catch {
                        // Not JSON, keep as text
                    }
                }
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
            }, activeTab.name !== API_CLIENT_DEFAULT_TAB_NAME ? activeTab.name : activeTab.url, proxyData.status)

        } catch (error) {
            if ((error as Error).name === "AbortError") return
            console.error(error)
            toast.error(t("toasts.requestFailed", { message: (error as Error).message }))
            updateActiveTab({
                response: {
                    status: 0,
                    statusText: API_CLIENT_ERROR_STATUS_TEXT,
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
            }, activeTab.name !== API_CLIENT_DEFAULT_TAB_NAME ? activeTab.name : activeTab.url, 0)
        }
    }, [activeTab, updateActiveTab, isMobile, substituteVariables, formatJson, addHistoryItem, t])

    const handleCurlPaste = (curl: string) => {
        try {
            const parsed = parseCurlCommand(curl)
            const resolvedUrl = replaceUrlWithEnvBaseUrl(parsed.url)

            updateActiveTab({
                ...parsed,
                url: resolvedUrl || activeTab.url,
                name: resolvedUrl || activeTab.name,
            })
            toast.success(t("toasts.curlPasted"))
        } catch (error) {
            console.error(error)
            toast.error(t("toasts.curlParseFailed"))
        }
    }

    // Keyboard shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = /Mac|iPhone|iPad/i.test(navigator.userAgent)
            const mod = isMac ? e.metaKey : e.ctrlKey

            if (mod && e.key === "t") {
                e.preventDefault()
                addTab()
            } else if (mod && e.key === "w") {
                e.preventDefault()
                closeTab(activeTabId)
            } else if (mod && e.key === "Enter") {
                e.preventDefault()
                handleSend()
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [addTab, closeTab, handleSend, activeTabId])

    return (
        <div className="flex h-full min-h-0 w-full flex-col gap-4 mobile-nav-offset lg:flex-row">
            <div className="flex-1 flex flex-col gap-4 min-w-0 h-full">
                <div className="flex flex-wrap justify-between items-center gap-2">
                    {/* Mobile Collections Button */}
                    {isMobile && (
                        <Sheet open={collectionsOpen} onOpenChange={setCollectionsOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="sm" className="touch-target-sm rounded-lg bg-background/50 shadow-sm">
                                    <FolderOpen className="h-4 w-4 mr-2" />
                                    {t("layout.collections")}
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="bottom" className="h-[75vh] bottom-sheet rounded-t-3xl border-t shadow-2xl">
                                <div className="bottom-sheet-handle w-12 h-1.5 bg-muted rounded-full mx-auto my-3" />
                                <div className="px-4 h-full overflow-hidden">
                                    <CollectionsSidebar
                                        onLoadRequest={(request) => {
                                            handleLoadRequest(request)
                                            setCollectionsOpen(false)
                                        }}
                                    />
                                </div>
                            </SheetContent>
                        </Sheet>
                    )}
                    <div className="flex flex-wrap items-center gap-2 ml-auto">
                        <EnvironmentManager />
                        <div className="h-6 w-px bg-border/50 mx-1" />
                        <CodeGenerator request={activeTab} />
                        <ImportCurlDialog onImport={handleImportCurl} />
                        {!isMobile && (
                            <>
                                <div className="h-6 w-px bg-border/50 mx-1" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                    title={sidebarOpen ? t("layout.closeSidebar") : t("layout.openSidebar")}
                                >
                                    <PanelRight className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <Card className="flex-1 flex flex-col overflow-hidden border rounded-2xl shadow-xl shadow-primary/[0.02] bg-background/50 backdrop-blur-sm">
                    <TabBar
                        tabs={tabs}
                        activeTabId={activeTabId}
                        onTabChange={setActiveTabId}
                        onTabClose={closeTab}
                        onTabAdd={addTab}
                        onTabRename={renameTab}
                        onTabReorder={reorderTabs}
                        onTabDuplicate={duplicateTab}
                    />

                    {/* Mobile Request/Response tab switcher */}
                    {isMobile && (
                        <div className="flex shrink-0 border-b bg-muted/40 p-1 gap-1 mx-2 mt-2 mb-1 rounded-lg">
                            <button
                                onClick={() => setMobilePanel('request')}
                                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                                    mobilePanel === 'request'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t("layout.request")}
                            </button>
                            <button
                                onClick={() => setMobilePanel('response')}
                                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                                    mobilePanel === 'response'
                                        ? 'bg-background text-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t("layout.response")}
                                {activeTab.response && (
                                    <span className={`ml-1.5 inline-block h-2 w-2 rounded-full ${
                                        activeTab.response.status >= 200 && activeTab.response.status < 300
                                            ? 'bg-emerald-500'
                                            : activeTab.response.status >= 400
                                            ? 'bg-rose-500'
                                            : 'bg-amber-500'
                                    }`} />
                                )}
                            </button>
                        </div>
                    )}

                    <div className="flex-1 overflow-hidden min-h-0 bg-card/30">
                        {isMobile ? (
                            /* Mobile: single panel toggled by tabs */
                            <div className="h-full overflow-y-auto">
                                {mobilePanel === 'request' ? (
                                    <div className="p-4 flex flex-col gap-6 min-h-full">
                                        <RequestPanel
                                            method={activeTab.method}
                                            setMethod={handleMethodChange}
                                            url={activeTab.url}
                                            setUrl={handleUrlChange}
                                            onSend={handleSend}
                                            onCancel={handleCancel}
                                            isLoading={activeTab.isLoading}
                                            collections={collections}
                                            onSave={handleSaveRequest}
                                            saveDefaultName={activeTab.name !== API_CLIENT_DEFAULT_TAB_NAME ? activeTab.name : ""}
                                            onPaste={handleCurlPaste}
                                            urlHistory={urlHistory}
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
                                ) : (
                                    <div className="p-4">
                                        <ResponsePanel response={activeTab.response} />
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Desktop: side-by-side resizable panels */
                            <ResizablePanelGroup direction="horizontal" className="h-full w-full">
                                <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col h-full">
                                    <div className="p-4 md:p-6 lg:p-8 flex flex-col gap-6 flex-1 min-h-0">
                                        <RequestPanel
                                            method={activeTab.method}
                                            setMethod={handleMethodChange}
                                            url={activeTab.url}
                                            setUrl={handleUrlChange}
                                            onSend={handleSend}
                                            onCancel={handleCancel}
                                            isLoading={activeTab.isLoading}
                                            collections={collections}
                                            onSave={handleSaveRequest}
                                            saveDefaultName={activeTab.name !== API_CLIENT_DEFAULT_TAB_NAME ? activeTab.name : ""}
                                            onPaste={handleCurlPaste}
                                            urlHistory={urlHistory}
                                        />
                                        <div className="flex-1 min-h-0">
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
                                    </div>
                                </ResizablePanel>

                                <ResizableHandle withHandle className="w-1.5 bg-border/40 hover:bg-primary/20 transition-colors" />

                                <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col h-full bg-muted/[0.02]">
                                    <div className="p-4 md:p-6 lg:p-8 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                                        <ResponsePanel response={activeTab.response} />
                                    </div>
                                </ResizablePanel>
                            </ResizablePanelGroup>
                        )}
                    </div>
                </Card>
            </div>

            {/* Desktop Collections Sidebar */}
            {!isMobile && (
                <div
                    className={cn(
                        "shrink-0 h-full border rounded-2xl bg-card/50 backdrop-blur-sm shadow-lg shadow-primary/[0.01] overflow-hidden transition-all duration-300 ease-in-out",
                        sidebarOpen ? "w-80 opacity-100" : "w-0 opacity-0 border-transparent overflow-hidden"
                    )}
                >
                    <CollectionsSidebar
                        onLoadRequest={handleLoadRequest}
                    />
                </div>
            )}
        </div>
    )
}

export function ApiClient() {
    return <ApiClientInner />
}
