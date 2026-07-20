"use client"

import * as React from "react"
import { Send, Loader2, X, Globe, Terminal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { RequestMethod } from "./types"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useEnvironmentsState } from "./context/environments-context"
import { useDebouncedValue } from "@/lib/use-debounced-value"

interface RequestPanelProps {
    method: RequestMethod
    setMethod: (method: RequestMethod) => void
    url: string
    setUrl: (url: string) => void
    onSend: () => void
    onCancel?: () => void
    isLoading: boolean
    /** When true, the Send button is disabled and an SR hint is shown. */
    isBodyInvalid?: boolean
    onPaste: (text: string) => void
    /** Copies the current request as a cURL command; button hidden when absent. */
    onCopyCurl?: () => void
    urlHistory?: string[]
    /** Pass activeTab.id so local URL state resets on tab switch. */
    tabId?: string
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
    isBodyInvalid = false,
    onPaste,
    onCopyCurl,
    urlHistory = [],
    tabId,
}: RequestPanelProps) {
    const { activeEnvironmentVariables } = useEnvironmentsState()
    const t = useTranslations("ApiClient.requestPanel")
    const urlInputRef = React.useRef<HTMLInputElement | null>(null)
    const [showSuggestions, setShowSuggestions] = React.useState(false)
    /** -1 = no suggestion focused (Enter sends); 0..n-1 = highlighted row (Enter selects). */
    const [highlightedSuggestion, setHighlightedSuggestion] = React.useState(-1)
    /** Set briefly by a suggestion's mousedown so the input's blur handler doesn't
     *  close the panel before the click finishes. Replaces a flaky setTimeout(150). */
    const suppressBlurRef = React.useRef(false)

    // Local URL state: the input is bound here for instant feedback.
    // We sync back to the global state (setUrl) after 400ms of idle typing,
    // and reset local state ONLY on genuine external changes (tab switch or
    // cURL import) — not on our own debounce writes, to avoid clobbering
    // keystrokes typed between the flush and the prop update.
    const [localUrl, setLocalUrl] = React.useState(url)
    const lastPushedRef = React.useRef(url)
    // Reset on external url changes only (not our own writes).
    React.useEffect(() => {
        if (url !== lastPushedRef.current) {
            setLocalUrl(url)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tabId, url])
    const debouncedLocalUrl = useDebouncedValue(localUrl, 400)
    React.useEffect(() => {
        if (debouncedLocalUrl !== url) {
            lastPushedRef.current = debouncedLocalUrl
            setUrl(debouncedLocalUrl)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedLocalUrl])
    const [hoveredVariable, setHoveredVariable] = React.useState<{
        key: string
        value?: string
        status: "resolved" | "missing"
        left: number
    } | null>(null)

    const urlSuggestions = React.useMemo(() => {
        if (!localUrl.trim() || urlHistory.length === 0) return []
        const lower = localUrl.toLowerCase()
        return urlHistory.filter((h) => h.toLowerCase().includes(lower) && h !== localUrl).slice(0, 8)
    }, [localUrl, urlHistory])

    // Reset highlight whenever the candidate list changes or panel hides.
    React.useEffect(() => {
        setHighlightedSuggestion(-1)
    }, [urlSuggestions, showSuggestions])

    const variableTokens = React.useMemo(() => {
        const tokens: Array<{ key: string; start: number; end: number; value?: string; status: "resolved" | "missing" }> = []
        const regex = /\{\{(.+?)\}\}/g
        let match: RegExpExecArray | null

        while ((match = regex.exec(localUrl)) !== null) {
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
    }, [localUrl, activeEnvironmentVariables])

    /** Mirror span used to measure on-screen width of arbitrary URL prefixes — far more reliable
     *  than the previous canvas char-width × index math, which drifted on non-monospace fallbacks
     *  and ligatured fonts. The mirror inherits the input's font and is hidden but in-flow so
     *  layout/font shorthand resolves to a real value before measurement. */
    const measureRef = React.useRef<HTMLSpanElement | null>(null)

    const measureWidth = React.useCallback((text: string): number => {
        const input = urlInputRef.current
        const mirror = measureRef.current
        if (!input || !mirror) return 0
        const cs = getComputedStyle(input)
        mirror.style.fontFamily = cs.fontFamily
        mirror.style.fontSize = cs.fontSize
        mirror.style.fontWeight = cs.fontWeight
        mirror.style.fontStyle = cs.fontStyle
        mirror.style.letterSpacing = cs.letterSpacing
        mirror.textContent = text
        return mirror.getBoundingClientRect().width
    }, [])

    const updateHoveredVariable = React.useCallback((clientX: number) => {
        const input = urlInputRef.current
        if (!input || variableTokens.length === 0) {
            setHoveredVariable(null)
            return
        }

        const rect = input.getBoundingClientRect()
        const leftPadding = 36
        const xWithinText = clientX - rect.left - leftPadding + input.scrollLeft

        // Walk tokens, measuring width of the prefix up to each token's start/end.
        let hit: { token: typeof variableTokens[number]; startX: number } | null = null
        for (const token of variableTokens) {
            const startX = measureWidth(localUrl.slice(0, token.start))
            const endX = measureWidth(localUrl.slice(0, token.end))
            if (xWithinText >= startX && xWithinText < endX) {
                hit = { token, startX }
                break
            }
        }

        if (!hit) {
            setHoveredVariable(null)
            return
        }

        setHoveredVariable({
            key: hit.token.key,
            value: hit.token.value,
            status: hit.token.status,
            left: leftPadding + hit.startX - input.scrollLeft,
        })
    }, [variableTokens, localUrl, measureWidth])

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
                    {/* Off-screen text mirror for variable-hover width measurement (B7). */}
                    <span
                        ref={measureRef}
                        aria-hidden
                        className="font-mono text-xs"
                        style={{
                            position: "absolute",
                            top: 0,
                            left: -9999,
                            whiteSpace: "pre",
                            visibility: "hidden",
                            pointerEvents: "none",
                        }}
                    />
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
                        value={localUrl}
                        onChange={(e) => setLocalUrl(e.target.value)}
                        className="h-10 pl-9 pr-10 font-mono text-xs bg-muted/30 border-muted group-hover:border-border transition-colors"
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => {
                            if (suppressBlurRef.current) {
                                suppressBlurRef.current = false
                                return
                            }
                            setShowSuggestions(false)
                        }}
                        onKeyDown={(e) => {
                            const open = showSuggestions && urlSuggestions.length > 0
                            if (open && e.key === "ArrowDown") {
                                e.preventDefault()
                                setHighlightedSuggestion((i) => (i + 1) % urlSuggestions.length)
                                return
                            }
                            if (open && e.key === "ArrowUp") {
                                e.preventDefault()
                                setHighlightedSuggestion((i) =>
                                    i <= 0 ? urlSuggestions.length - 1 : i - 1,
                                )
                                return
                            }
                            if (e.key === "Enter" && localUrl) {
                                if (open && highlightedSuggestion >= 0) {
                                    e.preventDefault()
                                    setLocalUrl(urlSuggestions[highlightedSuggestion])
                                    setShowSuggestions(false)
                                    return
                                }
                                setShowSuggestions(false)
                                onSend()
                            }
                            if (e.key === "Escape") setShowSuggestions(false)
                        }}
                        onPaste={(e) => {
                            const text = e.clipboardData.getData("text")
                            // Match `curl`, `curl.exe`, leading whitespace, or a trailing
                            // newline — anything else pastes as a normal URL. `\b` stops
                            // false positives like "curly".
                            if (/^\s*curl\b/i.test(text)) {
                                e.preventDefault()
                                onPaste(text)
                            }
                        }}
                        onMouseMove={(e) => updateHoveredVariable(e.clientX)}
                        onMouseLeave={() => setHoveredVariable(null)}
                    />
                    {localUrl && (
                        <button
                            onClick={() => setLocalUrl("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors z-10"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                    {showSuggestions && urlSuggestions.length > 0 && (
                        <div
                            role="listbox"
                            // Catch pointer-down on the whole list (not just buttons) so blur
                            // is suppressed even on touchstart → focus shift on mobile.
                            onMouseDown={() => { suppressBlurRef.current = true }}
                            onTouchStart={() => { suppressBlurRef.current = true }}
                            className="absolute top-full left-0 right-0 mt-1 z-50 bg-popover border rounded-lg shadow-lg overflow-hidden"
                        >
                            {urlSuggestions.map((suggestion, idx) => (
                                <button
                                    role="option"
                                    aria-selected={idx === highlightedSuggestion}
                                    key={suggestion}
                                    className={cn(
                                        "w-full text-left px-3 py-2 text-xs font-mono transition-colors truncate text-foreground",
                                        idx === highlightedSuggestion ? "bg-muted/80" : "hover:bg-muted/60",
                                    )}
                                    onMouseEnter={() => setHighlightedSuggestion(idx)}
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        setLocalUrl(suggestion)
                                        setShowSuggestions(false)
                                    }}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {onCopyCurl && (
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={onCopyCurl}
                        disabled={!localUrl}
                        title={t("copyCurl")}
                        aria-label={t("copyCurl")}
                    >
                        <Terminal className="h-4 w-4" />
                    </Button>
                )}

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
                <>
                <Button
                    onClick={onSend}
                    disabled={isLoading || !localUrl || isBodyInvalid}
                    aria-describedby={isBodyInvalid ? "send-invalid-help" : undefined}
                    className="h-10 px-6 font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                        <Send className="h-4 w-4 mr-2" />
                    )}
                    {isLoading ? t("sending") : t("send")}
                </Button>
                {isBodyInvalid && (
                    <span id="send-invalid-help" className="sr-only">
                        {t("invalidJsonBodyHelp")}
                    </span>
                )}
                </>
                )}

            </div>
        </div>
    )
}

export const RequestPanel = React.memo(RequestPanelImpl)
