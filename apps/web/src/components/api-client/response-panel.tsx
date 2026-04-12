"use client"

import * as React from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import CodeEditor from "@/components/ui/code-editor"
import { ApiResponse, API_CLIENT_ERROR_STATUS_TEXT } from "./types"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, AlertCircle, Copy, Download, Search, Info, Clock, Database } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function normalizeContentType(headers: Record<string, string>): string {
    const raw =
        Object.entries(headers).find(([k]) => k.toLowerCase() === "content-type")?.[1] || ""
    return raw.split(";")[0].trim().toLowerCase()
}

/** When servers omit or mislabel Content-Type, still offer an HTML preview for obvious documents. */
function bodyLooksLikeHtml(body: string): boolean {
    if (!body || body.length < 3) return false
    const s = body.trimStart()
    if (s.startsWith("<?xml")) return false
    if (/^\s*[{[]/.test(s)) return false
    const head = s.slice(0, 400)
    if (/^\s*<!doctype\s+html\b/i.test(head)) return true
    if (/^\s*<\s*html\b/i.test(head)) return true
    if (/^\s*<\s*(head|body)\b/i.test(head)) return true
    return false
}

interface ResponsePanelProps {
    response: ApiResponse | null
}

export function ResponsePanel({ response }: ResponsePanelProps) {
    const t = useTranslations("ApiClient.responsePanel")
    const tApi = useTranslations("ApiClient")
    if (!response) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl min-h-0 bg-muted/5 p-8 text-center space-y-4">
                <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center">
                    <Search className="h-6 w-6 text-muted-foreground/50" />
                </div>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-foreground">{t("emptyTitle")}</p>
                    <p className="text-xs max-w-[200px]">{t("emptyHint")}</p>
                </div>
            </div>
        )
    }

    const isSuccess = response.status >= 200 && response.status < 300
    const isError = response.status >= 400

    const contentType = normalizeContentType(response.headers)
    const isHtmlByHeader =
        contentType.includes("text/html") ||
        contentType.includes("application/xhtml") ||
        contentType === "application/xhtml+xml"
    const isHtmlByBody = !response.isBase64 && bodyLooksLikeHtml(response.body)
    const isHtmlResponse = isHtmlByHeader || isHtmlByBody

    const getLanguage = () => {
        if (contentType.includes("json")) return "json"
        if (contentType.includes("html") || isHtmlByBody) return "html"
        if (contentType.includes("xml")) return "xml"
        return "text"
    }

    const handleCopy = () => {
        if (!response?.body) return
        navigator.clipboard.writeText(response.body)
        toast.success(tApi("toasts.responseCopied"))
    }

    const handleDownload = () => {
        if (!response?.body) return
        const blob = new Blob([response.body], {
            type: contentType || (isHtmlResponse ? "text/html" : "text/plain"),
        })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `response-${Date.now()}.${getLanguage()}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const renderPreview = () => {
        if (response.isBase64) {
            if (contentType.includes("image/")) {
                return (
                    <div className="flex items-center justify-center p-8 bg-muted/20 absolute inset-0 overflow-auto">
                        <img src={`data:${contentType};base64,${response.body}`} alt={t("responsePreviewAlt")} className="max-w-full shadow-sm border" />
                    </div>
                )
            }
            if (contentType.includes("application/pdf")) {
                return (
                    <iframe src={`data:application/pdf;base64,${response.body}`} className="w-full h-full border-0 absolute inset-0" />
                )
            }
        } else if (isHtmlResponse) {
            return (
                <iframe
                    title="HTML response preview"
                    srcDoc={response.body}
                    className="w-full h-full min-h-[320px] border-0 absolute inset-0 bg-white dark:bg-background"
                    sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                />
            )
        }

        return (
            <div className="flex items-center justify-center p-8 absolute inset-0 text-muted-foreground">
                {t("previewUnavailable")}
            </div>
        )
    }

    const hasPreview = response.isBase64 || isHtmlResponse
    const defaultTab =
        (isHtmlResponse && !response.isBase64) ||
        (response.isBase64 &&
            (contentType.includes("image/") || contentType.includes("application/pdf")))
            ? "preview"
            : "body"

    return (
        <div className="flex flex-col h-full space-y-4 min-h-0">
            <Tabs
                key={`${response.status}-${response.time}-${response.size}-${response.body?.length ?? 0}`}
                defaultValue={defaultTab}
                className="flex-1 flex flex-col min-h-0"
            >
                <div
                    className={cn(
                        "flex flex-wrap items-center justify-between gap-3 p-2 border rounded-xl bg-card shrink-0",
                        isSuccess ? "border-emerald-500/20 bg-emerald-500/[0.02]" : isError ? "border-rose-500/20 bg-rose-500/[0.02]" : ""
                    )}
                >
                    <TabsList className="h-9 p-1 bg-muted/50 border rounded-lg">
                        <TabsTrigger value="body" className="px-4">{t("bodyTab")}</TabsTrigger>
                        {hasPreview && <TabsTrigger value="preview" className="px-4">{t("previewTab")}</TabsTrigger>}
                        <TabsTrigger value="headers" className="px-4">{t("headersTab")}</TabsTrigger>
                    </TabsList>
                    <div className="ml-auto flex items-center flex-wrap justify-end gap-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-background/80">
                            {isSuccess ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            ) : isError ? (
                                <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                            ) : (
                                <Info className="h-3.5 w-3.5 text-blue-500" />
                            )}
                            <span className={cn(
                                "text-xs font-bold",
                                isSuccess ? "text-emerald-600" : isError ? "text-rose-600" : "text-foreground"
                            )}>
                                {response.status}
                            </span>
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                                {response.statusText === API_CLIENT_ERROR_STATUS_TEXT
                                    ? t("errorStatusLabel")
                                    : response.statusText}
                            </span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-background/80">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground/70" />
                            <span className="text-xs font-mono font-semibold">{response.time}ms</span>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border bg-background/80">
                            <Database className="h-3.5 w-3.5 text-muted-foreground/70" />
                            <span className="text-xs font-mono font-semibold">{(response.size / 1024).toFixed(2)} KB</span>
                        </div>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={handleCopy} title={t("copyBody")}>
                            <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 rounded-lg" onClick={handleDownload} title={t("downloadResponse")}>
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="mt-4 border rounded-xl overflow-hidden flex-1 min-h-0 relative shadow-inner bg-card">
                    <TabsContent value="body" className="mt-0 h-full absolute inset-0">
                        <CodeEditor
                            value={response.isBase64 ? t("binaryRawView") : response.body}
                            language={getLanguage()}
                            readOnly
                        />
                    </TabsContent>
                    {hasPreview && (
                        <TabsContent value="preview" className="mt-0 h-full absolute inset-0">
                            {renderPreview()}
                        </TabsContent>
                    )}
                    <TabsContent value="headers" className="mt-0 h-full absolute inset-0">
                        <ScrollArea className="h-full">
                            <div className="p-4 space-y-2">
                                <div className="grid grid-cols-[auto,1fr] gap-x-6 gap-y-3">
                                    {Object.entries(response.headers).map(([key, value]) => (
                                        <React.Fragment key={key}>
                                            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 py-1">{key}</div>
                                            <div className="text-xs font-mono break-all bg-muted/30 px-2 py-1 rounded border border-border/40 select-all">{value}</div>
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    )
}
