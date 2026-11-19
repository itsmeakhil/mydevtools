"use client"

import { apiFetch, sendProxyRequest } from "@/lib/desktop/api-fetch";
import * as React from "react"
import { Card } from "@/components/ui/card"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { RequestPanel } from "./request-panel"
import { RequestTabs } from "./request-tabs"
import { ResponsePanel } from "./response-panel"
import { TabBar } from "./tab-bar"
import { ImportCurlDialog, type ImportCurlTarget } from "./import-curl-dialog"
import { SaveExampleDialog } from "./save-example-dialog"
import { loadPlugins, instantiatePlugin, applyBeforeSend, applyAfterResponse, type PluginInstance } from "@/lib/plugins/plugin-runtime"
import { recordMetric, recordLog } from "@/lib/observability/metrics"
import { OfflineIndicator } from "./offline-indicator"
import { putCachedResponse, getCachedResponse } from "@/lib/cache/response-cache"
import { registerApiClientServiceWorker } from "@/lib/sw/register-api-client-sw"
import { listenForExtensionImports, capturedToTab } from "@/lib/extension/listen"
import { recordExchange } from "@/lib/recorder/traffic-recorder"
import type { RequestSettings, SavedExample } from "./types"
import { HelpShortcutsDialog } from "./help-shortcuts-dialog"
import { SaveRequestDialog } from "./collections/save-request-dialog"
import { parseCurlCommand } from "@/utils/curl-parser"
import { generateCode } from "./generate-code"
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"
import { CollectionsSidebar } from "./collections/collections-sidebar"
import { ToolSidebarLayout } from "@/components/tools/tool-sidebar"
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
    type ApiResponse,
} from "./types"
import type { ScriptContext } from "./workers/scripts-runner.worker"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useIsMobile } from "@/components/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FolderOpen, MoreVertical, MoreHorizontal, Cookie, Download, Activity, Keyboard, Send, Save, Plus, Plug, Boxes, X, Copy, ArrowRight, ArrowLeft, Link2, Terminal, Layers, Network, Puzzle } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { IconCode, IconSettings } from "@tabler/icons-react"
import { ensureHttpScheme } from "@/lib/url-normalize"
import { encodeBasicCredentials } from "@/lib/basic-auth"
import { ensureFreshToken } from "@/lib/oauth2"
import { signAwsSigV4 } from "@/lib/auth/aws-sigv4"
import { signHawk } from "@/lib/auth/hawk"
import { digestCredentials, signDigest } from "@/lib/auth/digest"
import { signJwt } from "@/lib/auth/jwt-bearer"
import { cookieHeaderForUrl, storeCookiesFromResponse } from "@/lib/cookie-jar"
import { evaluateAssertions } from "@/lib/api-client/assertions"
import { collectionNet } from "@/lib/api-client/network-settings"
import { streamSse, wantsEventStream, type StreamEvent } from "@/lib/api-client/sse"
import { isSubscriptionOperation, toWebSocketUrl } from "@/lib/api-client/graphql-operation"
import { subscribeGraphqlWs } from "@/lib/graphql-subscriptions"
import { resolveSecretVariables } from "@/lib/secret-variables"
import { useCipherKey } from "@/lib/use-cipher-key"
import { withFolderDefaults, findRequestAncestors, findRequestContext, listInheritedHeaders } from "@/lib/folder-inheritance"
import { SECRET_MASK, staticVariables, substituteVariables, variablesToRecord } from "@/lib/api-client/variables"
import { requestFromTab, requestFingerprint, savePatch, syncTabWithStored } from "@/lib/api-client/saved-request"
import { useJsonFormatter } from "./workers/use-json-formatter"
import { useScriptsRunner } from "./workers/use-scripts-runner"
import { useJsonBodyValidation } from "./use-json-validation"
import { useTabs, useTabsActions, createNewTab } from "./context/tabs-context"
import { useCollectionsState, useCollectionsActions } from "./context/collections-context"
import { useEnvironmentsState, useEnvironmentsActions } from "./context/environments-context"
import { useHistoryState, useHistoryActions } from "./context/history-context"
import { isMacPlatform, matchShortcut, shortcutHint, type ShortcutId } from "@/lib/api-client/shortcuts"
import { usePaletteActions, type PaletteAction } from "@/lib/palette-actions"

