"use client"

import * as React from "react"
import { Send, Loader2, X, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { RequestMethod, Collection } from "./types"
import { SaveRequestDialog } from "./collections/save-request-dialog"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface RequestPanelProps {
    method: RequestMethod
    setMethod: (method: RequestMethod) => void
    url: string
    setUrl: (url: string) => void
    onSend: () => void
    onCancel?: () => void
    isLoading: boolean
    collections: Collection[]
    onSave: (parentId: string, name: string) => void
    saveDefaultName?: string
    onPaste: (text: string) => void
    activeEnvironmentVariables: Record<string, string>
    urlHistory?: string[]
}

const METHODS: RequestMethod[] = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]

const getMethodColor = (method: string) => {
    switch (method) {
        case "GET": return "text-sky-500"
        case "POST": return "text-emerald-500"
        case "PUT": return "text-amber-500"
        case "DELETE": return "text-rose-500"
        case "PATCH": return "text-yellow-500"
        default: return "text-muted-foreground"
    }
}

const getMethodBg = (method: string) => {
    switch (method) {
        case "GET": return "bg-sky-500/10 border-sky-500/20"
        case "POST": return "bg-emerald-500/10 border-emerald-500/20"
        case "PUT": return "bg-amber-500/10 border-amber-500/20"
        case "DELETE": return "bg-rose-500/10 border-rose-500/20"
        case "PATCH": return "bg-yellow-500/10 border-yellow-500/20"
        default: return "bg-muted/50 border-border"
    }
}

function RequestPanelImpl({
    method,
    setMethod,
    url,
    setUrl,
    onSend,
    onCancel,
    isLoading,
    collections,
    onSave,
    saveDefaultName,
    onPaste,
    activeEnvironmentVariables,
    urlHistory = [],
}: RequestPanelProps) {
    const t = useTranslations("ApiClient.requestPanel")
    const urlInputRef = React.useRef<HTMLInputElement | null>(null)
    const [showSuggestions, setShowSuggestions] = React.useState(false)
    const [hoveredVariable, setHoveredVariable] = React.useState<{
        key: string
        value?: string
        status: "resolved" | "missing"
        left: number
    } | null>(null)

    const urlSuggestions = React.useMemo(() => {
        if (!url.trim() || urlHistory.length === 0) return []
        const lower = url.toLowerCase()
        return urlHistory.filter((h) => h.toLowerCase().includes(lower) && h !== url).slice(0, 8)
    }, [url, urlHistory])

    const variableTokens = React.useMemo(() => {
        const tokens: Array<{ key: string; start: number; end: number; value?: string; status: "resolved" | "missing" }> = []
        const regex = /\{\{(.+?)\}\}/g
        let match: RegExpExecArray | null

        while ((match = regex.exec(url)) !== null) {
            const fullToken = match[0]
            const key = match[1].trim()
            const value = activeEnvironmentVariables[key]
            tokens.push({
                key,
                start: match.index,
                end: match.index + fullToken.length,
                value,
                status: value !== undefined ? "resolved" : "missing",
            })
        }

        return tokens
    }, [url, activeEnvironmentVariables])

    const updateHoveredVariable = React.useCallback((clientX: number) => {
        const input = urlInputRef.current
        if (!input || variableTokens.length === 0) {
            setHoveredVariable(null)
            return
        }

        const rect = input.getBoundingClientRect()
        const leftPadding = 36
        const font = getComputedStyle(input).font || "12px monospace"
        const canvas = document.createElement("canvas")
        const context = canvas.getContext("2d")
        if (!context) {
            setHoveredVariable(null)
            return
        }
        context.font = font
        const charWidth = context.measureText("0").width || 7.2

        const index = Math.floor((clientX - rect.left - leftPadding + input.scrollLeft) / charWidth)
        const token = variableTokens.find((item) => index >= item.start && index < item.end)

        if (!token) {
            setHoveredVariable(null)
            return
        }

        setHoveredVariable({
            key: token.key,
            value: token.value,
            status: token.status,
            left: leftPadding + token.start * charWidth - input.scrollLeft,
        })
    }, [variableTokens])

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
                <Select value={method} onValueChange={(v) => setMethod(v as RequestMethod)}>
                    <SelectTrigger className={cn(
                        "w-[110px] h-10 font-black tracking-tight transition-all border shrink-0",
                        getMethodBg(method),
                        getMethodColor(method)
                    )}>
                        <SelectValue placeholder={t("methodPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                        {METHODS.map((m) => (
                            <SelectItem key={m} value={m} className={cn("font-bold", getMethodColor(m))}>
                                {m}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="relative flex-1 min-w-0 group">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                    {hoveredVariable && (
                        <TooltipProvider>
                            <Tooltip open>
                                <TooltipTrigger asChild>
                                    <span
                                        className="absolute top-1/2 -translate-y-1/2 h-4 w-px pointer-events-none z-10"
                                        style={{ left: `${hoveredVariable.left}px` }}
                                    />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs break-all">
                                    {hoveredVariable.status === "resolved"
                                        ? `${hoveredVariable.key}: ${hoveredVariable.value}`
                                        : `${hoveredVariable.key}: (not found in active environment)`}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                    <Input
                        ref={urlInputRef}
                        placeholder={t("urlPlaceholder")}
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="h-10 pl-9 pr-10 font-mono text-xs bg-muted/30 border-muted group-hover:border-border transition-colors"
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && url) {
                                setShowSuggestions(false)
                                onSend()
                            }
                            if (e.key === "Escape") setShowSuggestions(false)
                        }}
                        onPaste={(e) => {
                            const text = e.clipboardData.getData("text")
                            if (text.trim().startsWith("curl ")) {
                                e.preventDefault()
                                onPaste(text)
                            }
                        }}
                        onMouseMove={(e) => updateHoveredVariable(e.clientX)}
                        onMouseLeave={() => setHoveredVariable(null)}
                    />
                    {url && (
                        <button
                            onClick={() => setUrl("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors z-10"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                    {showSuggestions && urlSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg overflow-hidden">
                            {urlSuggestions.map((suggestion) => (
                                <button
                                    key={suggestion}
                                    className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-muted/60 transition-colors truncate text-foreground"
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        setUrl(suggestion)
                                        setShowSuggestions(false)
                                    }}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {isLoading && onCancel ? (
                    <Button
                        onClick={onCancel}
                        variant="outline"
                        className="h-10 px-4 font-bold border-rose-500/50 text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
                    >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                ) : (
                <Button
                    onClick={onSend}
                    disabled={isLoading || !url}
                    className="h-10 px-6 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Send className="h-4 w-4 mr-2" />
                    )}
                    {isLoading ? t("sending") : t("send")}
                </Button>
                )}

                <div className="border-l pl-2 flex items-center ml-1">
                    <SaveRequestDialog
                        collections={collections}
                        onSave={onSave}
                        defaultName={saveDefaultName}
                    />
                </div>
            </div>
        </div>
    )
}

export const RequestPanel = React.memo(RequestPanelImpl)
