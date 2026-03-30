"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { KeyValueEditor } from "./key-value-editor"
import { KeyValueItem, RequestBody, RequestAuth } from "./types"
import CodeEditor from "@/components/ui/code-editor"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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

    return (
        <Tabs defaultValue="params" className="w-full">
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
                    {body.type !== "none" && (
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
            <div className="mt-4 border rounded-xl p-6 bg-card shadow-inner min-h-[350px]">
                <TabsContent value="params" className="mt-0">
                    <KeyValueEditor items={params} onChange={setParams} />
                </TabsContent>
                <TabsContent value="headers" className="mt-0">
                    <KeyValueEditor items={headers} onChange={setHeaders} />
                </TabsContent>
                <TabsContent value="body" className="mt-0 h-[300px] flex flex-col gap-4">
                    <div className="flex items-center gap-4 bg-muted/30 p-3 rounded-lg border">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("bodyType")}</Label>
                        <Select
                            value={body.type}
                            onValueChange={(v) => setBody({ ...body, type: v as any })}
                        >
                            <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue placeholder={t("selectType")} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">{t("bodyNone")}</SelectItem>
                                <SelectItem value="json">{t("bodyJson")}</SelectItem>
                                <SelectItem value="text">{t("bodyText")}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {body.type !== "none" ? (
                        <div className="flex-1 border rounded-lg overflow-hidden shadow-sm">
                            <CodeEditor
                                value={body.content}
                                onChange={(v) => setBody({ ...body, content: v })}
                                language={body.type === "json" ? "json" : "plaintext"}
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg bg-muted/5">
                            <p className="text-sm">{t("noBodyHint")}</p>
                            <Button variant="link" size="sm" onClick={() => setBody({ ...body, type: "json" })}>
                                {t("switchToJson")}
                            </Button>
                        </div>
                    )}
                </TabsContent>
                <TabsContent value="auth" className="mt-0 space-y-6">
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
