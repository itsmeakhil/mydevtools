"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KeyValueEditor } from "./key-value-editor"
import { KeyValueItem, RequestBody, RequestAuth, RequestFormDataItem, GraphQLIntrospectionType } from "./types"
import { useJsonBodyValidation } from "./use-json-validation"
import { CommentsPanel } from "./comments-panel"
import { fetchGraphQLSchema } from "@/lib/graphql-introspect"
import {
    fetchClientCredentialsToken,
    refreshAccessToken,
    startAuthorizationCodeFlow,
    type OAuth2Config,
    type OAuth2GrantType,
} from "@/lib/oauth2"
import { toast } from "sonner"
import dynamic from "next/dynamic"

// Stable sentinel IDs for the placeholder rows shown before a user adds anything.
// Random IDs regenerated per render caused React to discard the row mid-keystroke.
const FORM_DATA_SENTINEL_ID = "__formdata_sentinel__"
const URL_ENCODED_SENTINEL_ID = "__urlencoded_sentinel__"

const CodeEditor = dynamic(
    () => import("@/components/ui/code-editor"),
    { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-muted/30" /> }
)
const MemoCodeEditor = React.memo(CodeEditor)
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Trash2 } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

interface RequestTabsProps {
    params: KeyValueItem[]
    setParams: (params: KeyValueItem[]) => void
    headers: KeyValueItem[]
    setHeaders: (headers: KeyValueItem[]) => void
    body: RequestBody
    setBody: (body: RequestBody) => void
    auth: RequestAuth
    setAuth: (auth: RequestAuth) => void
    preRequestScript?: string
    setPreRequestScript?: (s: string) => void
    testScript?: string
    setTestScript?: (s: string) => void
    /** GraphQL introspection target URL + persisted schema. */
    graphqlUrl?: string
    graphqlSchema?: { types: GraphQLIntrospectionType[]; queryType?: string; mutationType?: string; subscriptionType?: string }
    setGraphqlSchema?: (s: RequestTabsProps["graphqlSchema"]) => void
    /** Saved examples on this tab. */
    examples?: import("./types").SavedExample[]
    onDeleteExample?: (id: string) => void
    onLoadExample?: (example: import("./types").SavedExample) => void
    /** Per-request comments. */
    comments?: import("./types").RequestComment[]
    setComments?: (next: import("./types").RequestComment[]) => void
}