const EnvironmentManager = dynamic(
    () => import("./environment-manager").then(m => ({ default: m.EnvironmentManager })),
    { ssr: false, loading: () => null }
)
const CodeGenerator = dynamic(
    () => import("./code-generator").then(m => ({ default: m.CodeGenerator })),
    { ssr: false, loading: () => null }
)
// Heavy or rarely-used surfaces stay out of the route's critical chunk:
// gRPC pulls protobufjs, the importer pulls js-yaml + every importer.
const GrpcPanel = dynamic(() => import("./grpc-panel").then(m => ({ default: m.GrpcPanel })), { ssr: false, loading: () => null })
const WebSocketPanel = dynamic(() => import("./websocket-panel").then(m => ({ default: m.WebSocketPanel })), { ssr: false, loading: () => null })
const ImportDialog = dynamic(() => import("./import-dialog").then(m => ({ default: m.ImportDialog })), { ssr: false, loading: () => null })
const PluginsDialog = dynamic(() => import("./plugins-dialog").then(m => ({ default: m.PluginsDialog })), { ssr: false, loading: () => null })
const NetworkSettingsDialog = dynamic(() => import("./network/network-settings-dialog").then(m => ({ default: m.NetworkSettingsDialog })), { ssr: false, loading: () => null })
const CookieJarDialog = dynamic(() => import("./cookie-jar-dialog").then(m => ({ default: m.CookieJarDialog })), { ssr: false, loading: () => null })
const MetricsDialog = dynamic(() => import("./metrics-dialog").then(m => ({ default: m.MetricsDialog })), { ssr: false, loading: () => null })

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
    const tNav = useTranslations("Navigation")
    const tNet = useTranslations("ApiClient.network")
    const tPlugins = useTranslations("ApiClient.plugins")
    const { tabs, activeTabId, activeTab } = useTabs()
    const { addTab, appendTab, closeTab, duplicateTab, renameTab, reorderTabs, setActiveTabId, updateActiveTab, updateTab } = useTabsActions()

    const abortControllerRef = React.useRef<AbortController | null>(null)

    // Abort any in-flight request when the component unmounts.
    React.useEffect(() => () => abortControllerRef.current?.abort(), [])

    const { format: formatJson } = useJsonFormatter()
    const { run: runScript } = useScriptsRunner()
    const { collections } = useCollectionsState()
    const { saveRequest, updateRequest, addFolder, createCollection } = useCollectionsActions()
    const { history } = useHistoryState()
    const { addHistoryItem } = useHistoryActions()
    const { environments, activeEnvId, activeEnvironmentVariables, globalVariables, secretVariables } = useEnvironmentsState()
    const { setActiveEnvId, updateEnvironment } = useEnvironmentsActions()
    // Cipher key for cross-tool {{vault.*}} / {{env.*}} secret resolution.
    const cipherKey = useCipherKey()
    // Session-only variables — set by `pm.variables.set` in scripts and consumed by
    // the next request's variable substitution. Cleared on tab close.
    const sessionVarsRef = React.useRef<Record<string, string>>({})

    const isMobile = useIsMobile()
    const [mobilePanel, setMobilePanel] = React.useState<'request' | 'response'>('request')
    const [envMgrOpen, setEnvMgrOpen] = React.useState(false)
    const [codeGenOpen, setCodeGenOpen] = React.useState(false)
    const [importCurlOpen, setImportCurlOpen] = React.useState(false)
    const [helpOpen, setHelpOpen] = React.useState(false)
    const [saveOpen, setSaveOpen] = React.useState(false)
    const [cookieJarOpen, setCookieJarOpen] = React.useState(false)
    const [networkOpen, setNetworkOpen] = React.useState(false)
    const [pluginsOpen, setPluginsOpen] = React.useState(false)
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

    /** Compiled instances of the enabled plugins; reloaded when the Plugins dialog changes them. */
    const pluginInstancesRef = React.useRef<PluginInstance[]>([])
    const reloadPlugins = React.useCallback(() => {
        pluginInstancesRef.current = loadPlugins()
            .filter((p) => p.enabled)
            .map((p) => instantiatePlugin(p))
            .filter((r) => r.instance)
            .map((r) => r.instance!)
    }, [])
    React.useEffect(reloadPlugins, [reloadPlugins])

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

    const handleDeleteExample = React.useCallback((id: string) => {
        updateActiveTab((tab) => ({ examples: (tab.examples ?? []).filter((e) => e.id !== id) }))
    }, [updateActiveTab])

    const handleLoadExample = React.useCallback((example: SavedExample) => {
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
    }, [updateActiveTab])

    // One stable setter per RequestTabs field. Inline `(v) => updateActiveTab({...})`
    // props defeated RequestTabs' memo and re-rendered the whole editor per keystroke.
    const setField = React.useMemo(() => {
        const make = <K extends keyof ApiRequestState>(key: K) =>
            (value: ApiRequestState[K]) => updateActiveTab({ [key]: value } as Partial<ApiRequestState>)
        return {
            params: make("params"),
            headers: make("headers"),
            body: make("body"),
            auth: make("auth"),
            preRequestScript: make("preRequestScript"),
            testScript: make("testScript"),
            graphqlSchema: make("graphqlSchema"),
            comments: make("comments"),
            assertions: make("assertions"),
            description: make("description"),
            omitHeaders: make("omitHeaders"),
            settings: (patch: RequestSettings) => updateActiveTab(patch),
        }
    }, [updateActiveTab])
    // Own object so the memoized RequestTabs doesn't re-render on every URL/body keystroke.
    const { timeoutMs, useCookieJar, followRedirects, maxRedirects, verifySsl } = activeTab
    const requestSettings = React.useMemo<RequestSettings>(
        () => ({ timeoutMs, useCookieJar, followRedirects, maxRedirects, verifySsl }),
        [timeoutMs, useCookieJar, followRedirects, maxRedirects, verifySsl],
    )
    // Values the editor can show for {{vars}} — globals < collection < environment.
    const activeSourceId = activeTab.source?.requestId
    const activeContext = React.useMemo(
        () => (activeSourceId ? findRequestContext(collections, activeSourceId) : null),
        [collections, activeSourceId],
    )
    const activeCollection = activeContext?.collection
    // Default headers this request gets from its collection/folders (B3 omit list).
    const { headers: activeHeaders, omitHeaders: activeOmitHeaders } = activeTab
    const inheritedHeaders = React.useMemo(
        () => (activeContext
            ? listInheritedHeaders([activeContext.collection, ...activeContext.folders], activeHeaders, activeOmitHeaders)
            : []),
        [activeContext, activeHeaders, activeOmitHeaders],
    )
    // Secret values are masked here — this map only feeds the editor's hover text.
    const editorVariables = React.useMemo(() => {
        const vars = staticVariables({
            globals: globalVariables,
            collection: variablesToRecord(activeCollection?.variables),
            environment: activeEnvironmentVariables,
        })
        for (const key of Object.keys(secretVariables)) if (Object.hasOwn(vars, key)) vars[key] = SECRET_MASK
        return vars
    }, [globalVariables, activeCollection, activeEnvironmentVariables, secretVariables])
    const openSaveExample = React.useCallback(() => setSaveExampleOpen(true), [])

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
        // Drafts are named after their URL; a tab linked to a saved request keeps its name.
        updateActiveTab((tab) => tab.source ? { url } : { url, name: url || API_CLIENT_DEFAULT_TAB_NAME })
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

    const { copyToClipboard } = useCopyToClipboard()
    // Latest-value ref so callbacks handed to memoized children (RequestPanel)
    // stay referentially stable across keystrokes.
    const activeTabRef = React.useRef(activeTab)
    React.useEffect(() => { activeTabRef.current = activeTab }, [activeTab])
    const tabsRef = React.useRef(tabs)
    React.useEffect(() => { tabsRef.current = tabs }, [tabs])
    const collectionsRef = React.useRef(collections)
    React.useEffect(() => { collectionsRef.current = collections }, [collections])

    // Folder collections reload when their files change on disk: refresh clean
    // tabs, never clobber unsaved edits (warn once per disk version instead).
    const diskConflictsRef = React.useRef(new Set<string>())
    React.useEffect(() => {
        for (const tab of tabsRef.current) {
            const requestId = tab.source?.requestId
            if (!requestId) continue
            const ctx = findRequestContext(collections, requestId)
            if (!ctx?.collection.source) continue
            const parent = ctx.folders.length ? ctx.folders[ctx.folders.length - 1].items : ctx.collection.items
            const stored = parent.find((i): i is CollectionRequest => i.id === requestId)
            if (!stored) continue
            const sync = syncTabWithStored(tab, stored)
            if (sync.kind === "mark-saved") {
                updateTab(tab.id, { savedFingerprint: sync.fingerprint })
            } else if (sync.kind === "refresh") {
                updateTab(tab.id, { ...requestFromTab(stored as unknown as ApiRequestState), savedFingerprint: sync.fingerprint })
            } else if (sync.kind === "conflict" && !diskConflictsRef.current.has(`${tab.id}:${sync.fingerprint}`)) {
                diskConflictsRef.current.add(`${tab.id}:${sync.fingerprint}`)
                toast.warning(t("fileSync.changedOnDisk", { name: stored.name }), { duration: 10000 })
            }
        }
    }, [collections, updateTab, t])
    const handleCopyCurl = React.useCallback(() => {
        void copyToClipboard(generateCode(withFolderDefaults(activeTabRef.current, collectionsRef.current), "curl"), {
            successMessage: t("toasts.curlCopied"),
            errorMessage: t("toasts.copyFailed"),
        })
    }, [copyToClipboard, t])

    const handleSaveRequest = async (parentId: string, name: string) => {
        const tab = { ...activeTabRef.current, name }
        const requestToSave: CollectionRequest = { ...requestFromTab(tab), id: crypto.randomUUID() }
        updateTab(tab.id, { name })
        // Link the tab only once persisted, so a failed save stays a draft.
        if (await saveRequest(parentId, requestToSave)) {
            updateTab(tab.id, { source: { requestId: requestToSave.id }, savedFingerprint: requestFingerprint(tab) })
        }
    }

    /** ⌘S: overwrite the linked request in place, or ask where to save a draft. */
    const handleSaveShortcut = React.useCallback(async () => {
        const tab = activeTabRef.current
        if (tab.kind && tab.kind !== "rest") return
        const requestId = tab.source?.requestId
        let stored: CollectionRequest | undefined
        if (requestId) {
            for (const col of collectionsRef.current) {
                const ancestors = findRequestAncestors(col.items, requestId)
                if (ancestors === null) continue
                const siblings = ancestors.length ? ancestors[ancestors.length - 1].items : col.items
                stored = siblings.find((i): i is CollectionRequest => i.id === requestId)
                break
            }
        }
        if (!requestId || !stored) {
            // Never linked, or the request was deleted since: save as new.
            if (requestId) updateTab(tab.id, { source: undefined, savedFingerprint: undefined })
            setSaveOpen(true)
            return
        }
        // Keep dirty on failure (the hook toasts the reason) so the next ⌘S retries.
        if (await updateRequest(requestId, savePatch(tab, stored))) {
            updateTab(tab.id, { savedFingerprint: requestFingerprint(tab) })
        }
    }, [updateRequest, updateTab])

    const handleLoadRequest = React.useCallback((request: CollectionRequest) => {
        const open = tabsRef.current.find((t) => t.source?.requestId === request.id)
        if (open) {
            setActiveTabId(open.id)
            return
        }
        // The tab holds the request exactly as saved; folder defaults are applied
        // at send time (withFolderDefaults) so ⌘S never writes them back.
        const newTab: ApiRequestState = {
            ...createNewTab(),
            ...request,
            id: crypto.randomUUID(), // New ID for the tab instance
            response: null,
            isLoading: false,
            source: { requestId: request.id },
        }
        appendTab({ ...newTab, savedFingerprint: requestFingerprint(newTab) })
    }, [appendTab, setActiveTabId])

    const handleCancel = React.useCallback(() => {
        abortControllerRef.current?.abort()
        abortControllerRef.current = null
        updateActiveTab({ isLoading: false })
    }, [updateActiveTab])

    const sendImpl = React.useCallback(async () => {
        const sendTab = withFolderDefaults(activeTab, collections)
        if (!sendTab.url?.trim()) return

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
        const previousResponse = sendTab.response

        // Cross-tool secrets ({{vault.*}} / {{env.*}}) — resolved per send below,
        // never cached in component state.
        let secretVars: Record<string, string> = {}

        // Collection variables of the collection this tab was opened from (live).
        const sendCollection = activeTab.source ? findRequestContext(collections, activeTab.source.requestId)?.collection : undefined
        const collectionVars = variablesToRecord(sendCollection?.variables)
        const substituteAll = (text: string): string => substituteVariables(text, {
            globals: globalVariables,
            collection: collectionVars,
            environment: activeEnvironmentVariables,
            session: sessionVarsRef.current,
            overlay: scriptEnvOverlay,
            unsets: scriptEnvUnsets,
            secrets: secretVars,
            previousResponse,
        })

        try {
            // Working request state. Pre-request script may rewrite url/method/headers/body.
            let workMethod: string = sendTab.method
            let workUrl: string = sendTab.url
            let workHeaders: Record<string, string> = {}
            sendTab.headers.forEach((h) => {
                if (h.active && h.key) workHeaders[h.key] = h.value
            })

            // ── Pre-request script ────────────────────────────────────────
            if (sendTab.preRequestScript && sendTab.preRequestScript.trim()) {
                const preCtx: ScriptContext = {
                    request: {
                        url: workUrl,
                        method: workMethod,
                        headers: workHeaders,
                        body: sendTab.body.type === "json" || sendTab.body.type === "text"
                            ? sendTab.body.content
                            : undefined,
                    },
                    environment: { ...activeEnvironmentVariables },
                    variables: { ...sessionVarsRef.current },
                    collectionVariables: collectionVars,
                    globals: globalVariables,
                }
                const r = await runScript(sendTab.preRequestScript, preCtx)
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

            // Resolve cross-tool secrets referenced anywhere in the request
            // (scan the raw tab JSON so params/headers/auth/body are all covered).
            // Throws a user-facing message when the vault is locked → outer catch.
            // Only the editable request parts — stringifying the whole tab dragged
            // the previous response body and every saved example through the scan.
            secretVars = await resolveSecretVariables(
                [
                    workUrl,
                    JSON.stringify(workHeaders),
                    JSON.stringify({
                        params: sendTab.params,
                        headers: sendTab.headers,
                        auth: sendTab.auth,
                        body: { ...sendTab.body, formData: sendTab.body.formData?.map((f) => ({ ...f, fileContentBase64: undefined })) },
                    }),
                ],
                cipherKey,
            )

            // Substitute variables in URL
            const finalUrl = substituteAll(workUrl)

            // Construct URL with params
            const urlObj = buildRequestUrl(finalUrl)
            sendTab.params.forEach((p) => {
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
            if (sendTab.auth.type === "bearer" && sendTab.auth.token) {
                headersObj["Authorization"] = `Bearer ${substituteAll(sendTab.auth.token).trim()}`
            } else if (sendTab.auth.type === "basic" && sendTab.auth.username && sendTab.auth.password) {
                const credentials = encodeBasicCredentials(
                    substituteAll(sendTab.auth.username).trim(),
                    substituteAll(sendTab.auth.password),
                )
                headersObj["Authorization"] = `Basic ${credentials}`
            } else if (sendTab.auth.type === "api-key" && sendTab.auth.apiKeyKey && sendTab.auth.apiKeyValue) {
                const key = substituteAll(sendTab.auth.apiKeyKey).trim()
                const val = substituteAll(sendTab.auth.apiKeyValue).trim()
                if (sendTab.auth.apiKeyLocation === "query") {
                    urlObj.searchParams.append(key, val)
                } else {
                    headersObj[key] = val
                }
            } else if (sendTab.auth.type === "jwt-bearer" && sendTab.auth.jwtBearer) {
                try {
                    const cfg = sendTab.auth.jwtBearer
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
            } else if (sendTab.auth.type === "aws-sigv4" && sendTab.auth.awsSigV4) {
                // Defer signing until after the body is built — it has to hash the payload.
                // We mark the intent here and apply at the end of body assembly.
            } else if (sendTab.auth.type === "hawk" && sendTab.auth.hawk) {
                // Same — deferred to post-body assembly.
            } else if (sendTab.auth.type === "digest" && sendTab.auth.digest) {
                // Digest with qop=auth-int also needs body. Deferred.
            } else if (sendTab.auth.type === "oauth2" && sendTab.auth.oauth2) {
                // Refresh / re-fetch as needed. The fresh config is persisted back
                // into tab state so subsequent sends reuse the same access token.
                try {
                    const fresh = await ensureFreshToken(sendTab.auth.oauth2)
                    // Write refreshed tokens back only when the auth is the tab's own,
                    // not inherited from a folder (that would copy it into the request).
                    if (
                        sendTab.auth === activeTab.auth &&
                        fresh.accessToken !== sendTab.auth.oauth2.accessToken ||
                        fresh.refreshToken !== sendTab.auth.oauth2.refreshToken ||
                        fresh.expiresAt !== sendTab.auth.oauth2.expiresAt
                    ) {
                        updateActiveTab({ auth: { ...sendTab.auth, oauth2: fresh } })
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
            if (sendTab.useCookieJar !== false) {
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
            if (workMethod !== "GET" && workMethod !== "HEAD" && sendTab.body.type !== "none") {
                if (sendTab.body.type === "json") {
                    try {
                        const substitutedBody = substituteAll(sendTab.body.content)
                        // Validate JSON
                        JSON.parse(substitutedBody)
                        bodyContent = substitutedBody
                        bodyPayload = substitutedBody
                        headersObj["Content-Type"] = "application/json"
                    } catch (e) {
                        const parseErr = (e as Error).message
                        const hasUnresolvedVar = sendTab.body.content.includes("{{")
                        toast.error(
                            hasUnresolvedVar
                                ? `Invalid JSON after env substitution: ${parseErr}`
                                : `Invalid JSON body: ${parseErr}`,
                        )
                        updateActiveTab({ isLoading: false })
                        return
                    }
                } else if (sendTab.body.type === "x-www-form-urlencoded") {
                    const params = new URLSearchParams()
                    ;(sendTab.body.urlEncoded ?? []).forEach((item) => {
                        if (item.active && item.key) {
                            params.append(substituteAll(item.key), substituteAll(item.value))
                        }
                    })
                    bodyContent = params.toString()
                    bodyPayload = bodyContent
                    if (!Object.keys(headersObj).some((key) => key.toLowerCase() === "content-type")) {
                        headersObj["Content-Type"] = "application/x-www-form-urlencoded"
                    }
                } else if (sendTab.body.type === "form-data") {
                    const entries = (sendTab.body.formData ?? [])
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
                } else if (sendTab.body.type === "binary") {
                    const file = sendTab.body.binaryFile
                    if (!file?.fileContentBase64) {
                        toast.error(t("requestBody.binaryMissing"))
                        updateActiveTab({ isLoading: false })
                        return
                    }
                    bodyPayload = { mode: "base64", data: file.fileContentBase64 }
                    if (!Object.keys(headersObj).some((key) => key.toLowerCase() === "content-type")) {
                        headersObj["Content-Type"] = file.fileType || "application/octet-stream"
                    }
                } else if (sendTab.body.type === "graphql") {
                    // GraphQL is serialised as { query, variables } JSON and sent as application/json.
                    const query = substituteAll(sendTab.body.content)
                    let variables: unknown = undefined
                    const rawVars = (sendTab.body.graphqlVariables ?? "").trim()
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
                    bodyContent = substituteAll(sendTab.body.content)
                    bodyPayload = bodyContent
                    if (!Object.keys(headersObj).some((key) => key.toLowerCase() === "content-type")) {
                        headersObj["Content-Type"] = sendTab.body.type === "xml" ? "application/xml" : "text/plain"
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
                if (sendTab.auth.type === "aws-sigv4" && sendTab.auth.awsSigV4) {
                    await signAwsSigV4({
                        method: workMethod,
                        url: urlObj,
                        headers: headersObj,
                        body: bodyForSigning,
                        cfg: sendTab.auth.awsSigV4,
                    })
                } else if (sendTab.auth.type === "hawk" && sendTab.auth.hawk) {
                    await signHawk({
                        method: workMethod,
                        url: urlObj,
                        headers: headersObj,
                        body: bodyForSigning,
                        cfg: sendTab.auth.hawk,
                    })
                } else if (sendTab.auth.type === "digest" && sendTab.auth.digest?.nonce?.trim()) {
                    // A pasted nonce = pre-emptive; otherwise the proxy answers the challenge (digestAuth below).
                    await signDigest({
                        method: workMethod,
                        url: urlObj,
                        headers: headersObj,
                        body: bodyForSigning,
                        cfg: sendTab.auth.digest,
                    })
                }
            } catch (signErr) {
                toast.error(`Auth signing failed: ${(signErr as Error).message}`)
                updateActiveTab({ isLoading: false })
                return
            }

            // ── SPNEGO / Kerberos branch ─────────────────────────────────
            if (sendTab.auth.type === "spnego" && sendTab.auth.spnego) {
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
                        token: sendTab.auth.spnego.token,
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
            if (sendTab.auth.type === "ntlm" && sendTab.auth.ntlm) {
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
                            username: substituteAll(sendTab.auth.ntlm.username),
                            password: substituteAll(sendTab.auth.ntlm.password),
                            domain: sendTab.auth.ntlm.domain ? substituteAll(sendTab.auth.ntlm.domain) : undefined,
                            workstation: sendTab.auth.ntlm.workstation ? substituteAll(sendTab.auth.ntlm.workstation) : undefined,
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
                    url: sendTab.url,
                    params: sendTab.params,
                    headers: sendTab.headers,
                    body: sendTab.body,
                    auth: sendTab.auth,
                    preRequestScript: sendTab.preRequestScript,
                    testScript: sendTab.testScript,
                }, historyName(sendTab.name, workMethod, sendTab.url), ntlmData.status)
                return
            }

            // ── Live streams: SSE (`Accept: text/event-stream`) and GraphQL subscriptions ──
            // Messages land on the sending tab's response as they arrive; Cancel stops them.
            const gql = sendTab.body.type === "graphql" && bodyContent
                ? JSON.parse(bodyContent) as { query: string; variables?: Record<string, unknown> }
                : null
            const isSubscription = !!gql && isSubscriptionOperation(gql.query)
            if (isSubscription || wantsEventStream(headersObj)) {
                const tabId = sendTab.id
                const started = performance.now()
                const open = (r: Pick<ApiResponse, "status" | "statusText" | "headers">) => updateTab(tabId, {
                    response: { ...r, body: "", time: Math.round(performance.now() - started), size: 0, streamEvents: [] },
                })
                const append = (events: StreamEvent[]) => updateTab(tabId, (tab) => tab.response ? {
                    // ponytail: keeps the newest 1000 in memory; add a "save transcript" if people need more.
                    response: { ...tab.response, streamEvents: [...(tab.response.streamEvents ?? []), ...events].slice(-1000) },
                } : {})
                let streamError: string | undefined
                let raw = ""
                if (gql && isSubscription) {
                    streamError = await new Promise<string | undefined>((resolve) => {
                        let acked = false
                        const handle = subscribeGraphqlWs({
                            url: toWebSocketUrl(urlObj.toString()),
                            query: gql.query,
                            variables: gql.variables,
                            // Browsers can't set WebSocket headers; graphql-ws servers read auth from here.
                            connectionParams: headersObj,
                            onNext: (data, errors) => append([{
                                event: errors?.length ? "error" : "next",
                                data: JSON.stringify(errors?.length ? { data, errors } : data, null, 2),
                                timestamp: Date.now(),
                            }]),
                            // A graphql-ws `error` ends the operation; no `complete` follows it.
                            // Before the ack, `ready` rejects with the reason instead.
                            onError: (e) => {
                                if (!acked) return
                                append([{ event: "error", data: e.message, timestamp: Date.now() }])
                                handle.close()
                                resolve(undefined)
                            },
                            onComplete: () => resolve(undefined),
                        })
                        handle.ready.then(
                            () => { acked = true; open({ status: 101, statusText: "Switching Protocols", headers: {} }) },
                            (e: Error) => resolve(e.message),
                        )
                        controller.signal.addEventListener("abort", () => { handle.close(); resolve(undefined) }, { once: true })
                    })
                } else {
                    const r = await streamSse({
                        input: {
                            url: urlObj.toString(),
                            method: workMethod,
                            headers: headersObj,
                            body: typeof bodyPayload === "string" ? bodyPayload : (bodyContent ?? undefined),
                            verifySsl: sendTab.verifySsl,
                            net: collectionNet({ certs: sendCollection?.clientCerts, caPaths: sendCollection?.caPaths }, substituteAll),
                        },
                        signal: controller.signal,
                        onMeta: open,
                        onEvents: append,
                    })
                    streamError = r.error
                    raw = r.raw
                }
                updateTab(tabId, (tab) => ({
                    isLoading: false,
                    response: !tab.response
                        ? (streamError ? { status: 0, statusText: API_CLIENT_ERROR_STATUS_TEXT, headers: {}, body: streamError, time: 0, size: 0, error: streamError } : null)
                        : {
                            ...tab.response,
                            body: raw,
                            streamEvents: streamError
                                ? [...(tab.response.streamEvents ?? []), { event: "error", data: streamError, timestamp: Date.now() }]
                                : tab.response.streamEvents,
                        },
                }))
                addHistoryItem({
                    method: workMethod as RequestMethod,
                    url: sendTab.url,
                    params: sendTab.params,
                    headers: sendTab.headers,
                    body: sendTab.body,
                    auth: sendTab.auth,
                    preRequestScript: sendTab.preRequestScript,
                    testScript: sendTab.testScript,
                }, historyName(sendTab.name, workMethod, sendTab.url), streamError ? 0 : (isSubscription ? 101 : 200))
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

            // Send via Proxy (envelope returned directly — no fake Response round-trip)
            const rawEnvelope = await sendProxyRequest({
                url: finalUrlFromPlugins,
                method: beforeApplied.req.method,
                headers: headersObj,
                body: beforeApplied.req.body ?? bodyPayload ?? bodyContent,
                timeoutMs: sendTab.timeoutMs,
                followRedirects: sendTab.followRedirects,
                maxRedirects: sendTab.maxRedirects,
                verifySsl: sendTab.verifySsl,
                digestAuth: sendTab.auth.type === "digest" && !sendTab.auth.digest?.nonce?.trim()
                    ? digestCredentials(sendTab.auth.digest, substituteAll)
                    : undefined,
                // Collection certificates/CAs; global ones are merged in api-fetch.
                net: collectionNet({ certs: sendCollection?.clientCerts, caPaths: sendCollection?.caPaths }, substituteAll),
            }, controller.signal)
            const proxyData = {
                ...rawEnvelope,
                statusText: rawEnvelope.statusText ?? "",
                headers: rawEnvelope.headers ?? {},
                body: rawEnvelope.body ?? "",
                time: rawEnvelope.time ?? 0,
                size: rawEnvelope.size ?? 0,
                redirectChain: rawEnvelope.redirectChain as ApiResponse["redirectChain"],
            }

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

            // Observability: record metric for the metrics dashboard. Resolved
            // {{vault.*}}/{{env.*}} secrets are redacted back to their tokens —
            // the metrics panel renders these URLs.
            // Secret-flagged environment/global values are redacted the same way.
            const redactSecrets = (text: string): string =>
                Object.entries({ ...secretVariables, ...secretVars }).reduce(
                    (acc, [token, value]) => (value ? acc.split(value).join(`{{${token}}}`) : acc),
                    text,
                )
            recordMetric({
                method: beforeApplied.req.method,
                url: redactSecrets(finalUrlFromPlugins),
                status: proxyData.status ?? 0,
                timeMs: proxyData.time ?? 0,
                sizeBytes: proxyData.size ?? 0,
                error: proxyData.error,
            })

            if (proxyData.error) {
                recordLog({ level: "error", message: `${beforeApplied.req.method} ${redactSecrets(finalUrlFromPlugins)} → ${proxyData.error}` })
            }

            // Cookie jar: persist Set-Cookie headers from the response.
            if (
                sendTab.useCookieJar !== false &&
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
            if (sendTab.testScript && sendTab.testScript.trim()) {
                const postCtx: ScriptContext = {
                    request: {
                        url: urlObj.toString(),
                        method: workMethod,
                        headers: { ...headersObj },
                        body: bodyContent ?? undefined,
                    },
                    response: {
                        status: proxyData.status,
                        statusText: proxyData.statusText ?? "",
                        headers: proxyData.headers ?? {},
                        body: proxyData.body ?? "",
                        time: proxyData.time ?? 0,
                    },
                    environment: { ...activeEnvironmentVariables, ...scriptEnvOverlay },
                    variables: { ...sessionVarsRef.current },
                    collectionVariables: collectionVars,
                    globals: globalVariables,
                }
                const r = await runScript(sendTab.testScript, postCtx)
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

            scriptTests.push(...evaluateAssertions(sendTab.assertions, {
                status: proxyData.status,
                headers: proxyData.headers ?? {},
                body: proxyData.body ?? "",
                time: proxyData.time ?? 0,
            }))

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
                    statusText: proxyData.statusText ?? "",
                    headers: proxyData.headers ?? {},
                    body: formattedBody ?? "",
                    isBase64: proxyData.isBase64,
                    time: proxyData.time ?? 0,
                    size: proxyData.size ?? 0,
                    error: proxyData.error,
                    setCookies: proxyData.setCookies,
                    redirectChain: proxyData.redirectChain as ApiResponse["redirectChain"],
                    timeline: proxyData.timeline as ApiResponse["timeline"],
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
                    url: sendTab.url,
                    headers: Object.fromEntries(sendTab.headers.filter((h) => h.active && h.key).map((h) => [h.key, h.value])),
                    body: typeof sendTab.body?.content === "string" ? sendTab.body.content : undefined,
                },
                response: {
                    status: proxyData.status,
                    statusText: proxyData.statusText,
                    timeMs: proxyData.time ?? 0,
                    bodyExcerpt: typeof formattedBody === "string" ? formattedBody.slice(0, 4096) : "",
                },
            })

            // IndexedDB cache: keep full response body across reloads (localStorage strips it).
            void putCachedResponse(sendTab.id, {
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
                url: sendTab.url,
                params: sendTab.params,
                headers: sendTab.headers,
                body: sendTab.body,
                auth: sendTab.auth,
                preRequestScript: sendTab.preRequestScript,
                testScript: sendTab.testScript,
            }, historyName(sendTab.name, workMethod, sendTab.url), proxyData.status)

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
                method: sendTab.method,
                url: sendTab.url,
                params: sendTab.params,
                headers: sendTab.headers,
                body: sendTab.body,
                auth: sendTab.auth,
            }, historyName(sendTab.name, sendTab.method, sendTab.url), 0)
        }
    }, [
        activeTab,
        collections,
        updateActiveTab,
        updateTab,
        isMobile,
        formatJson,
        runScript,
        addHistoryItem,
        activeEnvironmentVariables,
        globalVariables,
        secretVariables,
        activeEnvId,
        environments,
        updateEnvironment,
        cipherKey,
        t,
    ])
    // `sendImpl` changes identity on every keystroke (it closes over activeTab);
    // the stable wrapper keeps RequestPanel memoized and the keydown listener put.
    const sendRef = React.useRef(sendImpl)
    React.useEffect(() => { sendRef.current = sendImpl }, [sendImpl])
    const handleSend = React.useCallback(() => sendRef.current(), [])

    // GraphQL introspection target: the tab's URL, params, headers and auth with
    // variables resolved — what a send would use, minus scripts and body signers.
    const introspectionTargetImpl = React.useCallback(async (): Promise<{ url: string; headers: Record<string, string> }> => {
        const tab = withFolderDefaults(activeTab, collections)
        const collection = activeTab.source ? findRequestContext(collections, activeTab.source.requestId)?.collection : undefined
        const secrets = await resolveSecretVariables(
            [tab.url, JSON.stringify({ params: tab.params, headers: tab.headers, auth: tab.auth })],
            cipherKey,
        )
        const sub = (text: string) => substituteVariables(text, {
            globals: globalVariables,
            collection: variablesToRecord(collection?.variables),
            environment: activeEnvironmentVariables,
            session: sessionVarsRef.current,
            secrets,
        })
        const urlObj = buildRequestUrl(sub(tab.url))
        tab.params.forEach((p) => { if (p.active && p.key) urlObj.searchParams.append(sub(p.key), sub(p.value)) })
        const headers: Record<string, string> = {}
        tab.headers.forEach((h) => { if (h.active && h.key) headers[sub(h.key)] = sub(h.value) })
        const auth = tab.auth
        if (auth.type === "bearer" && auth.token) {
            headers["Authorization"] = `Bearer ${sub(auth.token).trim()}`
        } else if (auth.type === "basic" && auth.username && auth.password) {
            headers["Authorization"] = `Basic ${encodeBasicCredentials(sub(auth.username).trim(), sub(auth.password))}`
        } else if (auth.type === "api-key" && auth.apiKeyKey && auth.apiKeyValue) {
            const key = sub(auth.apiKeyKey).trim()
            const val = sub(auth.apiKeyValue).trim()
            if (auth.apiKeyLocation === "query") urlObj.searchParams.append(key, val)
            else headers[key] = val
        } else if (auth.type === "oauth2" && auth.oauth2) {
            const fresh = await ensureFreshToken(auth.oauth2)
            if (fresh.accessToken) headers["Authorization"] = `${fresh.tokenType || "Bearer"} ${fresh.accessToken}`
        }
        // ponytail: SigV4/Hawk/JWT/Digest/NTLM aren't applied to introspection; reuse the send signers if a server needs them.
        return { url: urlObj.toString(), headers }
    }, [activeTab, collections, cipherKey, globalVariables, activeEnvironmentVariables])
    const introspectionTargetRef = React.useRef(introspectionTargetImpl)
    React.useEffect(() => { introspectionTargetRef.current = introspectionTargetImpl }, [introspectionTargetImpl])
    const resolveIntrospectionTarget = React.useCallback(() => introspectionTargetRef.current(), [])

    const handleCurlPaste = React.useCallback((curl: string) => {
        try {
            const parsed = parseCurlCommand(curl)
            // No URL extracted → don't claim success and don't wipe the current URL.
            if (!parsed.url) {
                toast.error(t("toasts.curlNoUrl"))
                return
            }
            const resolvedUrl = replaceUrlWithEnvBaseUrl(parsed.url)

            updateActiveTab({
                ...parsed,
                url: resolvedUrl || parsed.url,
                name: resolvedUrl || parsed.url,
            })
            toast.success(t("toasts.curlPasted"))
        } catch (error) {
            console.error(error)
            toast.error(t("toasts.curlParseFailed"))
        }
    }, [updateActiveTab, replaceUrlWithEnvBaseUrl, t])

    const cycleTab = React.useCallback((step: 1 | -1) => {
        const list = tabsRef.current
        const i = list.findIndex((tab) => tab.id === activeTabRef.current.id)
        if (list.length < 2 || i === -1) return
        setActiveTabId(list[(i + step + list.length) % list.length].id)
    }, [setActiveTabId])

    /** One entry point for keyboard shortcuts and their ⌘K palette twins. */
    const runShortcut = React.useCallback((id: ShortcutId) => {
        switch (id) {
            case "sendRequest": handleSend(); break
            case "saveRequest": void handleSaveShortcut(); break
            case "newTab": addTab(); break
            case "closeTab": closeTab(activeTabRef.current.id); break
            case "nextTab": cycleTab(1); break
            case "prevTab": cycleTab(-1); break
            case "focusUrl": {
                const input = document.querySelector<HTMLInputElement>("[data-api-url-input]")
                input?.focus()
                input?.select()
                break
            }
        }
    }, [handleSend, handleSaveShortcut, addTab, closeTab, cycleTab])

    // Keyboard shortcuts — the map lives in lib/api-client/shortcuts.ts.
    React.useEffect(() => {
        const isMac = isMacPlatform()
        const handleKeyDown = (e: KeyboardEvent) => {
            // An open dialog (save, import, palette…) owns the keyboard.
            if (document.querySelector('[role="dialog"][data-state="open"]')) return
            const id = matchShortcut(e, isMac)
            if (!id) return
            e.preventDefault()
            runShortcut(id)
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [runShortcut])

    // Set after mount: the server render can't know the platform.
    const [isMac, setIsMac] = React.useState(false)
    React.useEffect(() => { setIsMac(isMacPlatform()) }, [])

    // ⌘K palette commands while the API client is open.
    const paletteGroup = React.useMemo(() => {
        const shortcut = (id: ShortcutId, title: string, Icon: React.ElementType): PaletteAction =>
            ({ id, title, Icon, hint: shortcutHint(id, isMac), run: () => runShortcut(id) })
        const switchEnv = (id: string | null, name: string): PaletteAction => ({
            id: `env-${id ?? "none"}`,
            title: t("palette.switchEnvironment", { name }),
            keywords: [t("toolbar.environments")],
            Icon: Layers,
            run: () => setActiveEnvId(id),
        })
        return {
            heading: tNav("apiClient"),
            actions: [
                shortcut("sendRequest", t("shortcuts.sendRequest"), Send),
                shortcut("saveRequest", t("shortcuts.saveRequest"), Save),
                shortcut("newTab", t("tabBar.newRest"), Plus),
                { id: "new-websocket", title: t("tabBar.newWebSocket"), Icon: Plug, run: () => addTab("websocket") },
                { id: "new-grpc", title: t("tabBar.newGrpc"), Icon: Boxes, run: () => addTab("grpc") },
                { id: "duplicate-tab", title: t("tabBar.duplicateTab"), Icon: Copy, run: () => duplicateTab(activeTabRef.current.id) },
                shortcut("closeTab", t("shortcuts.closeTab"), X),
                shortcut("nextTab", t("shortcuts.nextTab"), ArrowRight),
                shortcut("prevTab", t("shortcuts.prevTab"), ArrowLeft),
                shortcut("focusUrl", t("shortcuts.focusUrl"), Link2),
                { id: "import-curl", title: t("toolbar.importCurl"), Icon: Terminal, run: () => setImportCurlOpen(true) },
                { id: "import-collection", title: t("toolbar.importCollection"), Icon: Download, run: () => setImportOpen(true) },
                { id: "generate-code", title: t("toolbar.code"), Icon: IconCode, run: () => setCodeGenOpen(true) },
                { id: "environments", title: t("environmentManager.manageDialogTitle"), Icon: IconSettings, run: () => setEnvMgrOpen(true) },
                { id: "cookies", title: t("toolbar.cookies"), Icon: Cookie, run: () => setCookieJarOpen(true) },
                { id: "network", title: tNet("title"), Icon: Network, run: () => setNetworkOpen(true) },
                { id: "plugins", title: tPlugins("title"), Icon: Puzzle, run: () => setPluginsOpen(true) },
                { id: "shortcuts", title: t("toolbar.shortcuts"), Icon: Keyboard, run: () => setHelpOpen(true) },
                switchEnv(null, t("environmentManager.noEnvironment")),
                ...environments.map((env) => switchEnv(env.id, env.name)),
            ],
        }
    }, [t, tNav, tNet, tPlugins, isMac, runShortcut, addTab, duplicateTab, environments, setActiveEnvId])
    usePaletteActions(paletteGroup)

    // Desktop request column — reused whether it sits full-width (no response yet)
    // or inside the resizable split (once a response exists / is loading).
    const desktopRequestContent = (
        <div className="p-4 flex flex-col gap-4 flex-1 min-h-0">
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
                onCopyCurl={handleCopyCurl}
                urlHistory={urlHistory}
                tabId={activeTab.id}
                variables={editorVariables}
            />
            <div className="flex-1 min-h-0">
                <RequestTabs
                    params={activeTab.params}
                    setParams={setField.params}
                    headers={activeTab.headers}
                    setHeaders={setField.headers}
                    inheritedHeaders={inheritedHeaders}
                    omitHeaders={activeOmitHeaders}
                    setOmitHeaders={setField.omitHeaders}
                    body={activeTab.body}
                    setBody={setField.body}
                    auth={activeTab.auth}
                    setAuth={setField.auth}
                    preRequestScript={activeTab.preRequestScript}
                    setPreRequestScript={setField.preRequestScript}
                    testScript={activeTab.testScript}
                    setTestScript={setField.testScript}
                    graphqlUrl={activeTab.url}
                    resolveIntrospectionTarget={resolveIntrospectionTarget}
                    graphqlSchema={activeTab.graphqlSchema}
                    setGraphqlSchema={setField.graphqlSchema}
                    examples={activeTab.examples}
                    onDeleteExample={handleDeleteExample}
                    onLoadExample={handleLoadExample}
                    comments={activeTab.comments}
                    setComments={setField.comments}
                    settings={requestSettings}
                    setSettings={setField.settings}
                    assertions={activeTab.assertions}
                    setAssertions={setField.assertions}
                    description={activeTab.description}
                    setDescription={setField.description}
                />
            </div>
        </div>
    )

    return (
        <ToolSidebarLayout
            toolId="api-client"
            icon={FolderOpen}
            title={t("layout.collections")}
            sidebar={<CollectionsSidebar onLoadRequest={handleLoadRequest} />}
            className="mobile-nav-offset"
        >
            <div className="flex-1 flex flex-col gap-3 min-w-0 h-full">
                <div className="flex flex-wrap justify-between items-center gap-2 px-4 pt-3">
                    {/* The panel header carries "Collections"; without this the tool
                        itself was unnamed, and unnamed entirely once collapsed. */}
                    <h1 className="text-[15px] font-semibold tracking-[-0.01em]">{tNav("apiClient")}</h1>
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
                                        <DropdownMenuItem onSelect={() => setNetworkOpen(true)}>
                                            <Network className="h-4 w-4 mr-2" />
                                            {tNet("title")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setPluginsOpen(true)}>
                                            <Puzzle className="h-4 w-4 mr-2" />
                                            {tPlugins("title")}
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
                                <div className="h-5 w-px shrink-0 bg-border" />
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
                                    onCreateFolder={addFolder}
                                    onCreateCollection={createCollection}
                                    defaultName={activeTab.name !== API_CLIENT_DEFAULT_TAB_NAME ? activeTab.name : ""}
                                    open={saveOpen}
                                    onOpenChange={setSaveOpen}
                                    showTrigger
                                />
                                <ImportCurlDialog onImport={handleImportCurl} open={importCurlOpen} onOpenChange={setImportCurlOpen} showTrigger />
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
                                        <DropdownMenuItem onSelect={() => setNetworkOpen(true)}>
                                            <Network className="h-4 w-4 mr-2" />
                                            {tNet("title")}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => setPluginsOpen(true)}>
                                            <Puzzle className="h-4 w-4 mr-2" />
                                            {tPlugins("title")}
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
                                {/* No divider here — OfflineIndicator renders null while
                                    online, and a lone divider left a phantom gap. It brings
                                    its own separator when it has something to show. */}
                                <OfflineIndicator />
                            </>
                        )}
                        {/* Dialogs rendered outside the conditional so state is preserved */}
                        {envMgrOpen && (
                            <EnvironmentManager open={envMgrOpen} onOpenChange={setEnvMgrOpen} />
                        )}
                        {codeGenOpen && (
                            <CodeGenerator
                                request={withFolderDefaults(activeTab, collections)}
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
                                    onCreateFolder={addFolder}
                                    onCreateCollection={createCollection}
                                    defaultName={activeTab.name !== API_CLIENT_DEFAULT_TAB_NAME ? activeTab.name : ""}
                                    open={saveOpen}
                                    onOpenChange={setSaveOpen}
                                />
                            </>
                        )}
                        <HelpShortcutsDialog open={helpOpen} onOpenChange={setHelpOpen} />
                        <CookieJarDialog open={cookieJarOpen} onOpenChange={setCookieJarOpen} />
                        {pluginsOpen && <PluginsDialog open={pluginsOpen} onOpenChange={setPluginsOpen} onChange={reloadPlugins} />}
                        {networkOpen && <NetworkSettingsDialog open={networkOpen} onOpenChange={setNetworkOpen} />}
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

                <Card className="flex-1 flex flex-col overflow-hidden">
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
                        <div className="flex shrink-0 bg-foreground/[0.06] p-[3px] gap-1 mx-2 mt-2 mb-1 rounded-[10px]">
                            <button
                                onClick={() => setMobilePanel('request')}
                                className={`flex-1 rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                                    mobilePanel === 'request'
                                        ? 'bg-card text-foreground shadow-elev-1'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t("layout.request")}
                            </button>
                            <button
                                onClick={() => setMobilePanel('response')}
                                className={`flex-1 rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                                    mobilePanel === 'response'
                                        ? 'bg-card text-foreground shadow-elev-1'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {t("layout.response")}
                                {activeTab.response && (
                                    <span className={`ml-1.5 inline-block h-2 w-2 rounded-full ${
                                        activeTab.response.status >= 200 && activeTab.response.status < 300
                                            ? 'bg-success'
                                            : activeTab.response.status >= 400
                                            ? 'bg-destructive'
                                            : 'bg-warning'
                                    }`} />
                                )}
                            </button>
                        </div>
                    )}

                    <div className="flex-1 overflow-hidden min-h-0">
                        {activeTab.kind === "websocket" ? (
                            <div className="h-full p-4">
                                <WebSocketPanel
                                    tab={activeTab}
                                    onUpdate={(patch) => updateActiveTab(patch)}
                                />
                            </div>
                        ) : activeTab.kind === "grpc" ? (
                            <div className="h-full p-4">
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
                                            onCopyCurl={handleCopyCurl}
                                            urlHistory={urlHistory}
                                            tabId={activeTab.id}
                                            variables={editorVariables}
                                        />
                                        <RequestTabs
                                            params={activeTab.params}
                                            setParams={setField.params}
                                            headers={activeTab.headers}
                                            setHeaders={setField.headers}
                                            inheritedHeaders={inheritedHeaders}
                                            omitHeaders={activeOmitHeaders}
                                            setOmitHeaders={setField.omitHeaders}
                                            body={activeTab.body}
                                            setBody={setField.body}
                                            auth={activeTab.auth}
                                            setAuth={setField.auth}
                                            preRequestScript={activeTab.preRequestScript}
                                            setPreRequestScript={setField.preRequestScript}
                                            testScript={activeTab.testScript}
                                            setTestScript={setField.testScript}
                                            graphqlUrl={activeTab.url}
                                            resolveIntrospectionTarget={resolveIntrospectionTarget}
                                            graphqlSchema={activeTab.graphqlSchema}
                                            setGraphqlSchema={setField.graphqlSchema}
                                            examples={activeTab.examples}
                                            onDeleteExample={handleDeleteExample}
                                            onLoadExample={handleLoadExample}
                                            comments={activeTab.comments}
                                            setComments={setField.comments}
                                            settings={requestSettings}
                                            setSettings={setField.settings}
                                            assertions={activeTab.assertions}
                                            setAssertions={setField.assertions}
                                            description={activeTab.description}
                                            setDescription={setField.description}
                                        />
                                    </div>
                                </div>
                                <div
                                    ref={responseScrollRef}
                                    className={`h-full overflow-y-auto${mobilePanel === 'response' ? '' : ' hidden'}`}
                                    onScroll={(e) => { scrollMemory.current.response = (e.target as HTMLDivElement).scrollTop }}
                                >
                                    <div className="p-4">
                                        <ResponsePanel response={activeTab.response} isLoading={activeTab.isLoading} scriptResults={activeTab.scriptResults} onSaveExample={activeTab.response ? openSaveExample : undefined} />
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Desktop: the request panel is always mounted in the same group; the
                               response panel joins the split once a response exists / is loading.
                               Swapping the whole layout on Send remounted every Monaco editor. */
                            <ResizablePanelGroup direction="horizontal" className="h-full w-full">
                                <ResizablePanel id="request" order={1} defaultSize={50} minSize={30} className="flex flex-col h-full">
                                    {desktopRequestContent}
                                </ResizablePanel>
                                {(activeTab.response || activeTab.isLoading) && (
                                    <>
                                        <ResizableHandle className="hover:bg-primary/40 transition-colors" />
                                        <ResizablePanel id="response" order={2} defaultSize={50} minSize={30} className="flex flex-col h-full">
                                            <div className="p-4 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                                                <ResponsePanel response={activeTab.response} isLoading={activeTab.isLoading} scriptResults={activeTab.scriptResults} onSaveExample={activeTab.response ? openSaveExample : undefined} />
                                            </div>
                                        </ResizablePanel>
                                    </>
                                )}
                            </ResizablePanelGroup>
                        )}
                    </div>
                </Card>
            </div>
        </ToolSidebarLayout>
    )
}

export function ApiClient() {
    return <ApiClientInner />
}
