"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, Loader2, X, CheckCircle2, AlertCircle, ArrowUp, ArrowDown, Radio, Square } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ApiRequestState, GrpcWebState } from "./types"
import { useTabsActions } from "./context/tabs-context"
import { parseProto, encodeMessage, decodeMessage, skeletonForType, type ParsedProto, type ProtoMethodEntry } from "@/lib/proto-parser"
import { sendGrpcWeb, sendNativeGrpc, openGrpcStream, type GrpcLiveCall } from "@/lib/grpc-web"
import { loadReflectedSchema } from "@/lib/grpc-reflection"
import { toast } from "sonner"

const CodeEditor = dynamic(() => import("@/components/ui/code-editor"), {
    ssr: false,
    loading: () => <div className="h-full w-full animate-pulse bg-muted/30" />,
})
const MemoCodeEditor = React.memo(CodeEditor)

interface GrpcPanelProps {
    tab: ApiRequestState
    onUpdate: (patch: Partial<ApiRequestState>) => void
}

type TranscriptRow = NonNullable<GrpcWebState["transcript"]>[number]
type GrpcResponse = NonNullable<GrpcWebState["response"]>

const EMPTY_STATE: GrpcWebState = { protoSource: "", requestJson: "{}\n" }
const nowMs = (): number => Date.now()

/** A live call belongs to the tab that opened it; the panel instance is shared across gRPC tabs. */
interface LiveState {
    tabId: string
    connecting: boolean
    halfClosed: boolean
}

