"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KeyValueEditor } from "./key-value-editor"
import { KeyValueItem, RequestBody, RequestAuth, RequestFormDataItem } from "./types"
import dynamic from "next/dynamic"

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
}: RequestTabsProps) {
    const t = useTranslations("ApiClient.requestTabs")
    const activeParamsCount = params.filter(p => p.active && (p.key || p.value)).length
    const activeHeadersCount = headers.filter(h => h.active && (h.key || h.value)).length
    const normalizedBody = React.useMemo<RequestBody>(() => ({
        ...body,
        formData: body.formData ?? [{ id: crypto.randomUUID(), key: "", value: "", active: true, valueType: "text" }],
        urlEncoded: body.urlEncoded ?? [{ id: crypto.randomUUID(), key: "", value: "", active: true }],
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

    const handleFileSelect = async (id: string, file: File | null) => {
        if (!file) return
        const buffer = await file.arrayBuffer()
        const bytes = new Uint8Array(buffer)
        let binary = ""
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i])
        }
        const base64 = btoa(binary)
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
                    {body.type === "json" && (() => {
                        try { JSON.parse(body.content || "{}"); return <div className="h-1.5 w-1.5 rounded-full bg-primary" /> } catch { return <div className="h-1.5 w-1.5 rounded-full bg-rose-500" title="Invalid JSON" /> }
                    })()}
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
                            </SelectContent>
                        </Select>
                    </div>
                    {normalizedBody.type === "json" || normalizedBody.type === "text" ? (
                        <div className="flex-1 flex flex-col gap-2 min-h-0">
                            {normalizedBody.type === "json" && (() => {
                                if (!normalizedBody.content) return null
                                try { JSON.parse(normalizedBody.content); return null }
                                catch (e) { return <div className="text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-1.5 font-mono shrink-0">{(e as Error).message}</div> }
                            })()}
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
                            onValueChange={(v) => setAuth({ ...auth, type: v as any })}
                        >
                            <SelectTrigger className="w-[160px] h-8 text-xs">
                                <SelectValue placeholder={t("selectType")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t("noAuth")}</SelectItem>
                                <SelectItem value="bearer">{t("bearerToken")}</SelectItem>
                                <SelectItem value="basic">{t("basicAuth")}</SelectItem>
                                <SelectItem value="api-key">{t("apiKey")}</SelectItem>
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
                                        onValueChange={(v) => setAuth({ ...auth, apiKeyLocation: v as any })}
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
                        {auth.type === "none" && (
                            <div className="text-center py-10 text-muted-foreground">
                                <p className="text-sm">{t("noAuthHint")}</p>
                            </div>
                        )}
                    </div>
                </TabsContent>
            </div>
        </Tabs>
    )
}
