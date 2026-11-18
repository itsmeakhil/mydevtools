"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KeyValueEditor } from "./key-value-editor"
import { KeyValueItem, RequestBody, RequestAuth, RequestFormDataItem, GraphQLIntrospectionType, RequestSettings } from "./types"
import { useJsonBodyValidation } from "./use-json-validation"
import { CommentsPanel } from "./comments-panel"
import { AuthEditor } from "./auth-editor"
import { InheritedHeadersList } from "./inherited-headers-list"
import type { InheritedHeader } from "@/lib/folder-inheritance"

const NO_INHERITED: InheritedHeader[] = []
import { RequestSettingsPanel, hasCustomSettings } from "./request-settings-panel"
import { RequestAssertionsPanel, countAssertions } from "./request-assertions-panel"
import { DocsEditor } from "./docs-editor"
import type { Assertion } from "@/lib/api-client/assertions"
import { fetchGraphQLSchema } from "@/lib/graphql-introspect"
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
import { useTranslations } from "next-intl"

interface RequestTabsProps {
    params: KeyValueItem[]
    setParams: (params: KeyValueItem[]) => void
    headers: KeyValueItem[]
    setHeaders: (headers: KeyValueItem[]) => void
    /** Collection/folder default headers this request inherits (live). */
    inheritedHeaders?: InheritedHeader[]
    omitHeaders?: string[]
    setOmitHeaders?: (keys: string[] | undefined) => void
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
    /** Timeout / redirects / TLS / cookie jar — the Settings tab. */
    settings?: RequestSettings
    setSettings?: (patch: RequestSettings) => void
    /** Declarative `res.*` checks — the Assertions tab. */
    assertions?: Assertion[]
    setAssertions?: (next: Assertion[]) => void
    /** Markdown docs — the Docs tab. */
    description?: string
    setDescription?: (next: string) => void
}

/**
 * File → base64 without the data-URL prefix. readAsDataURL streams chunked
 * base64 instead of building a multi-MB Latin-1 string; the old synchronous
 * `btoa(String.fromCharCode(...bytes))` blew the call stack on files > ~1MB.
 */
function readFileBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = String(reader.result ?? "")
            const comma = result.indexOf(",")
            resolve(comma >= 0 ? result.slice(comma + 1) : "")
        }
        reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"))
        reader.readAsDataURL(file)
    })
}