export function GrpcPanel({ tab, onUpdate }: GrpcPanelProps) {
    const t = useTranslations("ApiClient.grpc")
    const { updateTab } = useTabsActions()
    const state: GrpcWebState = tab.grpc ?? EMPTY_STATE
    const setState = (patch: Partial<GrpcWebState>) => onUpdate({ grpc: { ...state, ...patch } })

    /** Async results go through the tab's latest state, not this render's
     *  snapshot — two updates after one await would otherwise drop each other. */
    const patchGrpc = React.useCallback(
        (tabId: string, fn: (g: GrpcWebState) => Partial<GrpcWebState>) =>
            updateTab(tabId, (cur) => {
                const g = cur.grpc ?? EMPTY_STATE
                return { grpc: { ...g, ...fn(g) } }
            }),
        [updateTab],
    )
    const appendRows = React.useCallback(
        (tabId: string, rows: TranscriptRow[]) => patchGrpc(tabId, (g) => ({ transcript: [...(g.transcript ?? []), ...rows] })),
        [patchGrpc],
    )

    /** When reflection succeeds we keep the parsed result here instead of round-tripping
     *  through state.protoSource (descriptor info doesn't survive .proto text dump cleanly). */
    const [reflectedParsed, setReflectedParsed] = React.useState<ParsedProto | null>(null)
    const [reflecting, setReflecting] = React.useState(false)

    const parsedFromSource = React.useMemo<ParsedProto | null>(() => {
        if (!state.protoSource.trim()) return null
        try { return parseProto(state.protoSource) } catch { return null }
    }, [state.protoSource])

    const parsed: ParsedProto | null = reflectedParsed ?? parsedFromSource

    const parseError = React.useMemo<string | null>(() => {
        if (!state.protoSource.trim()) return null
        try { parseProto(state.protoSource); return null } catch (e) { return (e as Error).message }
    }, [state.protoSource])

    const methods = React.useMemo<ProtoMethodEntry[]>(
        () => parsed?.services.flatMap((s) => s.methods) ?? [],
        [parsed],
    )

    const selectedMethod = React.useMemo<ProtoMethodEntry | undefined>(
        () => methods.find((m) => m.path === state.selectedPath),
        [methods, state.selectedPath],
    )

    // Auto-fill request JSON with a skeleton when the user picks a method and
    // the editor is still empty / on the default placeholder.
    React.useEffect(() => {
        if (!parsed || !selectedMethod) return
        const current = (state.requestJson ?? "").trim()
        if (current && current !== "{}" && current !== "{}\n") return
        try {
            const sk = skeletonForType(parsed.root, selectedMethod.requestTypeName)
            setState({ requestJson: JSON.stringify(sk, null, 2) + "\n" })
        } catch { /* skeleton building best-effort */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parsed, selectedMethod?.path])

    const [isLoading, setIsLoading] = React.useState(false)
    const abortRef = React.useRef<AbortController | null>(null)
    const [live, setLive] = React.useState<LiveState | null>(null)
    const liveCallRef = React.useRef<GrpcLiveCall | null>(null)

    React.useEffect(() => () => {
        abortRef.current?.abort()
        liveCallRef.current?.cancel()
    }, [])

    const extraHeaders = () => tab.headers
        .filter((h) => h.active && h.key)
        .reduce<Record<string, string>>((acc, h) => { acc[h.key] = h.value; return acc }, {})

    /** Shared preconditions for Invoke and Connect. */
    const target = (): { parsed: ParsedProto; method: ProtoMethodEntry; url: string } | null => {
        if (!tab.url.trim()) { toast.error(t("needUrl")); return null }
        if (!parsed || !selectedMethod) { toast.error(t("needMethod")); return null }
        return { parsed, method: selectedMethod, url: `${tab.url.replace(/\/$/, "")}/${selectedMethod.path}` }
    }

    const encodeEditor = (p: ParsedProto, m: ProtoMethodEntry): Uint8Array | null => {
        let json: unknown
        try { json = JSON.parse(state.requestJson || "{}") } catch (e) {
            toast.error(t("invalidJson", { error: (e as Error).message }))
            return null
        }
        try { return encodeMessage(p.root, m.requestTypeName, json) } catch (e) {
            toast.error(t("encodeFailed", { error: (e as Error).message }))
            return null
        }
    }

    const decodeToJson = (p: ParsedProto, m: ProtoMethodEntry, bytes: Uint8Array): string => {
        try {
            return JSON.stringify(decodeMessage(p.root, m.responseTypeName, bytes), null, 2)
        } catch (e) {
            return `// ${t("decodeFailed", { error: (e as Error).message })}`
        }
    }

    const handleSend = async () => {
        const tgt = target()
        if (!tgt) return
        const payload = encodeEditor(tgt.parsed, tgt.method)
        if (!payload) return

        // Build the client-streaming payload list when the user has staged extra messages.
        let multi: Uint8Array[] | undefined
        if (state.extraRequestMessages && state.extraRequestMessages.length > 0) {
            multi = [payload]
            try {
                for (const raw of state.extraRequestMessages) {
                    const extraJson = JSON.parse(raw || "{}")
                    multi.push(encodeMessage(tgt.parsed.root, tgt.method.requestTypeName, extraJson))
                }
            } catch (e) {
                toast.error(t("extraEncodeFailed", { error: (e as Error).message }))
                return
            }
            if (state.transport !== "native") {
                toast.error(t("needNative"))
                return
            }
        }

        const tabId = tab.id
        abortRef.current?.abort()
        abortRef.current = new AbortController()
        setIsLoading(true)
        const start = nowMs()
        try {
            const result = state.transport === "native"
                ? await sendNativeGrpc({
                    url: tgt.url,
                    message: multi ? undefined : payload,
                    messages: multi,
                    signal: abortRef.current.signal,
                    extraHeaders: extraHeaders(),
                })
                : await sendGrpcWeb({
                    url: tgt.url,
                    message: payload,
                    format: state.useTextFormat ? "text" : "binary",
                    signal: abortRef.current.signal,
                    extraHeaders: extraHeaders(),
                })
            const elapsed = nowMs() - start

            // Capture sent + received messages into the transcript.
            const sentRows: TranscriptRow[] = (multi ?? [payload]).map((bytes, idx) => ({
                id: crypto.randomUUID(),
                direction: "sent",
                timestamp: start + idx,
                json: idx === 0 ? state.requestJson : (state.extraRequestMessages?.[idx - 1] ?? "{}"),
                sizeBytes: bytes.length,
            }))
            const decoded = result.messages.map((bytes) => decodeToJson(tgt.parsed, tgt.method, bytes))
            const receivedRows: TranscriptRow[] = result.messages.map((bytes, idx) => ({
                id: crypto.randomUUID(),
                direction: "received",
                timestamp: start + elapsed + idx,
                json: decoded[idx],
                sizeBytes: bytes.length,
            }))
            // Server-streaming: each frame is its own JSON block, numbered when there are several.
            const total = decoded.length
            const messageJson = decoded
                .map((json, idx) => (total > 1 ? `// ${t("messageOf", { index: idx + 1, total })}\n` : "") + json)
                .join("\n\n")
            patchGrpc(tabId, (g) => ({
                transcript: [...(g.transcript ?? []), ...sentRows, ...receivedRows],
                response: {
                    status: result.status,
                    grpcStatus: result.grpcStatus,
                    grpcMessage: result.grpcMessage,
                    time: elapsed,
                    size: result.messages.reduce((s, m) => s + m.length, 0),
                    messageJson,
                    headers: result.headers,
                    trailers: result.trailers,
                },
            }))
        } catch (e) {
            if ((e as Error).name === "AbortError") return
            toast.error(t("callFailed", { error: (e as Error).message }))
            patchGrpc(tabId, () => ({
                response: { status: 0, time: nowMs() - start, size: 0, messageJson: `// ${(e as Error).message}`, headers: {}, trailers: {} },
            }))
        } finally {
            setIsLoading(false)
            abortRef.current = null
        }
    }

    const handleCancel = () => abortRef.current?.abort()

    // ── Live call: messages go out one at a time while server messages stream back.
    const handleConnect = async () => {
        if (state.transport !== "native") { toast.error(t("liveNeedsNative")); return }
        const tgt = target()
        if (!tgt) return
        const tabId = tab.id
        const start = nowMs()
        const blocks: string[] = []
        let size = 0
        let finished = false
        const finish = (response: GrpcResponse) => {
            finished = true
            liveCallRef.current = null
            setLive(null)
            patchGrpc(tabId, () => ({ response }))
        }
        setLive({ tabId, connecting: true, halfClosed: false })
        try {
            const call = await openGrpcStream({
                url: tgt.url,
                extraHeaders: extraHeaders(),
                onMessage: (bytes) => {
                    const json = decodeToJson(tgt.parsed, tgt.method, bytes)
                    blocks.push(json)
                    size += bytes.length
                    appendRows(tabId, [{ id: crypto.randomUUID(), direction: "received", timestamp: nowMs(), json, sizeBytes: bytes.length }])
                },
                onEnd: (end) => {
                    if (end.cancelled) toast(t("liveCancelled"))
                    finish({
                        status: end.status ?? 0,
                        grpcStatus: end.grpcStatus,
                        grpcMessage: end.grpcMessage,
                        time: nowMs() - start,
                        size,
                        messageJson: blocks.join("\n\n"),
                        headers: end.headers,
                        trailers: end.trailers,
                    })
                },
                onError: (message) => {
                    toast.error(t("callFailed", { error: message }))
                    finish({ status: 0, time: nowMs() - start, size, messageJson: `// ${message}`, headers: {}, trailers: {} })
                },
            })
            if (finished) return
            liveCallRef.current = call
            setLive({ tabId, connecting: false, halfClosed: false })
        } catch (e) {
            toast.error(t("callFailed", { error: e instanceof Error ? e.message : String(e) }))
            setLive(null)
        }
    }

    const handleLiveSend = async () => {
        const call = liveCallRef.current
        if (!call || !live || !parsed || !selectedMethod) return
        const payload = encodeEditor(parsed, selectedMethod)
        if (!payload) return
        const json = state.requestJson
        try {
            await call.send(payload)
            appendRows(live.tabId, [{ id: crypto.randomUUID(), direction: "sent", timestamp: nowMs(), json, sizeBytes: payload.length }])
        } catch (e) {
            toast.error(t("callFailed", { error: e instanceof Error ? e.message : String(e) }))
        }
    }

    const handleLiveEnd = async () => {
        const call = liveCallRef.current
        if (!call) return
        try {
            await call.end()
            setLive((l) => l && { ...l, halfClosed: true })
        } catch (e) {
            toast.error(t("callFailed", { error: e instanceof Error ? e.message : String(e) }))
        }
    }

    const liveHere = live?.tabId === tab.id
    const busy = isLoading || !!live
    const canStream = !!selectedMethod?.clientStreaming

    const r = state.response
    const grpcOk = r && r.grpcStatus === 0
    const grpcErr = r && r.grpcStatus !== undefined && r.grpcStatus !== 0
    const staged = state.extraRequestMessages ?? []

    return (
        <div className="flex flex-col h-full min-h-0 gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <Input
                    placeholder={t("urlPlaceholder")}
                    value={tab.url}
                    onChange={(e) => onUpdate({ url: e.target.value })}
                    disabled={liveHere}
                    className="font-mono text-[13px] flex-1 min-w-[260px]"
                />
                <Select
                    value={state.selectedPath ?? ""}
                    onValueChange={(v) => setState({ selectedPath: v })}
                    disabled={methods.length === 0 || liveHere}
                >
                    <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder={methods.length === 0 ? t("methodPlaceholderEmpty") : t("methodPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                        {methods.map((m) => (
                            <SelectItem key={m.path} value={m.path} className="font-mono">{m.path}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {liveHere ? (
                    <>
                        <Button onClick={handleLiveSend} disabled={live.connecting || live.halfClosed}>
                            {live.connecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                            {t("send")}
                        </Button>
                        <Button variant="outline" onClick={handleLiveEnd} disabled={live.connecting || live.halfClosed} title={t("endStreamTitle")}>
                            <Square className="h-4 w-4 mr-2" /> {t("endStream")}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => liveCallRef.current?.cancel()}
                            disabled={live.connecting}
                            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                            <X className="h-4 w-4 mr-2" /> {t("cancel")}
                        </Button>
                    </>
                ) : !isLoading ? (
                    <>
                        <Button onClick={handleSend} disabled={busy || !tab.url || !selectedMethod}>
                            <Send className="h-4 w-4 mr-2" /> {t("invoke")}
                        </Button>
                        {canStream && (
                            <Button variant="outline" onClick={handleConnect} disabled={busy || !tab.url} title={t("connectTitle")}>
                                <Radio className="h-4 w-4 mr-2" /> {t("connect")}
                            </Button>
                        )}
                    </>
                ) : (
                    <Button onClick={handleCancel} variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                        <X className="h-4 w-4 mr-2" /> {t("cancel")}
                    </Button>
                )}
                <Button
                    variant="outline"
                    onClick={async () => {
                        if (!tab.url.trim()) { toast.error(t("needUrl")); return }
                        setReflecting(true)
                        try {
                            const result = await loadReflectedSchema({ serverUrl: tab.url, extraHeaders: extraHeaders() })
                            setReflectedParsed(result)
                            setState({ selectedPath: result.services[0]?.methods[0]?.path })
                            toast.success(t("reflected", { count: result.services.length }))
                        } catch (e) {
                            toast.error((e as Error).message)
                        } finally {
                            setReflecting(false)
                        }
                    }}
                    disabled={reflecting || !tab.url || liveHere}
                    title={t("reflectTitle")}
                >
                    {reflecting ? t("reflecting") : t("reflect")}
                </Button>
                <Select
                    value={state.transport ?? "web"}
                    onValueChange={(v) => setState({ transport: v as "web" | "native" })}
                    disabled={liveHere}
                >
                    <SelectTrigger className="w-[200px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="web">{t("transportWeb")}</SelectItem>
                        <SelectItem value="native">{t("transportNative")}</SelectItem>
                    </SelectContent>
                </Select>
                {state.transport !== "native" && (
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                            type="checkbox"
                            checked={!!state.useTextFormat}
                            onChange={(e) => setState({ useTextFormat: e.target.checked })}
                        />
                        {t("textFormat")}
                    </label>
                )}
                {liveHere && !live.connecting && (
                    <span className="inline-flex h-6 items-center gap-1.5 px-2.5 rounded-full text-xs font-medium bg-primary/[0.12] text-primary">
                        <Radio className="h-3.5 w-3.5" /> {live.halfClosed ? t("liveHalfClosed") : t("liveOpen")}
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
                <div className="flex flex-col gap-2 min-h-0">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t("protoSchema")}
                    </Label>
                    <div className="flex-1 border border-border rounded-lg overflow-hidden min-h-0">
                        <MemoCodeEditor
                            value={state.protoSource}
                            onChange={(v) => setState({ protoSource: v })}
                            language="protobuf"
                        />
                    </div>
                    {parseError && (
                        <div className="text-[11px] text-destructive font-mono">{parseError}</div>
                    )}
                </div>

                <div className="flex flex-col gap-2 min-h-0">
                    <Label className="text-xs font-medium text-muted-foreground">
                        {t("requestMessage")}
                        {selectedMethod && (
                            <span className="ml-2 text-muted-foreground font-mono">
                                {selectedMethod.requestTypeName}
                            </span>
                        )}
                    </Label>
                    <div className="flex-1 border border-border rounded-lg overflow-hidden min-h-0">
                        <MemoCodeEditor
                            value={state.requestJson}
                            onChange={(v) => setState({ requestJson: v })}
                            language="json"
                        />
                    </div>

                    {r && (
                        <div className="border border-border rounded-lg bg-card p-3 space-y-2 max-h-[40%] overflow-auto">
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                                <span className={cn(
                                    "inline-flex h-6 items-center gap-1.5 px-2.5 rounded-full font-semibold tabular-nums",
                                    grpcOk ? "bg-success/[0.12] text-success"
                                        : grpcErr ? "bg-destructive/[0.12] text-destructive"
                                        : "bg-foreground/[0.06] text-foreground",
                                )}>
                                    {grpcOk && <CheckCircle2 className="h-3.5 w-3.5" />}
                                    {grpcErr && <AlertCircle className="h-3.5 w-3.5" />}
                                    HTTP {r.status} / gRPC {r.grpcStatus ?? "—"}
                                </span>
                                <span className="text-muted-foreground tabular-nums">{r.time}ms · {r.size}B</span>
                                {r.grpcMessage && (
                                    <span className="text-muted-foreground font-mono break-all">{r.grpcMessage}</span>
                                )}
                            </div>
                            <Label className="text-xs font-medium text-muted-foreground">
                                {t("responseMessage")}
                                {selectedMethod && (
                                    <span className="ml-2 font-mono">{selectedMethod.responseTypeName}</span>
                                )}
                            </Label>
                            <pre className="font-mono text-xs whitespace-pre-wrap break-all bg-muted/40 border border-border rounded-md p-2 max-h-[200px] overflow-auto">
                                {r.messageJson || t("empty")}
                            </pre>
                            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        </div>
                    )}

                    {/* Staged messages: sent together by Invoke (client-streaming, native transport). */}
                    {canStream && !liveHere && (
                        <div className="border border-border rounded-lg bg-card p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    {t("staged", { count: staged.length + 1 })}
                                </Label>
                                <div className="flex gap-1">
                                    <Button size="sm" variant="ghost" onClick={() => setState({ extraRequestMessages: [...staged, "{}"] })}>
                                        {t("addMessage")}
                                    </Button>
                                    {staged.length > 0 && (
                                        <Button size="sm" variant="ghost" onClick={() => setState({ extraRequestMessages: staged.slice(0, -1) })}>
                                            {t("removeLast")}
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {staged.map((msg, idx) => (
                                <div key={idx} className="flex gap-2 items-start">
                                    <span className="text-[10px] text-muted-foreground font-mono pt-2">#{idx + 2}</span>
                                    <textarea
                                        aria-label={t("stagedMessage", { index: idx + 2 })}
                                        className="flex-1 min-h-[60px] rounded-md border border-input bg-card px-3 py-2 text-xs font-mono outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/25"
                                        value={msg}
                                        onChange={(e) => {
                                            const next = [...staged]
                                            next[idx] = e.target.value
                                            setState({ extraRequestMessages: next })
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {state.transcript && state.transcript.length > 0 && (
                        <div className="border border-border rounded-lg bg-card p-3 space-y-2 max-h-[260px] overflow-auto">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-medium text-muted-foreground">
                                    {t("transcript", { count: state.transcript.length })}
                                </Label>
                                <Button size="sm" variant="ghost" onClick={() => setState({ transcript: [] })}>{t("clear")}</Button>
                            </div>
                            <div className="space-y-1" aria-live={liveHere ? "polite" : undefined}>
                                {state.transcript.slice().reverse().map((row) => (
                                    <div key={row.id} className="border border-border rounded-md p-2 text-[11px] font-mono bg-muted/40">
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1 font-sans">
                                            <span className={cn("inline-flex items-center gap-1", row.direction === "sent" ? "text-primary" : "text-success")}>
                                                {row.direction === "sent" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                                                {row.direction === "sent" ? t("sent") : t("received")}
                                            </span>
                                            <span className="tabular-nums">{new Date(row.timestamp).toLocaleTimeString()}</span>
                                            <span className="tabular-nums">{row.sizeBytes}B</span>
                                        </div>
                                        <pre className="whitespace-pre-wrap break-all">{row.json}</pre>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