export function RequestTabs({
    params,
    setParams,
    headers,
    setHeaders,
    body,
    setBody,
    auth,
    setAuth,
    preRequestScript = "",
    setPreRequestScript,
    testScript = "",
    setTestScript,
    graphqlUrl,
    graphqlSchema,
    setGraphqlSchema,
    examples,
    onDeleteExample,
    onLoadExample,
    comments,
    setComments,
}: RequestTabsProps) {
    const t = useTranslations("ApiClient.requestTabs")
    const activeParamsCount = params.filter(p => p.active && (p.key || p.value)).length
    const activeHeadersCount = headers.filter(h => h.active && (h.key || h.value)).length
    const jsonValidation = useJsonBodyValidation(body)
    const normalizedBody = React.useMemo<RequestBody>(() => ({
        ...body,
        formData: body.formData ?? [
            { id: FORM_DATA_SENTINEL_ID, key: "", value: "", active: true, valueType: "text" },
        ],
        urlEncoded: body.urlEncoded ?? [
            { id: URL_ENCODED_SENTINEL_ID, key: "", value: "", active: true },
        ],
    }), [body])

    const updateBody = (updates: Partial<RequestBody>) => {
        setBody({ ...normalizedBody, ...updates })
    }

    const addFormDataItem = () => {
        updateBody({
            formData: [
                ...(normalizedBody.formData ?? []),
                { id: crypto.randomUUID(), key: "", value: "", active: true, valueType: "text" },
            ],
        })
    }

    const updateFormDataItem = (id: string, updates: Partial<RequestFormDataItem>) => {
        updateBody({
            formData: (normalizedBody.formData ?? []).map((item) =>
                item.id === id ? { ...item, ...updates } : item
            ),
        })
    }

    const deleteFormDataItem = (id: string) => {
        updateBody({
            formData: (normalizedBody.formData ?? []).filter((item) => item.id !== id),
        })
    }

    const addUrlEncodedItem = () => {
        updateBody({
            urlEncoded: [
                ...(normalizedBody.urlEncoded ?? []),
                { id: crypto.randomUUID(), key: "", value: "", active: true },
            ],
        })
    }

    const updateUrlEncodedItem = (id: string, field: keyof KeyValueItem, value: string | boolean) => {
        updateBody({
            urlEncoded: (normalizedBody.urlEncoded ?? []).map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            ),
        })
    }

    const deleteUrlEncodedItem = (id: string) => {
        updateBody({
            urlEncoded: (normalizedBody.urlEncoded ?? []).filter((item) => item.id !== id),
        })
    }

    const handleBodyContentChange = React.useCallback(
        (v: string) => updateBody({ content: v }),
        // updateBody closes over normalizedBody via its own capture; listing
        // updateBody as the dep is sufficient and avoids re-creating the
        // callback on every normalizedBody identity change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [updateBody]
    )

    /** Build a clean RequestAuth when the user switches type, so stale
     *  bearer-token / basic-password fields don't ride along into the next request. */
    const handleAuthTypeChange = (next: RequestAuth["type"]) => {
        switch (next) {
            case "none":
                setAuth({ type: "none" })
                return
            case "bearer":
                setAuth({ type: "bearer", token: auth.type === "bearer" ? auth.token ?? "" : "" })
                return
            case "basic":
                setAuth({
                    type: "basic",
                    username: auth.type === "basic" ? auth.username ?? "" : "",
                    password: auth.type === "basic" ? auth.password ?? "" : "",
                })
                return
            case "api-key":
                setAuth({
                    type: "api-key",
                    apiKeyKey: auth.type === "api-key" ? auth.apiKeyKey ?? "" : "",
                    apiKeyValue: auth.type === "api-key" ? auth.apiKeyValue ?? "" : "",
                    apiKeyLocation: auth.type === "api-key" ? auth.apiKeyLocation ?? "header" : "header",
                })
                return
            case "oauth2":
                setAuth({
                    type: "oauth2",
                    oauth2: auth.type === "oauth2" && auth.oauth2
                        ? auth.oauth2
                        : { grantType: "client_credentials", tokenUrl: "", clientId: "" },
                })
                return
            case "aws-sigv4":
                setAuth({
                    type: "aws-sigv4",
                    awsSigV4: auth.type === "aws-sigv4" && auth.awsSigV4
                        ? auth.awsSigV4
                        : { accessKeyId: "", secretAccessKey: "", region: "us-east-1", service: "" },
                })
                return
            case "hawk":
                setAuth({
                    type: "hawk",
                    hawk: auth.type === "hawk" && auth.hawk
                        ? auth.hawk
                        : { id: "", key: "", algorithm: "sha256" },
                })
                return
            case "digest":
                setAuth({
                    type: "digest",
                    digest: auth.type === "digest" && auth.digest
                        ? auth.digest
                        : { username: "", password: "", realm: "", nonce: "", qop: "auth", algorithm: "MD5" },
                })
                return
            case "ntlm":
                setAuth({
                    type: "ntlm",
                    ntlm: auth.type === "ntlm" && auth.ntlm
                        ? auth.ntlm
                        : { username: "", password: "", domain: "", workstation: "" },
                })
                return
            case "jwt-bearer":
                setAuth({
                    type: "jwt-bearer",
                    jwtBearer: auth.type === "jwt-bearer" && auth.jwtBearer
                        ? auth.jwtBearer
                        : { algorithm: "HS256", secret: "", ttlSeconds: 3600 },
                })
                return
            case "spnego":
                setAuth({
                    type: "spnego",
                    spnego: auth.type === "spnego" && auth.spnego ? auth.spnego : { token: "" },
                })
                return
        }
    }

    const updateJwtCfg = (patch: Partial<NonNullable<RequestAuth["jwtBearer"]>>) => {
        if (auth.type !== "jwt-bearer") return
        setAuth({ ...auth, jwtBearer: { ...(auth.jwtBearer ?? { algorithm: "HS256" }), ...patch } })
    }

    const updateSpnegoCfg = (patch: Partial<NonNullable<RequestAuth["spnego"]>>) => {
        if (auth.type !== "spnego") return
        setAuth({ ...auth, spnego: { ...(auth.spnego ?? { token: "" }), ...patch } })
    }

    const updateNtlmCfg = (patch: Partial<NonNullable<RequestAuth["ntlm"]>>) => {
        if (auth.type !== "ntlm") return
        setAuth({ ...auth, ntlm: { ...(auth.ntlm ?? { username: "", password: "" }), ...patch } })
    }

    const updateAwsCfg = (patch: Partial<NonNullable<RequestAuth["awsSigV4"]>>) => {
        if (auth.type !== "aws-sigv4") return
        setAuth({ ...auth, awsSigV4: { ...(auth.awsSigV4 ?? { accessKeyId: "", secretAccessKey: "", region: "", service: "" }), ...patch } })
    }
    const updateHawkCfg = (patch: Partial<NonNullable<RequestAuth["hawk"]>>) => {
        if (auth.type !== "hawk") return
        setAuth({ ...auth, hawk: { ...(auth.hawk ?? { id: "", key: "" }), ...patch } })
    }
    const updateDigestCfg = (patch: Partial<NonNullable<RequestAuth["digest"]>>) => {
        if (auth.type !== "digest") return
        setAuth({ ...auth, digest: { ...(auth.digest ?? { username: "", password: "", realm: "", nonce: "" }), ...patch } })
    }

    const updateOAuthConfig = (patch: Partial<OAuth2Config>) => {
        if (auth.type !== "oauth2") return
        setAuth({ ...auth, oauth2: { ...(auth.oauth2 ?? { grantType: "client_credentials", tokenUrl: "", clientId: "" }), ...patch } })
    }

    const [introspecting, setIntrospecting] = React.useState(false)
    const handleIntrospect = async () => {
        if (!graphqlUrl || !setGraphqlSchema) return
        setIntrospecting(true)
        try {
            const result = await fetchGraphQLSchema({ url: graphqlUrl })
            setGraphqlSchema(result)
            toast.success(`Introspected ${result.types.length} types`)
        } catch (e) {
            toast.error((e as Error).message)
        } finally {
            setIntrospecting(false)
        }
    }

    const [tokenLoading, setTokenLoading] = React.useState(false)
    const handleFetchToken = async () => {
        if (auth.type !== "oauth2" || !auth.oauth2) return
        setTokenLoading(true)
        try {
            const fresh = auth.oauth2.grantType === "authorization_code"
                ? await startAuthorizationCodeFlow(auth.oauth2)
                : await fetchClientCredentialsToken(auth.oauth2)
            setAuth({ ...auth, oauth2: fresh })
            toast.success("Access token retrieved")
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setTokenLoading(false)
        }
    }
    const handleRefreshToken = async () => {
        if (auth.type !== "oauth2" || !auth.oauth2?.refreshToken) return
        setTokenLoading(true)
        try {
            const fresh = await refreshAccessToken(auth.oauth2)
            setAuth({ ...auth, oauth2: fresh })
            toast.success("Access token refreshed")
        } catch (err) {
            toast.error((err as Error).message)
        } finally {
            setTokenLoading(false)
        }
    }

    const handleFileSelect = async (id: string, file: File | null) => {
        if (!file) return
        // FileReader.readAsDataURL streams chunked base64 in the browser without
        // building a multi-MB intermediate Latin-1 string. The previous synchronous
        // `btoa(String.fromCharCode(...bytes))` blew the call stack on files > ~1MB.
        const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
                const result = String(reader.result ?? "")
                const comma = result.indexOf(",")
                resolve(comma >= 0 ? result.slice(comma + 1) : "")
            }
            reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"))
            reader.readAsDataURL(file)
        })
        updateFormDataItem(id, {
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileContentBase64: base64,
            value: file.name,
        })
    }

    return (
        <Tabs defaultValue="params" className="w-full h-full flex flex-col min-h-0">
            <TabsList className="w-full justify-start h-10 p-1 bg-muted/50 border rounded-lg">
                <TabsTrigger value="params" className="flex items-center gap-2 px-4">
                    {t("params")}
                    {activeParamsCount > 0 && (
                        <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px] bg-primary/10 text-primary border-none">
                            {activeParamsCount}
                        </Badge>
                    )}
                </TabsTrigger>
                <TabsTrigger value="headers" className="flex items-center gap-2 px-4">
                    {t("headers")}
                    {activeHeadersCount > 0 && (
                        <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px] bg-primary/10 text-primary border-none">
                            {activeHeadersCount}
                        </Badge>
                    )}
                </TabsTrigger>
                <TabsTrigger value="body" className="flex items-center gap-2 px-4">
                    {t("body")}
                    {body.type === "json" && (
                        jsonValidation.valid
                            ? <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            : <div className="h-1.5 w-1.5 rounded-full bg-rose-500" title="Invalid JSON" />
                    )}
                    {body.type !== "none" && body.type !== "json" && (
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                </TabsTrigger>
                <TabsTrigger value="auth" className="flex items-center gap-2 px-4">
                    {t("auth")}
                    {auth.type !== "none" && (
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                </TabsTrigger>
                <TabsTrigger value="pre-request" className="flex items-center gap-2 px-4">
                    Pre-request
                    {preRequestScript.trim() && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </TabsTrigger>
                <TabsTrigger value="tests" className="flex items-center gap-2 px-4">
                    Tests
                    {testScript.trim() && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </TabsTrigger>
                {examples && examples.length > 0 && (
                    <TabsTrigger value="examples" className="flex items-center gap-2 px-4">
                        Examples
                        <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">{examples.length}</span>
                    </TabsTrigger>
                )}
                {setComments && (
                    <TabsTrigger value="comments" className="flex items-center gap-2 px-4">
                        Comments
                        {comments && comments.length > 0 && (
                            <span className="text-[10px] bg-primary/10 text-primary px-1 rounded">{comments.length}</span>
                        )}
                    </TabsTrigger>
                )}
            </TabsList>
            <div className="mt-4 border rounded-xl p-6 bg-card shadow-inner flex-1 min-h-0 overflow-hidden">
                <TabsContent value="params" className="mt-0 h-full overflow-auto custom-scrollbar">
                    <KeyValueEditor items={params} onChange={setParams} />
                </TabsContent>
                <TabsContent value="headers" className="mt-0 h-full overflow-auto custom-scrollbar">
                    <KeyValueEditor items={headers} onChange={setHeaders} />
                </TabsContent>
                <TabsContent value="body" className="mt-0 h-full flex flex-col gap-4 min-h-0">
                    <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-lg border">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("bodyType")}</Label>
                        <Select
                            value={normalizedBody.type}
                            onValueChange={(v) => updateBody({ type: v as RequestBody["type"] })}
                        >
                            <SelectTrigger className="w-full sm:w-[220px] h-8 text-xs">
                                <SelectValue placeholder={t("selectType")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t("bodyNone")}</SelectItem>
                                <SelectItem value="json">{t("bodyJson")}</SelectItem>
                                <SelectItem value="text">{t("bodyText")}</SelectItem>
                                <SelectItem value="form-data">Form Data (multipart/form-data)</SelectItem>
                                <SelectItem value="x-www-form-urlencoded">x-www-form-urlencoded</SelectItem>
                                <SelectItem value="graphql">GraphQL</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {normalizedBody.type === "json" || normalizedBody.type === "text" ? (
                        <div className="flex-1 flex flex-col gap-2 min-h-0">
                            {normalizedBody.type === "json" && jsonValidation.error && (
                                <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-1.5 font-mono shrink-0">
                                    {jsonValidation.error}
                                </div>
                            )}
                            <div className="flex-1 border rounded-lg overflow-hidden shadow-sm min-h-0">
                                <MemoCodeEditor
                                    value={normalizedBody.content}
                                    onChange={handleBodyContentChange}
                                    language={normalizedBody.type === "json" ? "json" : "plaintext"}
                                />
                            </div>
                        </div>
                    ) : normalizedBody.type === "form-data" ? (
                        <div className="rounded-lg border bg-background flex-1 min-h-0">
                            <div className="overflow-x-auto">
                            <div className="grid grid-cols-[40px_1fr_160px_1fr_44px] gap-2 px-3 py-2 border-b text-xs font-semibold text-muted-foreground min-w-[480px]">
                                <div />
                                <div>Key</div>
                                <div>Type</div>
                                <div>Value</div>
                                <div />
                            </div>
                            <div className="p-3 space-y-2 flex-1 min-h-0 overflow-auto custom-scrollbar min-w-[480px]">
                                {(normalizedBody.formData ?? []).map((item) => (
                                    <div key={item.id} className="grid grid-cols-[40px_1fr_160px_1fr_44px] gap-2 items-center">
                                        <div className="flex justify-center">
                                            <Checkbox
                                                checked={item.active}
                                                onCheckedChange={(checked) => updateFormDataItem(item.id, { active: Boolean(checked) })}
                                            />
                                        </div>
                                        <Input
                                            placeholder="Key"
                                            value={item.key}
                                            onChange={(e) => updateFormDataItem(item.id, { key: e.target.value })}
                                        />
                                        <Select
                                            value={item.valueType}
                                            onValueChange={(value) => updateFormDataItem(item.id, {
                                                valueType: value as "text" | "file",
                                                value: "",
                                                fileName: undefined,
                                                fileType: undefined,
                                                fileContentBase64: undefined,
                                            })}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Text</SelectItem>
                                                <SelectItem value="file">File</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {item.valueType === "file" ? (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    readOnly
                                                    value={item.fileName ?? ""}
                                                    placeholder="No file chosen"
                                                    className="truncate"
                                                />
                                                <label className="inline-flex">
                                                    <input
                                                        type="file"
                                                        className="hidden"
                                                        onChange={(e) => void handleFileSelect(item.id, e.target.files?.[0] ?? null)}
                                                    />
                                                    <Button type="button" variant="outline" size="sm">Choose</Button>
                                                </label>
                                            </div>
                                        ) : (
                                            <Input
                                                placeholder="Value"
                                                value={item.value}
                                                onChange={(e) => updateFormDataItem(item.id, { value: e.target.value })}
                                            />
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteFormDataItem(item.id)}
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            </div>
                            <div className="px-3 py-2 border-t">
                                <Button variant="outline" size="sm" onClick={addFormDataItem}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Field
                                </Button>
                            </div>
                        </div>
                    ) : normalizedBody.type === "x-www-form-urlencoded" ? (
                        <div className="rounded-lg border bg-background flex-1 min-h-0">
                            <div className="overflow-x-auto">
                            <div className="grid grid-cols-[40px_1fr_1fr_44px] gap-2 px-3 py-2 border-b text-xs font-semibold text-muted-foreground min-w-[360px]">
                                <div />
                                <div>Key</div>
                                <div>Value</div>
                                <div />
                            </div>
                            <div className="p-3 space-y-2 flex-1 min-h-0 overflow-auto custom-scrollbar min-w-[360px]">
                                {(normalizedBody.urlEncoded ?? []).map((item) => (
                                    <div key={item.id} className="grid grid-cols-[40px_1fr_1fr_44px] gap-2 items-center">
                                        <div className="flex justify-center">
                                            <Checkbox
                                                checked={item.active}
                                                onCheckedChange={(checked) => updateUrlEncodedItem(item.id, "active", Boolean(checked))}
                                            />
                                        </div>
                                        <Input
                                            placeholder="Key"
                                            value={item.key}
                                            onChange={(e) => updateUrlEncodedItem(item.id, "key", e.target.value)}
                                        />
                                        <Input
                                            placeholder="Value"
                                            value={item.value}
                                            onChange={(e) => updateUrlEncodedItem(item.id, "value", e.target.value)}
                                        />
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteUrlEncodedItem(item.id)}
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            </div>
                            <div className="px-3 py-2 border-t">
                                <Button variant="outline" size="sm" onClick={addUrlEncodedItem}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Field
                                </Button>
                            </div>
                        </div>
                    ) : normalizedBody.type === "graphql" ? (
                        <div className="flex-1 flex flex-col gap-2 min-h-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-xs text-muted-foreground flex-1 min-w-[260px]">
                                    Sent as <code className="font-mono bg-muted/40 px-1 rounded">application/json</code> with{" "}
                                    <code className="font-mono bg-muted/40 px-1 rounded">{"{ query, variables }"}</code>.
                                </p>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleIntrospect}
                                    disabled={!graphqlUrl || introspecting}
                                    title={!graphqlUrl ? "Set the request URL first" : "Fetch __schema via introspection"}
                                >
                                    {introspecting ? "Introspecting…" : "Fetch schema"}
                                </Button>
                            </div>
                            <div className="flex-1 min-h-0 grid grid-rows-[2fr_1fr] gap-2">
                                <div className="border rounded-lg overflow-hidden min-h-0">
                                    <MemoCodeEditor
                                        value={normalizedBody.content}
                                        onChange={handleBodyContentChange}
                                        language="graphql"
                                    />
                                </div>
                                <div className="flex flex-col gap-1 min-h-0">
                                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Variables (JSON)
                                    </Label>
                                    <div className="flex-1 border rounded-lg overflow-hidden min-h-0">
                                        <MemoCodeEditor
                                            value={normalizedBody.graphqlVariables ?? ""}
                                            onChange={(v) => updateBody({ graphqlVariables: v })}
                                            language="json"
                                        />
                                    </div>
                                </div>
                            </div>
                            {graphqlSchema && graphqlSchema.types.length > 0 && (
                                <details className="border rounded-lg p-2 bg-muted/10">
                                    <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Schema · {graphqlSchema.types.length} types
                                        {graphqlSchema.queryType && (
                                            <span className="ml-2 font-mono text-[10px]">query: {graphqlSchema.queryType}</span>
                                        )}
                                        {graphqlSchema.mutationType && (
                                            <span className="ml-2 font-mono text-[10px]">mutation: {graphqlSchema.mutationType}</span>
                                        )}
                                    </summary>
                                    <div className="mt-2 max-h-[200px] overflow-y-auto space-y-2 text-xs font-mono">
                                        {graphqlSchema.types.map((tp) => (
                                            <div key={tp.name} className="border rounded p-2 bg-background">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] uppercase text-muted-foreground">{tp.kind}</span>
                                                    <span className="font-bold">{tp.name}</span>
                                                </div>
                                                {tp.fields && tp.fields.length > 0 && (
                                                    <ul className="pl-3 mt-1 space-y-0.5">
                                                        {tp.fields.map((f) => (
                                                            <li key={f.name}>
                                                                <span>{f.name}</span>
                                                                <span className="text-muted-foreground">: {f.type?.name ?? f.type?.ofType?.name ?? "?"}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/5">
                            <p className="text-sm">{t("noBodyHint")}</p>
                            <Button variant="link" size="sm" onClick={() => updateBody({ type: "json" })}>
                                {t("switchToJson")}
                            </Button>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="auth" className="mt-0 space-y-6 h-full overflow-auto custom-scrollbar">
                    <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-lg border">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("authType")}</Label>
                        <Select
                            value={auth.type}
                            onValueChange={(v) => handleAuthTypeChange(v as RequestAuth["type"])}
                        >
                            <SelectTrigger className="w-[160px] h-8 text-xs">
                                <SelectValue placeholder={t("selectType")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t("noAuth")}</SelectItem>
                                <SelectItem value="bearer">{t("bearerToken")}</SelectItem>
                                <SelectItem value="basic">{t("basicAuth")}</SelectItem>
                                <SelectItem value="api-key">{t("apiKey")}</SelectItem>
                                <SelectItem value="oauth2">OAuth 2.0</SelectItem>
                                <SelectItem value="aws-sigv4">AWS Signature v4</SelectItem>
                                <SelectItem value="hawk">Hawk</SelectItem>
                                <SelectItem value="digest">Digest (pre-emptive)</SelectItem>
                                <SelectItem value="ntlm">NTLM v2</SelectItem>
                                <SelectItem value="jwt-bearer">JWT Bearer</SelectItem>
                                <SelectItem value="spnego">SPNEGO / Kerberos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="bg-card rounded-lg p-1">
                        {auth.type === "bearer" && (
                            <div className="space-y-2 max-w-md animate-in fade-in slide-in-from-top-2 duration-300">
                                <Label>{t("labelToken")}</Label>
                                <Input
                                    type="password"
                                    value={auth.token || ""}
                                    onChange={(e) => setAuth({ ...auth, token: e.target.value })}
                                    placeholder={t("placeholderBearerToken")}
                                    className="h-10"
                                />
                            </div>
                        )}

                        {auth.type === "basic" && (
                            <div className="space-y-4 max-w-md animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-2">
                                    <Label>{t("labelUsername")}</Label>
                                    <Input
                                        value={auth.username || ""}
                                        onChange={(e) => setAuth({ ...auth, username: e.target.value })}
                                        placeholder={t("placeholderUsername")}
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("labelPassword")}</Label>
                                    <Input
                                        type="password"
                                        value={auth.password || ""}
                                        onChange={(e) => setAuth({ ...auth, password: e.target.value })}
                                        placeholder={t("placeholderPassword")}
                                        className="h-10"
                                    />
                                </div>
                            </div>
                        )}
                        {auth.type === "api-key" && (
                            <div className="space-y-4 max-w-md animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-2">
                                    <Label>{t("labelKey")}</Label>
                                    <Input
                                        value={auth.apiKeyKey || ""}
                                        onChange={(e) => setAuth({ ...auth, apiKeyKey: e.target.value })}
                                        placeholder={t("placeholderApiKeyName")}
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("labelValue")}</Label>
                                    <Input
                                        type="password"
                                        value={auth.apiKeyValue || ""}
                                        onChange={(e) => setAuth({ ...auth, apiKeyValue: e.target.value })}
                                        placeholder={t("placeholderValue")}
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t("addTo")}</Label>
                                    <Select
                                        value={auth.apiKeyLocation || "header"}
                                        onValueChange={(v) => setAuth({ ...auth, apiKeyLocation: v as RequestAuth["apiKeyLocation"] })}
                                    >
                                        <SelectTrigger className="w-full h-10">
                                            <SelectValue placeholder={t("addTo")} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="header">{t("header")}</SelectItem>
                                            <SelectItem value="query">{t("queryParams")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                        {auth.type === "oauth2" && (
                            <div className="space-y-4 max-w-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="space-y-2">
                                    <Label>Grant type</Label>
                                    <Select
                                        value={auth.oauth2?.grantType ?? "client_credentials"}
                                        onValueChange={(v) => updateOAuthConfig({ grantType: v as OAuth2GrantType })}
                                    >
                                        <SelectTrigger className="h-10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="client_credentials">Client Credentials</SelectItem>
                                            <SelectItem value="authorization_code">Authorization Code (PKCE)</SelectItem>
                                            <SelectItem value="password" disabled>Password (deprecated)</SelectItem>
                                            <SelectItem value="refresh_token" disabled>Refresh only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {auth.oauth2?.grantType === "authorization_code" && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Authorization URL</Label>
                                            <Input
                                                value={auth.oauth2?.authUrl ?? ""}
                                                onChange={(e) => updateOAuthConfig({ authUrl: e.target.value })}
                                                placeholder="https://auth.example.com/oauth/authorize"
                                                className="h-10 font-mono text-xs"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="flex items-center justify-between gap-2">
                                                <span>Redirect URI (register with provider)</span>
                                                <button
                                                    type="button"
                                                    className="text-xs underline text-muted-foreground hover:text-foreground"
                                                    onClick={() => {
                                                        if (typeof window === "undefined") return
                                                        updateOAuthConfig({ redirectUri: `${window.location.origin}/oauth/callback` })
                                                    }}
                                                >
                                                    Use default
                                                </button>
                                            </Label>
                                            <Input
                                                value={auth.oauth2?.redirectUri ?? ""}
                                                onChange={(e) => updateOAuthConfig({ redirectUri: e.target.value })}
                                                placeholder="https://yourapp.example.com/oauth/callback"
                                                className="h-10 font-mono text-xs"
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="space-y-2">
                                    <Label>Access Token URL</Label>
                                    <Input
                                        value={auth.oauth2?.tokenUrl ?? ""}
                                        onChange={(e) => updateOAuthConfig({ tokenUrl: e.target.value })}
                                        placeholder="https://auth.example.com/oauth/token"
                                        className="h-10 font-mono text-xs"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>Client ID</Label>
                                        <Input
                                            value={auth.oauth2?.clientId ?? ""}
                                            onChange={(e) => updateOAuthConfig({ clientId: e.target.value })}
                                            className="h-10 font-mono text-xs"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Client Secret</Label>
                                        <Input
                                            type="password"
                                            value={auth.oauth2?.clientSecret ?? ""}
                                            onChange={(e) => updateOAuthConfig({ clientSecret: e.target.value })}
                                            className="h-10 font-mono text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label>Scope</Label>
                                        <Input
                                            value={auth.oauth2?.scope ?? ""}
                                            onChange={(e) => updateOAuthConfig({ scope: e.target.value })}
                                            placeholder="read:items write:items"
                                            className="h-10 font-mono text-xs"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Audience (optional)</Label>
                                        <Input
                                            value={auth.oauth2?.audience ?? ""}
                                            onChange={(e) => updateOAuthConfig({ audience: e.target.value })}
                                            placeholder="https://api.example.com"
                                            className="h-10 font-mono text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 pt-2">
                                    <Button
                                        onClick={handleFetchToken}
                                        disabled={
                                            tokenLoading ||
                                            !auth.oauth2?.tokenUrl ||
                                            !auth.oauth2?.clientId ||
                                            (auth.oauth2?.grantType === "authorization_code" &&
                                                (!auth.oauth2.authUrl || !auth.oauth2.redirectUri))
                                        }
                                    >
                                        {tokenLoading ? "Working…" : "Get New Access Token"}
                                    </Button>
                                    {auth.oauth2?.refreshToken && (
                                        <Button variant="outline" onClick={handleRefreshToken} disabled={tokenLoading}>
                                            Refresh
                                        </Button>
                                    )}
                                    {auth.oauth2?.accessToken && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => updateOAuthConfig({ accessToken: undefined, refreshToken: undefined, expiresAt: undefined })}
                                            disabled={tokenLoading}
                                        >
                                            Clear
                                        </Button>
                                    )}
                                </div>
                                {auth.oauth2?.accessToken && (
                                    <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold uppercase tracking-wider text-muted-foreground">Access token</span>
                                            <span className="font-mono break-all">
                                                {auth.oauth2.accessToken.slice(0, 12)}…{auth.oauth2.accessToken.slice(-6)}
                                            </span>
                                        </div>
                                        {auth.oauth2.expiresAt && (
                                            <div className="text-muted-foreground">
                                                Expires {new Date(auth.oauth2.expiresAt).toLocaleString()}
                                                {auth.oauth2.expiresAt < Date.now() && (
                                                    <span className="ml-2 text-rose-500 font-medium">(expired — will auto-refresh on send)</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        {auth.type === "aws-sigv4" && (
                            <div className="space-y-3 max-w-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label>Access Key ID</Label>
                                        <Input
                                            value={auth.awsSigV4?.accessKeyId ?? ""}
                                            onChange={(e) => updateAwsCfg({ accessKeyId: e.target.value })}
                                            className="h-10 font-mono text-xs"
                                            placeholder="AKIA…"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Secret Access Key</Label>
                                        <Input
                                            type="password"
                                            value={auth.awsSigV4?.secretAccessKey ?? ""}
                                            onChange={(e) => updateAwsCfg({ secretAccessKey: e.target.value })}
                                            className="h-10 font-mono text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label>Region</Label>
                                        <Input
                                            value={auth.awsSigV4?.region ?? ""}
                                            onChange={(e) => updateAwsCfg({ region: e.target.value })}
                                            className="h-10 font-mono text-xs"
                                            placeholder="us-east-1"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Service</Label>
                                        <Input
                                            value={auth.awsSigV4?.service ?? ""}
                                            onChange={(e) => updateAwsCfg({ service: e.target.value })}
                                            className="h-10 font-mono text-xs"
                                            placeholder="s3, lambda, execute-api…"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label>Session token (optional)</Label>
                                    <Input
                                        type="password"
                                        value={auth.awsSigV4?.sessionToken ?? ""}
                                        onChange={(e) => updateAwsCfg({ sessionToken: e.target.value })}
                                        className="h-10 font-mono text-xs"
                                        placeholder="STS / IAM Role temporary credentials"
                                    />
                                </div>
                            </div>
                        )}
                        {auth.type === "hawk" && (
                            <div className="space-y-3 max-w-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label>Hawk ID</Label>
                                        <Input
                                            value={auth.hawk?.id ?? ""}
                                            onChange={(e) => updateHawkCfg({ id: e.target.value })}
                                            className="h-10 font-mono text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Key</Label>
                                        <Input
                                            type="password"
                                            value={auth.hawk?.key ?? ""}
                                            onChange={(e) => updateHawkCfg({ key: e.target.value })}
                                            className="h-10 font-mono text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label>Algorithm</Label>
                                        <Select
                                            value={auth.hawk?.algorithm ?? "sha256"}
                                            onValueChange={(v) => updateHawkCfg({ algorithm: v as "sha256" | "sha1" })}
                                        >
                                            <SelectTrigger className="h-10">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="sha256">sha256</SelectItem>
                                                <SelectItem value="sha1">sha1</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Ext</Label>
                                        <Input
                                            value={auth.hawk?.ext ?? ""}
                                            onChange={(e) => updateHawkCfg({ ext: e.target.value })}
                                            className="h-10 font-mono text-xs"
                                        />
                                    </div>
                                </div>
                                <label className="flex items-center gap-2 text-xs">
                                    <input
                                        type="checkbox"
                                        checked={!!auth.hawk?.includePayloadHash}
                                        onChange={(e) => updateHawkCfg({ includePayloadHash: e.target.checked })}
                                    />
                                    Include payload hash
                                </label>
                            </div>
                        )}
                        {auth.type === "digest" && (
                            <div className="space-y-3 max-w-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                <p className="text-[11px] text-muted-foreground">
                                    Pre-emptive only — paste <code className="font-mono bg-muted/40 px-1 rounded">realm</code>,{" "}
                                    <code className="font-mono bg-muted/40 px-1 rounded">nonce</code>,{" "}
                                    <code className="font-mono bg-muted/40 px-1 rounded">qop</code> from a prior 401
                                    challenge instead of doing the handshake.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label>Username</Label>
                                        <Input
                                            value={auth.digest?.username ?? ""}
                                            onChange={(e) => updateDigestCfg({ username: e.target.value })}
                                            className="h-10"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Password</Label>
                                        <Input
                                            type="password"
                                            value={auth.digest?.password ?? ""}
                                            onChange={(e) => updateDigestCfg({ password: e.target.value })}
                                            className="h-10"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label>Realm</Label>
                                        <Input
                                            value={auth.digest?.realm ?? ""}
                                            onChange={(e) => updateDigestCfg({ realm: e.target.value })}
                                            className="h-10 font-mono text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Nonce</Label>
                                        <Input
                                            value={auth.digest?.nonce ?? ""}
                                            onChange={(e) => updateDigestCfg({ nonce: e.target.value })}
                                            className="h-10 font-mono text-xs"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label>QoP</Label>
                                        <Select
                                            value={auth.digest?.qop ?? "auth"}
                                            onValueChange={(v) => updateDigestCfg({ qop: v as "auth" | "auth-int" })}
                                        >
                                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="auth">auth</SelectItem>
                                                <SelectItem value="auth-int">auth-int</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Algorithm</Label>
                                        <Select
                                            value={auth.digest?.algorithm ?? "MD5"}
                                            onValueChange={(v) => updateDigestCfg({ algorithm: v as "MD5" | "SHA-256" })}
                                        >
                                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MD5">MD5</SelectItem>
                                                <SelectItem value="SHA-256">SHA-256</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Opaque (optional)</Label>
                                        <Input
                                            value={auth.digest?.opaque ?? ""}
                                            onChange={(e) => updateDigestCfg({ opaque: e.target.value })}
                                            className="h-10 font-mono text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        {auth.type === "ntlm" && (
                            <div className="space-y-3 max-w-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                <p className="text-[11px] text-muted-foreground">
                                    Three-step NTLMv2 handshake runs server-side on a pinned
                                    keepalive socket. Targets: IIS, SharePoint, Exchange-style endpoints.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label>Username</Label>
                                        <Input
                                            value={auth.ntlm?.username ?? ""}
                                            onChange={(e) => updateNtlmCfg({ username: e.target.value })}
                                            className="h-10"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Password</Label>
                                        <Input
                                            type="password"
                                            value={auth.ntlm?.password ?? ""}
                                            onChange={(e) => updateNtlmCfg({ password: e.target.value })}
                                            className="h-10"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label>Domain (optional)</Label>
                                        <Input
                                            value={auth.ntlm?.domain ?? ""}
                                            onChange={(e) => updateNtlmCfg({ domain: e.target.value })}
                                            className="h-10 font-mono text-xs"
                                            placeholder="CORP"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Workstation (optional)</Label>
                                        <Input
                                            value={auth.ntlm?.workstation ?? ""}
                                            onChange={(e) => updateNtlmCfg({ workstation: e.target.value })}
                                            className="h-10 font-mono text-xs"
                                            placeholder="WORKSTATION"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        {auth.type === "jwt-bearer" && (
                            <div className="space-y-3 max-w-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                <p className="text-[11px] text-muted-foreground">
                                    JWT is signed client-side at send time and attached as{" "}
                                    <code className="font-mono bg-muted/40 px-1 rounded">Authorization: Bearer</code>.
                                </p>
                                <div className="space-y-1">
                                    <Label>Algorithm</Label>
                                    <Select
                                        value={auth.jwtBearer?.algorithm ?? "HS256"}
                                        onValueChange={(v) => updateJwtCfg({ algorithm: v as "HS256" | "HS384" | "HS512" | "RS256" | "ES256" })}
                                    >
                                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HS256">HS256</SelectItem>
                                            <SelectItem value="HS384">HS384</SelectItem>
                                            <SelectItem value="HS512">HS512</SelectItem>
                                            <SelectItem value="RS256">RS256</SelectItem>
                                            <SelectItem value="ES256">ES256</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {(auth.jwtBearer?.algorithm ?? "HS256").startsWith("HS") ? (
                                    <div className="space-y-1">
                                        <Label>HMAC secret</Label>
                                        <Input
                                            type="password"
                                            value={auth.jwtBearer?.secret ?? ""}
                                            onChange={(e) => updateJwtCfg({ secret: e.target.value })}
                                            className="h-10 font-mono text-xs"
                                        />
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <Label>Private key (PKCS#8 PEM)</Label>
                                        <textarea
                                            value={auth.jwtBearer?.privateKeyPem ?? ""}
                                            onChange={(e) => updateJwtCfg({ privateKeyPem: e.target.value })}
                                            placeholder="-----BEGIN PRIVATE KEY-----"
                                            className="w-full min-h-[100px] border rounded p-2 font-mono text-xs"
                                        />
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                        <Label>Issuer (iss)</Label>
                                        <Input value={auth.jwtBearer?.issuer ?? ""} onChange={(e) => updateJwtCfg({ issuer: e.target.value })} className="h-10" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Subject (sub)</Label>
                                        <Input value={auth.jwtBearer?.subject ?? ""} onChange={(e) => updateJwtCfg({ subject: e.target.value })} className="h-10" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Audience (aud)</Label>
                                        <Input value={auth.jwtBearer?.audience ?? ""} onChange={(e) => updateJwtCfg({ audience: e.target.value })} className="h-10" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label>TTL (seconds)</Label>
                                    <Input
                                        type="number"
                                        value={auth.jwtBearer?.ttlSeconds ?? 3600}
                                        onChange={(e) => updateJwtCfg({ ttlSeconds: Math.max(1, Number(e.target.value) || 3600) })}
                                        className="h-10"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label>Extra claims (JSON)</Label>
                                    <textarea
                                        value={auth.jwtBearer?.extraClaimsJson ?? ""}
                                        onChange={(e) => updateJwtCfg({ extraClaimsJson: e.target.value })}
                                        placeholder={`{ "scope": "read:items" }`}
                                        className="w-full min-h-[60px] border rounded p-2 font-mono text-xs"
                                    />
                                </div>
                            </div>
                        )}
                        {auth.type === "spnego" && (
                            <div className="space-y-3 max-w-xl animate-in fade-in slide-in-from-top-2 duration-300">
                                <p className="text-[11px] text-muted-foreground">
                                    Pre-acquired SPNEGO token (base64). Get one via{" "}
                                    <code className="font-mono bg-muted/40 px-1 rounded">kinit</code> + a CLI helper.
                                    Routed through <code className="font-mono bg-muted/40 px-1 rounded">/api/proxy-spnego</code>.
                                </p>
                                <div className="space-y-1">
                                    <Label>Negotiate token (base64)</Label>
                                    <textarea
                                        value={auth.spnego?.token ?? ""}
                                        onChange={(e) => updateSpnegoCfg({ token: e.target.value })}
                                        placeholder="YIIH7gYGKwYBBQUC…"
                                        className="w-full min-h-[100px] border rounded p-2 font-mono text-[10px]"
                                    />
                                </div>
                            </div>
                        )}
                        {auth.type === "none" && (
                            <div className="text-center py-10 text-muted-foreground">
                                <p className="text-sm">{t("noAuthHint")}</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
                <TabsContent value="pre-request" className="mt-0 h-full flex flex-col gap-2 min-h-0">
                    <p className="text-xs text-muted-foreground">
                        Runs in a sandbox before the request. Use{" "}
                        <code className="font-mono bg-muted/40 px-1 rounded">pm.environment.set</code>,{" "}
                        <code className="font-mono bg-muted/40 px-1 rounded">pm.request.headers.add</code>, etc.
                    </p>
                    <div className="flex-1 border rounded-lg overflow-hidden min-h-0">
                        <MemoCodeEditor
                            value={preRequestScript}
                            onChange={(v) => setPreRequestScript?.(v)}
                            language="javascript"
                        />
                    </div>
                </TabsContent>
                <TabsContent value="tests" className="mt-0 h-full flex flex-col gap-2 min-h-0">
                    <p className="text-xs text-muted-foreground">
                        Runs after the response arrives. Use{" "}
                        <code className="font-mono bg-muted/40 px-1 rounded">pm.test(name, fn)</code> with{" "}
                        <code className="font-mono bg-muted/40 px-1 rounded">pm.expect(...).toBe(...)</code>.
                    </p>
                    <div className="flex-1 border rounded-lg overflow-hidden min-h-0">
                        <MemoCodeEditor
                            value={testScript}
                            onChange={(v) => setTestScript?.(v)}
                            language="javascript"
                        />
                    </div>
                </TabsContent>
                {examples && examples.length > 0 && (
                    <TabsContent value="examples" className="mt-0 h-full overflow-auto custom-scrollbar space-y-2">
                        {examples.map((ex) => (
                            <div key={ex.id} className="border rounded-lg p-3 space-y-1 bg-card">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-sm">{ex.name}</span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted/60">
                                        {ex.request.method}
                                    </span>
                                    <span className={
                                        ex.response.status >= 200 && ex.response.status < 300
                                            ? "text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600"
                                            : "text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500"
                                    }>
                                        {ex.response.status}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(ex.capturedAt).toLocaleString()}
                                    </span>
                                    <div className="ml-auto flex gap-1">
                                        {onLoadExample && (
                                            <Button size="sm" variant="ghost" onClick={() => onLoadExample(ex)}>
                                                Load
                                            </Button>
                                        )}
                                        {onDeleteExample && (
                                            <Button size="sm" variant="ghost" onClick={() => onDeleteExample(ex.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="font-mono text-xs text-muted-foreground break-all">
                                    {ex.request.url}
                                </div>
                            </div>
                        ))}
                    </TabsContent>
                )}
                {setComments && (
                    <TabsContent value="comments" className="mt-0 h-full min-h-0">
                        <CommentsPanel comments={comments} onChange={setComments} />
                    </TabsContent>
                )}
            </div>
        </Tabs>
    )
}
