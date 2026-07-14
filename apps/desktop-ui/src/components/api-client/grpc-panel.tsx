"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ApiRequestState, GrpcWebState } from "./types"
import { parseProto, encodeMessage, decodeMessage, skeletonForType, type ParsedProto, type ProtoMethodEntry } from "@/lib/proto-parser"
import { sendGrpcWeb, sendNativeGrpc } from "@/lib/grpc-web"
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

const nowMs = (): number => Date.now()

export function GrpcPanel({ tab, onUpdate }: GrpcPanelProps) {
    const state: GrpcWebState = tab.grpc ?? { protoSource: "", requestJson: "{}\n" }
    const setState = (patch: Partial<GrpcWebState>) => onUpdate({ grpc: { ...state, ...patch } })

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

    React.useEffect(() => () => abortRef.current?.abort(), [])

    const handleSend = async () => {
        if (!tab.url.trim()) { toast.error("Set the server URL first"); return }
        if (!parsed || !selectedMethod) { toast.error("Pick a service method"); return }
        let json: unknown
        try { json = JSON.parse(state.requestJson || "{}") } catch (e) {
            toast.error(`Request JSON invalid: ${(e as Error).message}`)
            return
        }

        let payload: Uint8Array
        try { payload = encodeMessage(parsed.root, selectedMethod.requestTypeName, json) } catch (e) {
            toast.error(`Encode failed: ${(e as Error).message}`)
            return
        }

        // Build the client-streaming payload list when the user has staged extra messages.
        let multi: Uint8Array[] | undefined
        if (state.extraRequestMessages && state.extraRequestMessages.length > 0) {
            multi = [payload]
            try {
                for (const raw of state.extraRequestMessages) {
                    const extraJson = JSON.parse(raw || "{}")
                    multi.push(encodeMessage(parsed.root, selectedMethod.requestTypeName, extraJson))
                }
            } catch (e) {
                toast.error(`Extra message encode failed: ${(e as Error).message}`)
                return
            }
        }

        const targetUrl = `${tab.url.replace(/\/$/, "")}/${selectedMethod.path}`
        abortRef.current?.abort()
        abortRef.current = new AbortController()
        setIsLoading(true)
        const start = nowMs()
        const extraHeaders = tab.headers
            .filter((h) => h.active && h.key)
            .reduce<Record<string, string>>((acc, h) => { acc[h.key] = h.value; return acc }, {})
        try {
            if (multi && state.transport !== "native") {
                toast.error("Client-streaming requires the native (HTTP/2) transport")
                setIsLoading(false)
                return
            }
            const result = state.transport === "native"
                ? await sendNativeGrpc({
                    url: targetUrl,
                    message: multi ? undefined : payload,
                    messages: multi,
                    signal: abortRef.current.signal,
                    extraHeaders,
                })
                : await sendGrpcWeb({
                    url: targetUrl,
                    message: payload,
                    format: state.useTextFormat ? "text" : "binary",
                    signal: abortRef.current.signal,
                    extraHeaders,
                })
            const elapsed = nowMs() - start

            // Capture sent + received messages into the live transcript.
            const sentRows = (multi ?? [payload]).map((bytes, idx) => ({
                id: crypto.randomUUID(),
                direction: "sent" as const,
                timestamp: start + idx,
                json: idx === 0 ? state.requestJson : (state.extraRequestMessages?.[idx - 1] ?? "{}"),
                sizeBytes: bytes.length,
            }))
            const receivedRows = result.messages.map((bytes, idx) => {
                let json = ""
                try {
                    json = JSON.stringify(decodeMessage(parsed.root, selectedMethod.responseTypeName, bytes), null, 2)
                } catch (e) {
                    json = `// Decode failed: ${(e as Error).message}`
                }
                return {
                    id: crypto.randomUUID(),
                    direction: "received" as const,
                    timestamp: start + elapsed + idx,
                    json,
                    sizeBytes: bytes.length,
                }
            })
            setState({ transcript: [...(state.transcript ?? []), ...sentRows, ...receivedRows] })

            let messageJson = ""
            if (result.messages.length > 0) {
                // Server-streaming: render each frame as its own JSON block so the
                // panel stays useful for both unary and streaming methods.
                const blocks: string[] = []
                result.messages.forEach((bytes, idx) => {
                    try {
                        const decoded = decodeMessage(parsed.root, selectedMethod.responseTypeName, bytes)
                        const prefix = result.messages.length > 1 ? `// message ${idx + 1} of ${result.messages.length}\n` : ""
                        blocks.push(prefix + JSON.stringify(decoded, null, 2))
                    } catch (e) {
                        blocks.push(`// Decode failed at frame ${idx + 1}: ${(e as Error).message}\n// Raw frame ${bytes.length} bytes`)
                    }
                })
                messageJson = blocks.join("\n\n")
            }
            setState({
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
            })
        } catch (e) {
            if ((e as Error).name === "AbortError") return
            toast.error(`gRPC call failed: ${(e as Error).message}`)
            setState({
                response: {
                    status: 0,
                    time: nowMs() - start,
                    size: 0,
                    messageJson: `// ${(e as Error).message}`,
                    headers: {},
                    trailers: {},
                },
            })
        } finally {
            setIsLoading(false)
            abortRef.current = null
        }
    }

    const handleCancel = () => abortRef.current?.abort()

    const r = state.response
    const grpcOk = r && r.grpcStatus === 0
    const grpcErr = r && r.grpcStatus !== undefined && r.grpcStatus !== 0

    return (
        <div className="flex flex-col h-full min-h-0 gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <Input
                    placeholder="https://grpc.example.com (no trailing path)"
                    value={tab.url}
                    onChange={(e) => onUpdate({ url: e.target.value })}
                    className="font-mono text-xs h-10 flex-1 min-w-[260px]"
                />
                <Select
                    value={state.selectedPath ?? ""}
                    onValueChange={(v) => setState({ selectedPath: v })}
                    disabled={methods.length === 0}
                >
                    <SelectTrigger className="h-10 w-[280px]">
                        <SelectValue placeholder={methods.length === 0 ? "Paste .proto to pick a method" : "service / method"} />
                    </SelectTrigger>
                    <SelectContent>
                        {methods.map((m) => (
                            <SelectItem key={m.path} value={m.path}>{m.path}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {!isLoading ? (
                    <Button onClick={handleSend} disabled={isLoading || !tab.url || !selectedMethod} className="h-10">
                        <Send className="h-4 w-4 mr-2" /> Invoke
                    </Button>
                ) : (
                    <Button onClick={handleCancel} variant="outline" className="h-10 border-rose-500/40 text-rose-500 hover:bg-rose-500/10">
                        <X className="h-4 w-4 mr-2" /> Cancel
                    </Button>
                )}
                <Button
                    variant="outline"
                    onClick={async () => {
                        if (!tab.url.trim()) { toast.error("Set the server URL first"); return }
                        setReflecting(true)
                        try {
                            const result = await loadReflectedSchema({
                                serverUrl: tab.url,
                                extraHeaders: tab.headers
                                    .filter((h) => h.active && h.key)
                                    .reduce<Record<string, string>>((acc, h) => { acc[h.key] = h.value; return acc }, {}),
                            })
                            setReflectedParsed(result)
                            setState({ selectedPath: result.services[0]?.methods[0]?.path })
                            toast.success(`Reflected ${result.services.length} services`)
                        } catch (e) {
                            toast.error((e as Error).message)
                        } finally {
                            setReflecting(false)
                        }
                    }}
                    disabled={reflecting || !tab.url}
                    className="h-10"
                    title="Discover services + descriptors via the server's reflection API"
                >
                    {reflecting ? "Reflecting…" : "Reflect"}
                </Button>
                <Select
                    value={state.transport ?? "web"}
                    onValueChange={(v) => setState({ transport: v as "web" | "native" })}
                >
                    <SelectTrigger className="h-10 w-[180px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="web">Transport: gRPC-Web</SelectItem>
                        <SelectItem value="native">Transport: native (HTTP/2)</SelectItem>
                    </SelectContent>
                </Select>
                {state.transport !== "native" && (
                    <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <input
                            type="checkbox"
                            checked={!!state.useTextFormat}
                            onChange={(e) => setState({ useTextFormat: e.target.checked })}
                        />
                        grpc-web-text (base64)
                    </label>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
                <div className="flex flex-col gap-2 min-h-0">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        .proto schema
                    </Label>
                    <div className="flex-1 border rounded-lg overflow-hidden min-h-0">
                        <MemoCodeEditor
                            value={state.protoSource}
                            onChange={(v) => setState({ protoSource: v })}
                            language="protobuf"
                        />
                    </div>
                    {parseError && (
                        <div className="text-[11px] text-rose-500 font-mono">{parseError}</div>
                    )}
                </div>

                <div className="flex flex-col gap-2 min-h-0">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Request message (JSON)
                        {selectedMethod && (
                            <span className="ml-2 text-muted-foreground font-mono normal-case">
                                {selectedMethod.requestTypeName}
                            </span>
                        )}
                    </Label>
                    <div className="flex-1 border rounded-lg overflow-hidden min-h-0">
                        <MemoCodeEditor
                            value={state.requestJson}
                            onChange={(v) => setState({ requestJson: v })}
                            language="json"
                        />
                    </div>

                    {r && (
                        <div className="border rounded-lg bg-card p-3 space-y-2 max-h-[40%] overflow-auto">
                            <div className="flex items-center gap-2 flex-wrap text-xs">
                                {grpcOk && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                                {grpcErr && <AlertCircle className="h-3.5 w-3.5 text-rose-500" />}
                                <span className={cn(
                                    "font-mono font-bold",
                                    grpcOk && "text-emerald-600",
                                    grpcErr && "text-rose-500",
                                )}>
                                    HTTP {r.status} / gRPC {r.grpcStatus ?? "—"}
                                </span>
                                <span className="text-muted-foreground">{r.time}ms · {r.size}B</span>
                                {r.grpcMessage && (
                                    <span className="text-muted-foreground font-mono break-all">{r.grpcMessage}</span>
                                )}
                            </div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                Response message
                                {selectedMethod && (
                                    <span className="ml-2 font-mono normal-case">{selectedMethod.responseTypeName}</span>
                                )}
                            </Label>
                            <pre className="font-mono text-xs whitespace-pre-wrap break-all bg-muted/20 border rounded p-2 max-h-[200px] overflow-auto">
                                {r.messageJson || "(empty)"}
                            </pre>
                            {(isLoading) && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        </div>
                    )}

                    {/* Bidi staging area + live transcript */}
                    {selectedMethod && (selectedMethod.clientStreaming || selectedMethod.serverStreaming) && (
                        <div className="border rounded-lg bg-card p-3 space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Bidi staging ({(state.extraRequestMessages ?? []).length + 1} request message{(state.extraRequestMessages ?? []).length === 0 ? "" : "s"})
                                </Label>
                                <div className="flex gap-1">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setState({ extraRequestMessages: [...(state.extraRequestMessages ?? []), "{}"] })}
                                    >
                                        + message
                                    </Button>
                                    {(state.extraRequestMessages ?? []).length > 0 && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setState({ extraRequestMessages: (state.extraRequestMessages ?? []).slice(0, -1) })}
                                        >
                                            − last
                                        </Button>
                                    )}
                                </div>
                            </div>
                            {(state.extraRequestMessages ?? []).map((msg, idx) => (
                                <div key={idx} className="flex gap-2 items-start">
                                    <span className="text-[10px] text-muted-foreground font-mono pt-2">#{idx + 2}</span>
                                    <textarea
                                        className="flex-1 min-h-[60px] border rounded p-2 text-xs font-mono bg-background"
                                        value={msg}
                                        onChange={(e) => {
                                            const next = [...(state.extraRequestMessages ?? [])]
                                            next[idx] = e.target.value
                                            setState({ extraRequestMessages: next })
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {state.transcript && state.transcript.length > 0 && (
                        <div className="border rounded-lg bg-card p-3 space-y-2 max-h-[260px] overflow-auto">
                            <div className="flex items-center justify-between">
                                <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Transcript ({state.transcript.length})
                                </Label>
                                <Button size="sm" variant="ghost" onClick={() => setState({ transcript: [] })}>Clear</Button>
                            </div>
                            <div className="space-y-1">
                                {state.transcript.slice().reverse().map((row) => (
                                    <div key={row.id} className={cn("border rounded p-2 text-[11px] font-mono", row.direction === "sent" ? "bg-sky-500/[0.04]" : "bg-emerald-500/[0.04]")}>
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                                            <span className={row.direction === "sent" ? "text-sky-500" : "text-emerald-500"}>
                                                {row.direction === "sent" ? "⬆ sent" : "⬇ recv"}
                                            </span>
                                            <span>{new Date(row.timestamp).toLocaleTimeString()}</span>
                                            <span>{row.sizeBytes}B</span>
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