function RequestTabsImpl({
    params,
    setParams,
    headers,
    setHeaders,
    inheritedHeaders = NO_INHERITED,
    omitHeaders,
    setOmitHeaders,
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
    settings,
    setSettings,
    assertions,
    setAssertions,
    description,
    setDescription,
}: RequestTabsProps) {
    const tAssert = useTranslations("ApiClient.assertions")
    const tDocs = useTranslations("ApiClient.docs")
    const assertionCount = countAssertions(assertions)
    const t = useTranslations("ApiClient.requestTabs")
    const tBody = useTranslations("ApiClient.requestBody")
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

    const updateBody = React.useCallback((updates: Partial<RequestBody>) => {
        setBody({ ...normalizedBody, ...updates })
    }, [normalizedBody, setBody])

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
        [updateBody]
    )
    const handleGraphqlVariablesChange = React.useCallback(
        (v: string) => updateBody({ graphqlVariables: v }),
        [updateBody]
    )

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

    const handleFileSelect = async (id: string, file: File | null) => {
        if (!file) return
        const base64 = await readFileBase64(file)
        updateFormDataItem(id, {
            fileName: file.name,
            fileType: file.type || "application/octet-stream",
            fileContentBase64: base64,
            value: file.name,
        })
    }

    const binaryInputRef = React.useRef<HTMLInputElement | null>(null)
    const handleBinarySelect = async (file: File | null) => {
        if (!file) return
        const base64 = await readFileBase64(file)
        updateBody({ binaryFile: { fileName: file.name, fileType: file.type || "application/octet-stream", fileContentBase64: base64 } })
    }

    return (
        <Tabs defaultValue="params" className="w-full h-full flex flex-col min-h-0">
            <TabsList className="self-start max-w-full justify-start overflow-x-auto no-scrollbar shrink-0 [&>*]:shrink-0">
                <TabsTrigger value="params" className="flex items-center gap-1.5">
                    {t("params")}
                    {activeParamsCount > 0 && (
                        <Badge variant="secondary" className="h-4 min-w-[16px] justify-center rounded-full px-1 text-[10px] tabular-nums bg-primary/[0.12] text-primary border-transparent">
                            {activeParamsCount}
                        </Badge>
                    )}
                </TabsTrigger>
                <TabsTrigger value="headers" className="flex items-center gap-1.5">
                    {t("headers")}
                    {activeHeadersCount > 0 && (
                        <Badge variant="secondary" className="h-4 min-w-[16px] justify-center rounded-full px-1 text-[10px] tabular-nums bg-primary/[0.12] text-primary border-transparent">
                            {activeHeadersCount}
                        </Badge>
                    )}
                </TabsTrigger>
                <TabsTrigger value="body" className="flex items-center gap-1.5">
                    {t("body")}
                    {body.type === "json" && (
                        jsonValidation.valid
                            ? <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                            : <div className="h-1.5 w-1.5 rounded-full bg-destructive" title="Invalid JSON" />
                    )}
                    {body.type !== "none" && body.type !== "json" && (
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                </TabsTrigger>
                <TabsTrigger value="auth" className="flex items-center gap-1.5">
                    {t("auth")}
                    {auth.type !== "none" && (
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                </TabsTrigger>
                <TabsTrigger value="pre-request" className="flex items-center gap-1.5">
                    Pre-request
                    {preRequestScript.trim() && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </TabsTrigger>
                <TabsTrigger value="tests" className="flex items-center gap-1.5">
                    Tests
                    {testScript.trim() && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </TabsTrigger>
                {setAssertions && (
                    <TabsTrigger value="assertions" className="flex items-center gap-1.5">
                        {tAssert("tab")}
                        {assertionCount > 0 && (
                            <Badge variant="secondary" className="h-4 min-w-[16px] justify-center rounded-full px-1 text-[10px] tabular-nums bg-primary/[0.12] text-primary border-transparent">
                                {assertionCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                )}
                {settings && setSettings && (
                    <TabsTrigger value="settings" className="flex items-center gap-1.5">
                        {t("settings")}
                        {hasCustomSettings(settings) && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </TabsTrigger>
                )}
                {setDescription && (
                    <TabsTrigger value="docs" className="flex items-center gap-1.5">
                        {tDocs("tab")}
                        {description?.trim() && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </TabsTrigger>
                )}
                {examples && examples.length > 0 && (
                    <TabsTrigger value="examples" className="flex items-center gap-1.5">
                        Examples
                        <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-medium tabular-nums bg-primary/[0.12] text-primary">{examples.length}</span>
                    </TabsTrigger>
                )}
                {setComments && (
                    <TabsTrigger value="comments" className="flex items-center gap-1.5">
                        Comments
                        {comments && comments.length > 0 && (
                            <span className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-medium tabular-nums bg-primary/[0.12] text-primary">{comments.length}</span>
                        )}
                    </TabsTrigger>
                )}
            </TabsList>
            <div className="mt-3 rounded-xl border border-border bg-card p-4 flex-1 min-h-0 overflow-hidden">
                <TabsContent value="params" className="mt-0 h-full overflow-auto custom-scrollbar">
                    <KeyValueEditor items={params} onChange={setParams} />
                </TabsContent>
                <TabsContent value="headers" className="mt-0 h-full overflow-auto custom-scrollbar space-y-4">
                    <KeyValueEditor items={headers} onChange={setHeaders} />
                    {inheritedHeaders.length > 0 && setOmitHeaders && (
                        <InheritedHeadersList headers={inheritedHeaders} omitHeaders={omitHeaders} setOmitHeaders={setOmitHeaders} />
                    )}
                </TabsContent>
                {/* Editor tabs stay mounted (forceMount) so switching sub-tabs doesn't
                    re-create a Monaco instance each time; `hidden` via data-state. */}
                <TabsContent value="body" forceMount className="mt-0 h-full flex flex-col gap-3 min-h-0 data-[state=inactive]:hidden">
                    <div className="flex items-center gap-3">
                        <Label className="text-[13px] font-normal text-muted-foreground shrink-0">{t("bodyType")}</Label>
                        <Select
                            value={normalizedBody.type}
                            onValueChange={(v) => updateBody({ type: v as RequestBody["type"] })}
                        >
                            <SelectTrigger className="w-full sm:w-[220px] h-8 text-[13px]">
                                <SelectValue placeholder={t("selectType")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t("bodyNone")}</SelectItem>
                                <SelectItem value="json">{t("bodyJson")}</SelectItem>
                                <SelectItem value="text">{t("bodyText")}</SelectItem>
                                <SelectItem value="xml">{tBody("xml")}</SelectItem>
                                <SelectItem value="form-data">Form Data (multipart/form-data)</SelectItem>
                                <SelectItem value="x-www-form-urlencoded">x-www-form-urlencoded</SelectItem>
                                <SelectItem value="graphql">GraphQL</SelectItem>
                                <SelectItem value="binary">{tBody("binary")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {normalizedBody.type === "binary" ? (
                        <div className="space-y-2 max-w-xl">
                            <div className="flex items-center gap-2">
                                <Input
                                    readOnly
                                    aria-label={tBody("binary")}
                                    value={normalizedBody.binaryFile?.fileName ?? ""}
                                    placeholder={tBody("noFile")}
                                    className="truncate"
                                />
                                <input
                                    ref={binaryInputRef}
                                    type="file"
                                    className="hidden"
                                    onChange={(e) => {
                                        void handleBinarySelect(e.target.files?.[0] ?? null)
                                        e.target.value = ""
                                    }}
                                />
                                <Button type="button" variant="outline" size="sm" onClick={() => binaryInputRef.current?.click()}>
                                    {tBody("chooseFile")}
                                </Button>
                            </div>
                            {normalizedBody.binaryFile && !normalizedBody.binaryFile.fileContentBase64 ? (
                                <p className="text-xs text-warning">{tBody("binaryMissing")}</p>
                            ) : (
                                <p className="text-xs text-muted-foreground">{tBody("binaryHint")}</p>
                            )}
                        </div>
                    ) : normalizedBody.type === "json" || normalizedBody.type === "text" || normalizedBody.type === "xml" ? (
                        <div className="flex-1 flex flex-col gap-2 min-h-0">
                            {normalizedBody.type === "json" && jsonValidation.error && (
                                <div className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-1.5 font-mono shrink-0">
                                    {jsonValidation.error}
                                </div>
                            )}
                            <div className="flex-1 border border-border rounded-lg overflow-hidden min-h-0">
                                <MemoCodeEditor
                                    value={normalizedBody.content}
                                    onChange={handleBodyContentChange}
                                    language={normalizedBody.type === "text" ? "plaintext" : normalizedBody.type}
                                />
                            </div>
                        </div>
                    ) : normalizedBody.type === "form-data" ? (
                        <div className="rounded-lg border border-border bg-card overflow-hidden flex-1 min-h-0">
                            <div className="overflow-x-auto">
                            <div className="grid grid-cols-[40px_1fr_160px_1fr_44px] gap-2 px-3 py-2 border-b border-border bg-muted/50 text-[12px] font-medium text-muted-foreground min-w-[480px]">
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
                            <div className="px-3 py-2 border-t border-border">
                                <Button variant="outline" size="sm" onClick={addFormDataItem}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Field
                                </Button>
                            </div>
                        </div>
                    ) : normalizedBody.type === "x-www-form-urlencoded" ? (
                        <div className="rounded-lg border border-border bg-card overflow-hidden flex-1 min-h-0">
                            <div className="overflow-x-auto">
                            <div className="grid grid-cols-[40px_1fr_1fr_44px] gap-2 px-3 py-2 border-b border-border bg-muted/50 text-[12px] font-medium text-muted-foreground min-w-[360px]">
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
                            <div className="px-3 py-2 border-t border-border">
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
                                    Sent as <code className="font-mono text-[0.95em] bg-foreground/[0.06] px-1 rounded-[4px]">application/json</code> with{" "}
                                    <code className="font-mono text-[0.95em] bg-foreground/[0.06] px-1 rounded-[4px]">{"{ query, variables }"}</code>.
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
                                <div className="border border-border rounded-lg overflow-hidden min-h-0">
                                    <MemoCodeEditor
                                        value={normalizedBody.content}
                                        onChange={handleBodyContentChange}
                                        language="graphql"
                                    />
                                </div>
                                <div className="flex flex-col gap-1 min-h-0">
                                    <Label className="text-[11px] font-medium text-muted-foreground">
                                        Variables (JSON)
                                    </Label>
                                    <div className="flex-1 border border-border rounded-lg overflow-hidden min-h-0">
                                        <MemoCodeEditor
                                            value={normalizedBody.graphqlVariables ?? ""}
                                            onChange={handleGraphqlVariablesChange}
                                            language="json"
                                        />
                                    </div>
                                </div>
                            </div>
                            {graphqlSchema && graphqlSchema.types.length > 0 && (
                                <details className="border border-border rounded-lg p-2 bg-muted/40">
                                    <summary className="text-xs font-medium text-muted-foreground">
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
                                            <div key={tp.name} className="border border-border rounded-md p-2 bg-card">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] uppercase text-muted-foreground">{tp.kind}</span>
                                                    <span className="font-semibold">{tp.name}</span>
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
                        <div className="flex-1 flex flex-col items-center justify-center gap-1 text-muted-foreground">
                            <p className="text-[13px]">{t("noBodyHint")}</p>
                            <Button variant="link" size="sm" onClick={() => updateBody({ type: "json" })}>
                                {t("switchToJson")}
                            </Button>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="auth" className="mt-0 space-y-5 h-full overflow-auto custom-scrollbar">
                    <AuthEditor auth={auth} setAuth={setAuth} allowInherit />
                </TabsContent>
                <TabsContent value="pre-request" forceMount className="mt-0 h-full flex flex-col gap-2 min-h-0 data-[state=inactive]:hidden">
                    <p className="text-xs text-muted-foreground">
                        Runs in a sandbox before the request. Use{" "}
                        <code className="font-mono text-[0.95em] bg-foreground/[0.06] px-1 rounded-[4px]">pm.environment.set</code>,{" "}
                        <code className="font-mono text-[0.95em] bg-foreground/[0.06] px-1 rounded-[4px]">pm.request.headers.add</code>, etc.
                    </p>
                    <div className="flex-1 border border-border rounded-lg overflow-hidden min-h-0">
                        <MemoCodeEditor
                            value={preRequestScript}
                            onChange={setPreRequestScript}
                            language="javascript"
                        />
                    </div>
                </TabsContent>
                <TabsContent value="tests" forceMount className="mt-0 h-full flex flex-col gap-2 min-h-0 data-[state=inactive]:hidden">
                    <p className="text-xs text-muted-foreground">
                        Runs after the response arrives. Use{" "}
                        <code className="font-mono text-[0.95em] bg-foreground/[0.06] px-1 rounded-[4px]">pm.test(name, fn)</code> with{" "}
                        <code className="font-mono text-[0.95em] bg-foreground/[0.06] px-1 rounded-[4px]">pm.expect(...).toBe(...)</code>.
                    </p>
                    <div className="flex-1 border border-border rounded-lg overflow-hidden min-h-0">
                        <MemoCodeEditor
                            value={testScript}
                            onChange={setTestScript}
                            language="javascript"
                        />
                    </div>
                </TabsContent>
                {setAssertions && (
                    <TabsContent value="assertions" className="mt-0 h-full overflow-auto custom-scrollbar">
                        <RequestAssertionsPanel assertions={assertions} onChange={setAssertions} />
                    </TabsContent>
                )}
                {settings && setSettings && (
                    <TabsContent value="settings" className="mt-0 h-full overflow-auto custom-scrollbar">
                        <RequestSettingsPanel settings={settings} onChange={setSettings} />
                    </TabsContent>
                )}
                {setDescription && (
                    <TabsContent value="docs" className="mt-0 h-full overflow-auto custom-scrollbar">
                        <DocsEditor value={description} onChange={setDescription} />
                    </TabsContent>
                )}
                {examples && examples.length > 0 && (
                    <TabsContent value="examples" className="mt-0 h-full overflow-auto custom-scrollbar space-y-2">
                        {examples.map((ex) => (
                            <div key={ex.id} className="border border-border rounded-lg p-3 space-y-1 bg-card">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-[13px]">{ex.name}</span>
                                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-foreground/[0.06] text-muted-foreground">
                                        {ex.request.method}
                                    </span>
                                    <span className={
                                        ex.response.status >= 200 && ex.response.status < 300
                                            ? "text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-success/[0.12] text-success"
                                            : "text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full bg-destructive/[0.12] text-destructive"
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

export const RequestTabs = React.memo(RequestTabsImpl)
