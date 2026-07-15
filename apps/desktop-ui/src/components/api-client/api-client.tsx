"use client"

import { apiFetch } from "@/lib/desktop/api-fetch";
import * as React from "react"
import { Card } from "@/components/ui/card"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { RequestPanel } from "./request-panel"
import { RequestTabs } from "./request-tabs"
import { ResponsePanel } from "./response-panel"
import { TabBar } from "./tab-bar"
import { ImportCurlDialog, type ImportCurlTarget } from "./import-curl-dialog"
import { ImportDialog } from "./import-dialog"
import { CookieJarDialog } from "./cookie-jar-dialog"
import { WebSocketPanel } from "./websocket-panel"
import { GrpcPanel } from "./grpc-panel"
import { SaveExampleDialog } from "./save-example-dialog"
import { loadPlugins, instantiatePlugin, applyBeforeSend, applyAfterResponse, type PluginInstance } from "@/lib/plugins/plugin-runtime"
import { MetricsDialog } from "./metrics-dialog"
import { recordMetric, recordLog } from "@/lib/observability/metrics"
import { OfflineIndicator } from "./offline-indicator"
import { putCachedResponse, getCachedResponse } from "@/lib/cache/response-cache"
import { registerApiClientServiceWorker } from "@/lib/sw/register-api-client-sw"
import { listenForExtensionImports, capturedToTab } from "@/lib/extension/listen"
import { recordExchange } from "@/lib/recorder/traffic-recorder"
import type { SavedExample } from "./types"
import { HelpShortcutsDialog } from "./help-shortcuts-dialog"
import { SaveRequestDialog } from "./collections/save-request-dialog"
import { parseCurlCommand } from "@/utils/curl-parser"
import { CollectionsSidebar } from "./collections/collections-sidebar"
import dynamic from "next/dynamic"
import {
    RequestMethod,
    ApiRequestState,
    CollectionRequest,
    API_CLIENT_DEFAULT_TAB_NAME,
    API_CLIENT_IMPORTED_TAB_NAME,
    API_CLIENT_ERROR_STATUS_TEXT,
    ScriptTestResult,
    ScriptLog,
} from "./types"
import type { ScriptContext } from "./workers/scripts-runner.worker"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FolderOpen, PanelRight, MoreVertical, MoreHorizontal, Cookie, Download, Activity, Keyboard } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { IconCode, IconSettings } from "@tabler/icons-react"
import { cn } from "@/lib/utils"
import { ensureHttpScheme } from "@/lib/url-normalize"
import { encodeBasicCredentials } from "@/lib/basic-auth"
import { ensureFreshToken } from "@/lib/oauth2"
import { signAwsSigV4 } from "@/lib/auth/aws-sigv4"
import { signHawk } from "@/lib/auth/hawk"
import { signDigest } from "@/lib/auth/digest"
import { signJwt } from "@/lib/auth/jwt-bearer"
import { cookieHeaderForUrl, storeCookiesFromResponse } from "@/lib/cookie-jar"
import { resolveResponsePath } from "@/lib/response-path"
import { applyFolderInheritance, findRequestAncestors } from "@/lib/folder-inheritance"
import { useJsonFormatter } from "./workers/use-json-formatter"
import { useScriptsRunner } from "./workers/use-scripts-runner"
import { useJsonBodyValidation } from "./use-json-validation"
import { useTabs, useTabsActions, createNewTab } from "./context/tabs-context"
import { useCollectionsState, useCollectionsActions } from "./context/collections-context"
import { useEnvironmentsState, useEnvironmentsActions } from "./context/environments-context"
import { useHistoryState, useHistoryActions } from "./context/history-context"

const EnvironmentManager = dynamic(
    () => import("./environment-manager").then(m => ({ default: m.EnvironmentManager })),
    { ssr: false, loading: () => null }
)
const CodeGenerator = dynamic(
    () => import("./code-generator").then(m => ({ default: m.CodeGenerator })),
    { ssr: false, loading: () => null }
)

/**
 * Tag history entries with the HTTP method when falling back to URL, so the list
 * can distinguish `GET /users` from `POST /users` at a glance.
 */
function historyName(tabName: string, method: string, url: string): string {
    if (tabName && tabName !== API_CLIENT_DEFAULT_TAB_NAME) return tabName
    return url ? `${method} ${url}` : method
}

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

    // Abort any in-flight request when the component unmounts.
    React.useEffect(() => () => abortControllerRef.current?.abort(), [])

    const { format: formatJson } = useJsonFormatter()
    const { run: runScript } = useScriptsRunner()
    const { collections } = useCollectionsState()
    const { saveRequest } = useCollectionsActions()
    const { history } = useHistoryState()
    const { addHistoryItem } = useHistoryActions()
    const { environments, activeEnvId, activeEnvironmentVariables } = useEnvironmentsState()
    const { setActiveEnvId, updateEnvironment } = useEnvironmentsActions()
    // Session-only variables — set by `pm.variables.set` in scripts and consumed by
    // the next request's variable substitution. Cleared on tab close.
    const sessionVarsRef = React.useRef<Record<string, string>>({})

    const isMobile = useIsMobile()
    const [collectionsOpen, setCollectionsOpen] = React.useState(false)
    const [sidebarOpen, setSidebarOpen] = React.useState(true)
    const [mobilePanel, setMobilePanel] = React.useState<'request' | 'response'>('request')
    const [envMgrOpen, setEnvMgrOpen] = React.useState(false)
    const [codeGenOpen, setCodeGenOpen] = React.useState(false)
    const [importCurlOpen, setImportCurlOpen] = React.useState(false)
    const [helpOpen, setHelpOpen] = React.useState(false)
    const [saveOpen, setSaveOpen] = React.useState(false)
    const [cookieJarOpen, setCookieJarOpen] = React.useState(false)
    const [importOpen, setImportOpen] = React.useState(false)
    const [saveExampleOpen, setSaveExampleOpen] = React.useState(false)
    const [metricsOpen, setMetricsOpen] = React.useState(false)

    /** Register the offline-cache service worker on mount. */
    React.useEffect(() => { void registerApiClientServiceWorker() }, [])

    /** Browser extension companion: spawn a new tab whenever the extension forwards a captured request. */
    React.useEffect(() => listenForExtensionImports((captured) => {
        const tab = createNewTab()
        appendTab({ ...tab, name: API_CLIENT_IMPORTED_TAB_NAME, ...capturedToTab(captured) })
        toast.success(t("toolbar.extensionImported", { method: captured.method, url: captured.url }))
    }), [appendTab, t])

    /** Rehydrate the active tab's response from IndexedDB if missing.
     *  Bodies are stripped from localStorage tabs to dodge the 5MB quota; this
     *  effect restores them transparently when the user reloads the page. */
    React.useEffect(() => {
        if (activeTab.response || !activeTab.id) return
        let cancelled = false
        void getCachedResponse(activeTab.id).then((cached) => {
            if (cancelled || !cached) return
            updateActiveTab({ response: cached })
        })
        return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab.id])

    /** Compiled plugin instances; loaded once on mount. */
    const pluginInstancesRef = React.useRef<PluginInstance[]>([])
    React.useEffect(() => {
        pluginInstancesRef.current = loadPlugins()
            .filter((p) => p.enabled)
            .map((p) => instantiatePlugin(p))
            .filter((r) => r.instance)
            .map((r) => r.instance!)
    }, [])

    const handleSaveExample = (name: string) => {
        if (!activeTab.response) return
        const example: SavedExample = {
            id: crypto.randomUUID(),
            name,
            capturedAt: Date.now(),
            request: {
                method: activeTab.method,
                url: activeTab.url,
                headers: activeTab.headers,
                body: activeTab.body,
            },
            response: {
                status: activeTab.response.status,
                statusText: activeTab.response.statusText,
                headers: activeTab.response.headers,
                body: activeTab.response.body,
                isBase64: activeTab.response.isBase64,
                contentType: Object.entries(activeTab.response.headers ?? {})
                    .find(([k]) => k.toLowerCase() === "content-type")?.[1],
            },
        }
        updateActiveTab({ examples: [...(activeTab.examples ?? []), example] })
        toast.success(`Saved example "${name}"`)
    }

    const handleDeleteExample = (id: string) => {
        updateActiveTab({ examples: (activeTab.examples ?? []).filter((e) => e.id !== id) })
    }

    const handleLoadExample = (example: SavedExample) => {
        updateActiveTab({
            response: {
                status: example.response.status,
                statusText: example.response.statusText,
                headers: example.response.headers,
                body: example.response.body,
                isBase64: example.response.isBase64,
                time: 0,
                size: example.response.body?.length ?? 0,
            },
            isLoading: false,
        })
        toast.success(`Loaded example "${example.name}"`)
    }

    // Scroll position memory for mobile panel toggle
    const scrollMemory = React.useRef<{ request: number; response: number }>({ request: 0, response: 0 })
    const requestScrollRef = React.useRef<HTMLDivElement | null>(null)
    const responseScrollRef = React.useRef<HTMLDivElement | null>(null)

    React.useLayoutEffect(() => {
        const el = mobilePanel === 'request' ? requestScrollRef.current : responseScrollRef.current
        if (el) el.scrollTop = scrollMemory.current[mobilePanel]
    }, [mobilePanel])

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

    const jsonValidation = useJsonBodyValidation(activeTab.body)
    const isBodyInvalid = !jsonValidation.valid

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

    const handleImportCurl = (curl: string, target: ImportCurlTarget = "new-tab") => {
        try {
            const parsed = parseCurlCommand(curl)
            const resolvedUrl = replaceUrlWithEnvBaseUrl(parsed.url)

            if (target === "replace-current") {
                updateActiveTab({
                    ...parsed,
                    url: resolvedUrl || "",
                    name: resolvedUrl || activeTab.name,
                })
            } else {
                const newTab: ApiRequestState = {
                    ...createNewTab(),
                    ...parsed,
                    url: resolvedUrl || "",
                    name: resolvedUrl || API_CLIENT_IMPORTED_TAB_NAME,
                    id: crypto.randomUUID(),
                }
                appendTab(newTab)
            }
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
        // Locate the request inside any collection so we can fold ancestor folders'
        // defaults (headers / auth / scripts) into the materialised tab. A request
        // edited in a tab is a snapshot — later folder-default edits don't propagate.
        let effective = request
        for (const col of collections) {
            const ancestors = findRequestAncestors(col.items, request.id)
            if (ancestors !== null) {
                effective = applyFolderInheritance(request, ancestors)
                break
            }
        }
        const newTab: ApiRequestState = {
            ...createNewTab(),
            ...effective,
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

        updateActiveTab({ isLoading: true, response: null, scriptResults: undefined })
        if (isMobile) setMobilePanel('response')
        const startTime = performance.now()

        // Aggregated script output across pre-request + tests.
        const scriptTests: ScriptTestResult[] = []
        const scriptLogs: ScriptLog[] = []
        const scriptErrors: string[] = []

        // Env mutations made by scripts — applied locally to substitution and
        // persisted to the active environment after the request completes.
        const scriptEnvOverlay: Record<string, string> = {}
        const scriptEnvUnsets = new Set<string>()

        // Previous response on the same tab — what `{{response.body.token}}` chains against.
        const previousResponse = activeTab.response

        const substituteAll = (text: string): string => {
            if (!text) return text
            return text.replace(/\{\{(.+?)\}\}/g, (m, k) => {
                const key = (k as string).trim()
                if (key.startsWith("response.")) {
                    const resolved = resolveResponsePath(key.slice("response.".length), previousResponse)
                    return resolved ?? m
                }
                if (scriptEnvUnsets.has(key)) return m
                if (key in scriptEnvOverlay) return scriptEnvOverlay[key]
                if (key in sessionVarsRef.current) return sessionVarsRef.current[key]
                return activeEnvironmentVariables[key] ?? m
            })
        }

        try {
            // Working request state. Pre-request script may rewrite url/method/headers/body.
            let workMethod: string = activeTab.method
            let workUrl: string = activeTab.url
            let workHeaders: Record<string, string> = {}
            activeTab.headers.forEach((h) => {
                if (h.active && h.key) workHeaders[h.key] = h.value
            })

            // ── Pre-request script ────────────────────────────────────────
            if (activeTab.preRequestScript && activeTab.preRequestScript.trim()) {
                const preCtx: ScriptContext = {
                    request: {
                        url: workUrl,
                        method: workMethod,
                        headers: workHeaders,
                        body: activeTab.body.type === "json" || activeTab.body.type === "text"
                            ? activeTab.body.content
                            : undefined,
                    },
                    environment: { ...activeEnvironmentVariables },
                    variables: { ...sessionVarsRef.current },
                }
                const r = await runScript(activeTab.preRequestScript, preCtx)
                scriptTests.push(...r.tests)
                scriptLogs.push(...r.logs)
                if (!r.ok && r.error) scriptErrors.push(`pre-request: ${r.error}`)

                // Diff env: anything different goes into overlay; anything dropped goes into unsets.
                for (const k of Object.keys(r.environment)) {
                    if (r.environment[k] !== activeEnvironmentVariables[k]) {
                        scriptEnvOverlay[k] = r.environment[k]
                    }
                }
                for (const k of Object.keys(activeEnvironmentVariables)) {
                    if (!(k in r.environment)) scriptEnvUnsets.add(k)
                }
                sessionVarsRef.current = r.variables
                workUrl = r.request.url
                workMethod = (r.request.method || workMethod).toUpperCase()
                workHeaders = r.request.headers
            }

            // Substitute variables in URL
            const finalUrl = substituteAll(workUrl)

            // Construct URL with params
            const urlObj = buildRequestUrl(finalUrl)
            activeTab.params.forEach((p) => {
                if (p.active && p.key) {
                    urlObj.searchParams.append(substituteAll(p.key), substituteAll(p.value))
                }
            })

            // Construct headers (start with pre-script's worked headers)
            const headersObj: Record<string, string> = {}
            Object.entries(workHeaders).forEach(([k, v]) => {
                headersObj[substituteAll(k)] = substituteAll(v)
            })

            // Add Auth — credentials are trimmed: copy-pasted tokens routinely carry leading/trailing
            // whitespace which most servers reject as malformed.
            if (activeTab.auth.type === "bearer" && activeTab.auth.token) {
                headersObj["Authorization"] = `Bearer ${substituteAll(activeTab.auth.token).trim()}`
            } else if (activeTab.auth.type === "basic" && activeTab.auth.username && activeTab.auth.password) {
                const credentials = encodeBasicCredentials(
                    substituteAll(activeTab.auth.username).trim(),
                    substituteAll(activeTab.auth.password),
                )
                headersObj["Authorization"] = `Basic ${credentials}`
            } else if (activeTab.auth.type === "api-key" && activeTab.auth.apiKeyKey && activeTab.auth.apiKeyValue) {
                const key = substituteAll(activeTab.auth.apiKeyKey).trim()
                const val = substituteAll(activeTab.auth.apiKeyValue).trim()
                if (activeTab.auth.apiKeyLocation === "query") {
                    urlObj.searchParams.append(key, val)
                } else {
                    headersObj[key] = val
                }
            } else if (activeTab.auth.type === "jwt-bearer" && activeTab.auth.jwtBearer) {
                try {
                    const cfg = activeTab.auth.jwtBearer
                    let extra: Record<string, unknown> | undefined
                    if (cfg.extraClaimsJson && cfg.extraClaimsJson.trim()) {
                        extra = JSON.parse(cfg.extraClaimsJson) as Record<string, unknown>
                    }
                    const jwt = await signJwt({
                        algorithm: cfg.algorithm,
                        secret: cfg.secret,
                        privateKeyPem: cfg.privateKeyPem,
                        ttlSeconds: cfg.ttlSeconds,
                        claims: {
                            iss: cfg.issuer || undefined,
                            sub: cfg.subject || undefined,
                            aud: cfg.audience || undefined,
                            extra,
                        },
                    })
                    headersObj["Authorization"] = `Bearer ${jwt}`
                } catch (err) {
                    toast.error(`JWT signing failed: ${(err as Error).message}`)
                    updateActiveTab({ isLoading: false })
                    return
                }
            } else if (activeTab.auth.type === "aws-sigv4" && activeTab.auth.awsSigV4) {
                // Defer signing until after the body is built — it has to hash the payload.
                // We mark the intent here and apply at the end of body assembly.
            } else if (activeTab.auth.type === "hawk" && activeTab.auth.hawk) {
                // Same — deferred to post-body assembly.
            } else if (activeTab.auth.type === "digest" && activeTab.auth.digest) {
                // Digest with qop=auth-int also needs body. Deferred.
            } else if (activeTab.auth.type === "oauth2" && activeTab.auth.oauth2) {
                // Refresh / re-fetch as needed. The fresh config is persisted back
                // into tab state so subsequent sends reuse the same access token.
                try {
                    const fresh = await ensureFreshToken(activeTab.auth.oauth2)
                    if (
                        fresh.accessToken !== activeTab.auth.oauth2.accessToken ||
                        fresh.refreshToken !== activeTab.auth.oauth2.refreshToken ||
                        fresh.expiresAt !== activeTab.auth.oauth2.expiresAt
                    ) {
                        updateActiveTab({ auth: { ...activeTab.auth, oauth2: fresh } })
                    }
                    if (fresh.accessToken) {
                        const tokenType = fresh.tokenType || "Bearer"
                        headersObj["Authorization"] = `${tokenType} ${fresh.accessToken}`
                    }
                } catch (err) {
                    toast.error(`OAuth token refresh failed: ${(err as Error).message}`)
                    updateActiveTab({ isLoading: false })
                    return
                }
            }

            // Cookie jar: prepend stored cookies to the Cookie header for this URL.
            // User-provided Cookie header takes precedence by appearing later in the merge
            // (browsers/curl typically take the merged value as-sent — undici will combine).
            if (activeTab.useCookieJar !== false) {
                const jarHeader = cookieHeaderForUrl(urlObj.toString())
                if (jarHeader) {
                    const existingKey = Object.keys(headersObj).find((k) => k.toLowerCase() === "cookie")
                    if (existingKey) {
                        headersObj[existingKey] = `${jarHeader}; ${headersObj[existingKey]}`
                    } else {
                        headersObj["Cookie"] = jarHeader
                    }
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
            if (workMethod !== "GET" && workMethod !== "HEAD" && activeTab.body.type !== "none") {
                if (activeTab.body.type === "json") {
                    try {
                        const substitutedBody = substituteAll(activeTab.body.content)
                        // Validate JSON
                        JSON.parse(substitutedBody)
                        bodyContent = substitutedBody
                        bodyPayload = substitutedBody
                        headersObj["Content-Type"] = "application/json"
                    } catch (e) {
                        const parseErr = (e as Error).message
                        const hasUnresolvedVar = activeTab.body.content.includes("{{")
                        toast.error(
                            hasUnresolvedVar
                                ? `Invalid JSON after env substitution: ${parseErr}`
                                : `Invalid JSON body: ${parseErr}`,
                        )
                        updateActiveTab({ isLoading: false })
                        return
                    }
                } else if (activeTab.body.type === "x-www-form-urlencoded") {
                    const params = new URLSearchParams()
                    ;(activeTab.body.urlEncoded ?? []).forEach((item) => {
                        if (item.active && item.key) {
                            params.append(substituteAll(item.key), substituteAll(item.value))
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
                                    key: substituteAll(item.key),
                                    type: "file" as const,
                                    fileName: item.fileName || "upload.bin",
                                    fileType: item.fileType || "application/octet-stream",
                                    fileContentBase64: item.fileContentBase64 || "",
                                }
                            }

                            return {
                                key: substituteAll(item.key),
                                type: "text" as const,
                                value: substituteAll(item.value),
                            }
                        })

                    bodyPayload = {
                        mode: "form-data",
                        entries,
                    }
                    deleteContentTypeHeader(headersObj)
                } else if (activeTab.body.type === "graphql") {
                    // GraphQL is serialised as { query, variables } JSON and sent as application/json.
                    const query = substituteAll(activeTab.body.content)
                    let variables: unknown = undefined
                    const rawVars = (activeTab.body.graphqlVariables ?? "").trim()
                    if (rawVars) {
                        try {
                            variables = JSON.parse(substituteAll(rawVars))
                        } catch (e) {
                            toast.error(`Invalid GraphQL variables JSON: ${(e as Error).message}`)
                            updateActiveTab({ isLoading: false })
                            return
                        }
                    }
                    bodyContent = JSON.stringify(variables !== undefined ? { query, variables } : { query })
                    bodyPayload = bodyContent
                    headersObj["Content-Type"] = "application/json"
                } else {
                    bodyContent = substituteAll(activeTab.body.content)
                    bodyPayload = bodyContent
                    if (!headersObj["Content-Type"]) {
                        headersObj["Content-Type"] = "text/plain"
                    }
                }
            }

            // ── Payload-dependent auth signers ───────────────────────────
            // SigV4 / Hawk / Digest(auth-int) all hash the body — they have to
            // run after body assembly but before the proxy fetch.
            const bodyForSigning = typeof bodyPayload === "string"
                ? bodyPayload
                : (bodyContent ?? "")
            try {
                if (activeTab.auth.type === "aws-sigv4" && activeTab.auth.awsSigV4) {
                    await signAwsSigV4({
                        method: workMethod,
                        url: urlObj,
                        headers: headersObj,
                        body: bodyForSigning,
                        cfg: activeTab.auth.awsSigV4,
                    })
                } else if (activeTab.auth.type === "hawk" && activeTab.auth.hawk) {
                    await signHawk({
                        method: workMethod,
                        url: urlObj,
                        headers: headersObj,
                        body: bodyForSigning,
                        cfg: activeTab.auth.hawk,
                    })
                } else if (activeTab.auth.type === "digest" && activeTab.auth.digest) {
                    await signDigest({
                        method: workMethod,
                        url: urlObj,
                        headers: headersObj,
                        body: bodyForSigning,
                        cfg: activeTab.auth.digest,
                    })
                }
            } catch (signErr) {
                toast.error(`Auth signing failed: ${(signErr as Error).message}`)
                updateActiveTab({ isLoading: false })
                return
            }

            // ── SPNEGO / Kerberos branch ─────────────────────────────────
            if (activeTab.auth.type === "spnego" && activeTab.auth.spnego) {
                const spnegoRes = await apiFetch("/api/proxy-spnego", {
                    method: "POST",
                    credentials: "include",
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        url: urlObj.toString(),
                        method: workMethod,
                        headers: headersObj,
                        body: bodyContent ?? undefined,
                        token: activeTab.auth.spnego.token,
                    }),
                })
                const data = await spnegoRes.json()
                updateActiveTab({
                    response: {
                        status: data.status,
                        statusText: data.statusText ?? "",
                        headers: data.headers ?? {},
                        body: data.body ?? "",
                        time: data.time ?? 0,
                        size: data.size ?? 0,
                        error: data.error,
                    },
                    isLoading: false,
                })
                return
            }

            // ── NTLM branch ─────────────────────────────────────────────
            // NTLM does its own 3-step handshake on a single keepalive socket;
            // route the request through the NTLM proxy and skip the streaming
            // branch (NTLM responses are bounded).
            if (activeTab.auth.type === "ntlm" && activeTab.auth.ntlm) {
                const ntlmRes = await apiFetch("/api/proxy-ntlm", {
                    method: "POST",
                    credentials: "include",
                    signal: controller.signal,
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        url: urlObj.toString(),
                        method: workMethod,
                        headers: headersObj,
                        body: bodyContent ?? undefined,
                        ntlm: {
                            username: substituteAll(activeTab.auth.ntlm.username),
                            password: substituteAll(activeTab.auth.ntlm.password),
                            domain: activeTab.auth.ntlm.domain ? substituteAll(activeTab.auth.ntlm.domain) : undefined,
                            workstation: activeTab.auth.ntlm.workstation ? substituteAll(activeTab.auth.ntlm.workstation) : undefined,
                        },
                    }),
                })
                const ntlmData = await ntlmRes.json()
                updateActiveTab({
                    response: {
                        status: ntlmData.status,
                        statusText: ntlmData.statusText ?? "",
                        headers: ntlmData.headers ?? {},
                        body: ntlmData.body ?? "",
                        time: ntlmData.time ?? 0,
                        size: ntlmData.size ?? 0,
                        error: ntlmData.error,
                    },
                    isLoading: false,
                })
                addHistoryItem({
                    method: workMethod as RequestMethod,
                    url: activeTab.url,
                    params: activeTab.params,
                    headers: activeTab.headers,
                    body: activeTab.body,
                    auth: activeTab.auth,
                    preRequestScript: activeTab.preRequestScript,
                    testScript: activeTab.testScript,
                }, historyName(activeTab.name, workMethod, activeTab.url), ntlmData.status)
                return
            }

            // Plugins: onBeforeSend lets installed plugins mutate URL / headers / body.
            const pluginRequest = {
                method: workMethod,
                url: urlObj.toString(),
                headers: { ...headersObj },
                body: typeof bodyPayload === "string" ? bodyPayload : (bodyContent ?? undefined),
            }
            const beforeApplied = applyBeforeSend(pluginInstancesRef.current, pluginRequest)
            for (const k of Object.keys(headersObj)) delete headersObj[k]
            Object.assign(headersObj, beforeApplied.req.headers)
            const finalUrlFromPlugins = beforeApplied.req.url

            // Send via Proxy
            const res = await apiFetch("/api/proxy", {
                method: "POST",
                credentials: "include",
                signal: controller.signal,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    url: finalUrlFromPlugins,
                    method: beforeApplied.req.method,
                    headers: headersObj,
                    body: beforeApplied.req.body ?? bodyPayload ?? bodyContent,
                    timeoutMs: activeTab.timeoutMs,
                }),
            })

            const proxyData = await res.json()

            // Plugins: onAfterResponse hook gets the live response.
            applyAfterResponse(pluginInstancesRef.current, {
                request: pluginRequest,
                response: {
                    status: proxyData.status,
                    statusText: proxyData.statusText ?? "",
                    headers: proxyData.headers ?? {},
                    body: proxyData.body ?? "",
                    timeMs: proxyData.time ?? 0,
                },
            })

            // Observability: record metric for the metrics dashboard.
            recordMetric({
                method: beforeApplied.req.method,
                url: finalUrlFromPlugins,
                status: proxyData.status ?? 0,
                timeMs: proxyData.time ?? 0,
                sizeBytes: proxyData.size ?? 0,
                error: proxyData.error,
            })

            if (proxyData.error) {
                recordLog({ level: "error", message: `${beforeApplied.req.method} ${finalUrlFromPlugins} → ${proxyData.error}` })
            }

            // Cookie jar: persist Set-Cookie headers from the response.
            if (
                activeTab.useCookieJar !== false &&
                Array.isArray(proxyData.setCookies) &&
                proxyData.setCookies.length > 0
            ) {
                storeCookiesFromResponse(urlObj.toString(), proxyData.setCookies)
            }

            let formattedBody = proxyData.body
            if (formattedBody && !proxyData.isBase64) {
                const responseContentType = (proxyData.headers as Record<string, string> | undefined)
                const rawCT = responseContentType
                    ? Object.entries(responseContentType).find(([k]) => k.toLowerCase() === "content-type")?.[1] ?? ""
                    : ""
                if (rawCT.includes("application/json")) {
                    const r = await formatJson(formattedBody)
                    if (r.ok) formattedBody = r.formatted
                }
                // Non-JSON content-types are NOT pretty-printed here. The previous
                // sync `JSON.stringify(JSON.parse(body))` blocked the main thread on
                // large XML/HTML/text bodies for no benefit. Monaco's built-in format
                // action (right-click → Format Document) handles XML on demand.
            }

            // ── Test script (runs against the live response) ──────────────
            if (activeTab.testScript && activeTab.testScript.trim()) {
                const postCtx: ScriptContext = {
                    request: {
                        url: urlObj.toString(),
                        method: workMethod,
                        headers: { ...headersObj },
                        body: bodyContent ?? undefined,
                    },
                    response: {
                        status: proxyData.status,
                        statusText: proxyData.statusText,
                        headers: proxyData.headers,
                        body: proxyData.body,
                        time: proxyData.time,
                    },
                    environment: { ...activeEnvironmentVariables, ...scriptEnvOverlay },
                    variables: { ...sessionVarsRef.current },
                }
                const r = await runScript(activeTab.testScript, postCtx)
                scriptTests.push(...r.tests)
                scriptLogs.push(...r.logs)
                if (!r.ok && r.error) scriptErrors.push(`test: ${r.error}`)
                for (const k of Object.keys(r.environment)) {
                    if (r.environment[k] !== activeEnvironmentVariables[k]) {
                        scriptEnvOverlay[k] = r.environment[k]
                    }
                }
                sessionVarsRef.current = r.variables
            }

            // Persist script-induced env mutations to the active environment.
            if (
                activeEnvId &&
                (Object.keys(scriptEnvOverlay).length > 0 || scriptEnvUnsets.size > 0)
            ) {
                const env = environments.find((e) => e.id === activeEnvId)
                if (env) {
                    const updatedKeys = new Set<string>()
                    const merged = env.variables
                        .filter((v) => !scriptEnvUnsets.has(v.key))
                        .map((v) => {
                            if (scriptEnvOverlay[v.key] !== undefined) {
                                updatedKeys.add(v.key)
                                return { ...v, value: scriptEnvOverlay[v.key] }
                            }
                            return v
                        })
                    for (const [k, val] of Object.entries(scriptEnvOverlay)) {
                        if (!updatedKeys.has(k)) {
                            merged.push({ id: crypto.randomUUID(), key: k, value: val, enabled: true })
                        }
                    }
                    updateEnvironment(activeEnvId, { variables: merged })
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
                    setCookies: proxyData.setCookies,
                    redirectChain: proxyData.redirectChain,
                },
                scriptResults: (scriptTests.length || scriptLogs.length || scriptErrors.length)
                    ? { tests: scriptTests, logs: scriptLogs, errors: scriptErrors }
                    : undefined,
                isLoading: false,
            })

            // Capture-replay recorder: append exchange to active session (no-op if none).
            recordExchange({
                request: {
                    method: workMethod,
                    url: activeTab.url,
                    headers: Object.fromEntries(activeTab.headers.filter((h) => h.active && h.key).map((h) => [h.key, h.value])),
                    body: typeof activeTab.body?.content === "string" ? activeTab.body.content : undefined,
                },
                response: {
                    status: proxyData.status,
                    statusText: proxyData.statusText,
                    timeMs: proxyData.time ?? 0,
                    bodyExcerpt: typeof formattedBody === "string" ? formattedBody.slice(0, 4096) : "",
                },
            })

            // IndexedDB cache: keep full response body across reloads (localStorage strips it).
            void putCachedResponse(activeTab.id, {
                status: proxyData.status,
                statusText: proxyData.statusText,
                headers: proxyData.headers,
                body: formattedBody,
                isBase64: proxyData.isBase64,
                time: proxyData.time,
                size: proxyData.size,
                error: proxyData.error,
                setCookies: proxyData.setCookies,
                redirectChain: proxyData.redirectChain,
            })

            addHistoryItem({
                method: workMethod as RequestMethod,
                url: activeTab.url,
                params: activeTab.params,
                headers: activeTab.headers,
                body: activeTab.body,
                auth: activeTab.auth,
                preRequestScript: activeTab.preRequestScript,
                testScript: activeTab.testScript,
            }, historyName(activeTab.name, workMethod, activeTab.url), proxyData.status)

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
            }, historyName(activeTab.name, activeTab.method, activeTab.url), 0)
        }
    }, [
        activeTab,
        updateActiveTab,
        isMobile,
        formatJson,
        runScript,
        addHistoryItem,
        activeEnvironmentVariables,
        activeEnvId,
        environments,
        updateEnvironment,
        t,
    ])

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

    // Keyboard shortcuts.
    // Cmd/Ctrl+T and Cmd/Ctrl+W are hard-reserved by the browser (`preventDefault`
    // does not override) so we bind Alt+T / Alt+W as the working equivalents.
    // Cmd/Ctrl+Enter still works inside form inputs.
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = /Mac|iPhone|iPad/i.test(navigator.userAgent)
            const mod = isMac ? e.metaKey : e.ctrlKey

            if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "t" || e.key === "T")) {
                e.preventDefault()
                addTab()
            } else if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "w" || e.key === "W")) {
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

    // Desktop request column — reused whether it sits full-width (no response yet)
    // or inside the resizable split (once a response exists / is loading).
    const desktopRequestContent = (
        <div className="p-4 md:p-6 lg:p-8 flex flex-col gap-6 flex-1 min-h-0">
            <RequestPanel
                method={activeTab.method}
                setMethod={handleMethodChange}
                url={activeTab.url}
                setUrl={handleUrlChange}
                onSend={handleSend}
                onCancel={handleCancel}
                isLoading={activeTab.isLoading}
                isBodyInvalid={isBodyInvalid}
                onPaste={handleCurlPaste}
                urlHistory={urlHistory}
                tabId={activeTab.id}
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
                    preRequestScript={activeTab.preRequestScript}
                    setPreRequestScript={(s) => updateActiveTab({ preRequestScript: s })}
                    testScript={activeTab.testScript}
                    setTestScript={(s) => updateActiveTab({ testScript: s })}
                    graphqlUrl={activeTab.url}
                    graphqlSchema={activeTab.graphqlSchema}
                    setGraphqlSchema={(s) => updateActiveTab({ graphqlSchema: s })}
                    examples={activeTab.examples}
                    onDeleteExample={handleDeleteExample}
                    onLoadExample={handleLoadExample}
                    comments={activeTab.comments}
                    setComments={(next) => updateActiveTab({ comments: next })}
                />
            </div>
        </div>
    )

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
                        {isMobile ? (
                            /* Mobile: secondary actions collapsed into dropdown */
                            <>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("toolbar.moreActions")}>
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => setCodeGenOpen(true)}>
                                            <IconCode className="h-4 w-4 mr-2" />
                                            {t("toolbar.code")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setSaveOpen(true)}>
                                            {t("toolbar.save")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setImportCurlOpen(true)}>
                                            {t("toolbar.importCurl")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setImportOpen(true)}>
                                            <Download className="h-4 w-4 mr-2" />
                                            {t("toolbar.importCollection")}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => setEnvMgrOpen(true)}>
                                            <IconSettings className="h-4 w-4 mr-2" />
                                            {t("toolbar.environments")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setCookieJarOpen(true)}>
                                            <Cookie className="h-4 w-4 mr-2" />
                                            {t("toolbar.cookies")}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => setMetricsOpen(true)}>
                                            <Activity className="h-4 w-4 mr-2" />
                                            {t("toolbar.metrics")}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => setHelpOpen(true)}>
                                            <Keyboard className="h-4 w-4 mr-2" />
                                            {t("toolbar.shortcuts")}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                {/* Env selector stays inline on mobile for quick switching */}
                                <Select
                                    value={activeEnvId || "none"}
                                    onValueChange={(val) => setActiveEnvId(val === "none" ? null : val)}
                                >
                                    <SelectTrigger className="w-[130px] h-8 text-xs">
                                        <SelectValue placeholder={t("environmentManager.noEnvironment")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t("environmentManager.noEnvironment")}</SelectItem>
                                        {environments.map(env => (
                                            <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </>
                        ) : (
                            /* Desktop: all buttons inline */
                            <>
                                <Select
                                    value={activeEnvId || "none"}
                                    onValueChange={(val) => setActiveEnvId(val === "none" ? null : val)}
                                >
                                    <SelectTrigger className="w-[150px] h-8 text-xs">
                                        <SelectValue placeholder={t("environmentManager.noEnvironment")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">{t("environmentManager.noEnvironment")}</SelectItem>
                                        {environments.map(env => (
                                            <SelectItem key={env.id} value={env.id}>{env.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title={t("environmentManager.manageDialogTitle")}
                                    onClick={() => setEnvMgrOpen(true)}
                                >
                                    <IconSettings className="h-4 w-4" />
                                </Button>
                                <div className="h-6 w-px bg-border/50 mx-1" />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title={t("codeGenerator.triggerTitle")}
                                    onClick={() => setCodeGenOpen(true)}
                                >
                                    <IconCode className="h-4 w-4" />
                                </Button>
                                <SaveRequestDialog
                                    collections={collections}
                                    onSave={handleSaveRequest}
                                    defaultName={activeTab.name !== API_CLIENT_DEFAULT_TAB_NAME ? activeTab.name : ""}
                                />
                                <ImportCurlDialog onImport={handleImportCurl} />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    title={t("toolbar.importCollection")}
                                    onClick={() => setImportOpen(true)}
                                >
                                    <Download className="h-4 w-4" />
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" title={t("toolbar.moreActions")} aria-label={t("toolbar.moreActions")}>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={() => setCookieJarOpen(true)}>
                                            <Cookie className="h-4 w-4 mr-2" />
                                            {t("toolbar.cookies")}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => setMetricsOpen(true)}>
                                            <Activity className="h-4 w-4 mr-2" />
                                            {t("toolbar.metrics")}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => setHelpOpen(true)}>
                                            <Keyboard className="h-4 w-4 mr-2" />
                                            {t("toolbar.shortcuts")}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <div className="h-6 w-px bg-border/50 mx-1" />
                                <OfflineIndicator />
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
                        {/* Dialogs rendered outside the conditional so state is preserved */}
                        {envMgrOpen && (
                            <EnvironmentManager open={envMgrOpen} onOpenChange={setEnvMgrOpen} />
                        )}
                        {codeGenOpen && (
                            <CodeGenerator
                                request={activeTab}
                                open={codeGenOpen}
                                onOpenChange={setCodeGenOpen}
                            />
                        )}
                        {isMobile && (
                            <>
                                <ImportCurlDialog onImport={handleImportCurl} open={importCurlOpen} onOpenChange={setImportCurlOpen} />
                                <SaveRequestDialog
                                    collections={collections}
                                    onSave={handleSaveRequest}
                                    defaultName={activeTab.name !== API_CLIENT_DEFAULT_TAB_NAME ? activeTab.name : ""}
                                    open={saveOpen}
                                    onOpenChange={setSaveOpen}
                                />
                            </>
                        )}
                        <HelpShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
                        <CookieJarDialog open={cookieJarOpen} onOpenChange={setCookieJarOpen} />
                        <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
                        <SaveExampleDialog
                            open={saveExampleOpen}
                            onOpenChange={setSaveExampleOpen}
                            defaultName={`${activeTab.method} ${activeTab.response?.status ?? "200"}`}
                            onSave={handleSaveExample}
                        />
                        <MetricsDialog open={metricsOpen} onOpenChange={setMetricsOpen} />
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
                        {activeTab.kind === "websocket" ? (
                            <div className="h-full p-4 md:p-6 lg:p-8">
                                <WebSocketPanel
                                    tab={activeTab}
                                    onUpdate={(patch) => updateActiveTab(patch)}
                                />
                            </div>
                        ) : activeTab.kind === "grpc" ? (
                            <div className="h-full p-4 md:p-6 lg:p-8">
                                <GrpcPanel
                                    tab={activeTab}
                                    onUpdate={(patch) => updateActiveTab(patch)}
                                />
                            </div>
                        ) : isMobile ? (
                            /* Mobile: separate scroll containers per panel — scroll position preserved on toggle */
                            <>
                                <div
                                    ref={requestScrollRef}
                                    className={`h-full overflow-y-auto${mobilePanel === 'request' ? '' : ' hidden'}`}
                                    onScroll={(e) => { scrollMemory.current.request = (e.target as HTMLDivElement).scrollTop }}
                                >
                                    <div className="p-4 flex flex-col gap-6 min-h-full">
                                        <RequestPanel
                                            method={activeTab.method}
                                            setMethod={handleMethodChange}
                                            url={activeTab.url}
                                            setUrl={handleUrlChange}
                                            onSend={handleSend}
                                            onCancel={handleCancel}
                                            isLoading={activeTab.isLoading}
                                            isBodyInvalid={isBodyInvalid}
                                            onPaste={handleCurlPaste}
                                            urlHistory={urlHistory}
                                            tabId={activeTab.id}
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
                                            preRequestScript={activeTab.preRequestScript}
                                            setPreRequestScript={(s) => updateActiveTab({ preRequestScript: s })}
                                            testScript={activeTab.testScript}
                                            setTestScript={(s) => updateActiveTab({ testScript: s })}
                                            graphqlUrl={activeTab.url}
                                            graphqlSchema={activeTab.graphqlSchema}
                                            setGraphqlSchema={(s) => updateActiveTab({ graphqlSchema: s })}
                                            examples={activeTab.examples}
                                            onDeleteExample={handleDeleteExample}
                                            onLoadExample={handleLoadExample}
                                            comments={activeTab.comments}
                                            setComments={(next) => updateActiveTab({ comments: next })}
                                        />
                                    </div>
                                </div>
                                <div
                                    ref={responseScrollRef}
                                    className={`h-full overflow-y-auto${mobilePanel === 'response' ? '' : ' hidden'}`}
                                    onScroll={(e) => { scrollMemory.current.response = (e.target as HTMLDivElement).scrollTop }}
                                >
                                    <div className="p-4">
                                        <ResponsePanel response={activeTab.response} isLoading={activeTab.isLoading} scriptResults={activeTab.scriptResults} onSaveExample={activeTab.response ? () => setSaveExampleOpen(true) : undefined} />
                                    </div>
                                </div>
                            </>
                        ) : !activeTab.response && !activeTab.isLoading ? (
                            /* Desktop: no response yet — request panel gets the full width */
                            <div className="h-full flex flex-col">
                                {desktopRequestContent}
                            </div>
                        ) : (
                            /* Desktop: side-by-side resizable panels once a response exists / is loading */
                            <ResizablePanelGroup direction="horizontal" className="h-full w-full">
                                <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col h-full">
                                    {desktopRequestContent}
                                </ResizablePanel>

                                <ResizableHandle withHandle className="w-1.5 bg-border/40 hover:bg-primary/20 transition-colors" />

                                <ResizablePanel defaultSize={50} minSize={30} className="flex flex-col h-full bg-muted/[0.02]">
                                    <div className="p-4 md:p-6 lg:p-8 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                                        <ResponsePanel response={activeTab.response} isLoading={activeTab.isLoading} scriptResults={activeTab.scriptResults} onSaveExample={activeTab.response ? () => setSaveExampleOpen(true) : undefined} />
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
                        onCollapse={() => setSidebarOpen(false)}
                    />
                </div>
            )}
        </div>
    )
}

export function ApiClient() {
    return <ApiClientInner />
}
