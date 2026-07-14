"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowDownLeft, ArrowUpRight, Plug, X, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ApiRequestState, WebSocketMessage, WebSocketState } from "./types"
import { toast } from "sonner"

interface WebSocketPanelProps {
    tab: ApiRequestState
    onUpdate: (patch: Partial<ApiRequestState>) => void
}

/**
 * Live WebSocket connection panel. Runs entirely client-side (no proxy) since
 * the browser has native `WebSocket` and the proxy is built for fetch round-trips.
 * The socket instance lives in a ref keyed by tab id so switching tabs doesn't
 * tear it down; closing the tab does, via the cleanup effect.
 */
export function WebSocketPanel({ tab, onUpdate }: WebSocketPanelProps) {
    const wsRef = React.useRef<WebSocket | null>(null)
    const transcriptRef = React.useRef<HTMLDivElement | null>(null)

    const state: WebSocketState = tab.websocket ?? {
        status: "idle",
        messages: [],
        draft: "",
    }

    const setState = React.useCallback(
        (patch: Partial<WebSocketState>) => {
            onUpdate({ websocket: { ...state, ...patch } })
        },
        [state, onUpdate],
    )

    const appendMessage = React.useCallback(
        (msg: Omit<WebSocketMessage, "id" | "timestamp">) => {
            // Use functional update via the parent so multiple frames close together
            // don't lose intermediate appends to a stale closure of `state.messages`.
            onUpdate({
                websocket: {
                    ...(tab.websocket ?? state),
                    messages: [
                        ...(tab.websocket?.messages ?? state.messages),
                        { id: crypto.randomUUID(), timestamp: Date.now(), ...msg },
                    ],
                },
            })
        },
        // We intentionally read tab.websocket fresh each call.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [onUpdate, tab.websocket],
    )

    const disconnect = React.useCallback(() => {
        if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
            try { wsRef.current.close() } catch { /* already gone */ }
        }
        wsRef.current = null
    }, [])

    // Tear the live socket down when the tab unmounts or kind changes.
    React.useEffect(() => () => disconnect(), [disconnect])

    React.useEffect(() => {
        // Auto-scroll transcript to bottom when new message lands.
        const el = transcriptRef.current
        if (el) el.scrollTop = el.scrollHeight
    }, [state.messages.length])

    const connect = () => {
        if (!tab.url.trim()) {
            toast.error("Enter a ws:// or wss:// URL first")
            return
        }
        if (!/^wss?:\/\//i.test(tab.url)) {
            toast.error("URL must start with ws:// or wss://")
            return
        }
        disconnect()
        setState({ status: "connecting", closeCode: undefined, closeReason: undefined })
        try {
            const protocols = (state.protocols ?? "")
                .split(/[\n,]+/)
                .map((p) => p.trim())
                .filter(Boolean)
            const ws = protocols.length > 0 ? new WebSocket(tab.url, protocols) : new WebSocket(tab.url)
            wsRef.current = ws

            ws.onopen = () => {
                setState({ status: "open" })
            }
            ws.onmessage = (e) => {
                const data = typeof e.data === "string"
                    ? e.data
                    : e.data instanceof Blob
                        ? "[Blob]"
                        : e.data instanceof ArrayBuffer
                            ? `[ArrayBuffer ${e.data.byteLength} bytes]`
                            : String(e.data)
                appendMessage({ direction: "received", data })
            }
            ws.onerror = () => {
                appendMessage({ direction: "received", data: "[error]" })
            }
            ws.onclose = (e) => {
                setState({ status: "closed", closeCode: e.code, closeReason: e.reason })
                wsRef.current = null
            }
        } catch (err) {
            toast.error(`Failed to connect: ${(err as Error).message}`)
            setState({ status: "closed" })
        }
    }

    const send = () => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            toast.error("Socket not connected")
            return
        }
        const payload = state.draft
        if (!payload) return
        try {
            wsRef.current.send(payload)
            appendMessage({ direction: "sent", data: payload })
            setState({ draft: "" })
        } catch (err) {
            toast.error(`Send failed: ${(err as Error).message}`)
        }
    }

    const clearTranscript = () => setState({ messages: [] })

    const statusColor: Record<WebSocketState["status"], string> = {
        idle: "bg-muted text-muted-foreground",
        connecting: "bg-amber-500/10 text-amber-600",
        open: "bg-emerald-500/10 text-emerald-600",
        closing: "bg-amber-500/10 text-amber-600",
        closed: "bg-rose-500/10 text-rose-500",
    }

    const isOpen = state.status === "open"
    const isConnecting = state.status === "connecting"

    return (
        <div className="flex flex-col h-full min-h-0 gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <Input
                    placeholder="wss://example.com/socket"
                    value={tab.url}
                    onChange={(e) => onUpdate({ url: e.target.value })}
                    className="font-mono text-xs h-10 flex-1 min-w-[260px]"
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !isOpen) connect()
                    }}
                />
                {!isOpen ? (
                    <Button onClick={connect} disabled={isConnecting} className="h-10">
                        <Plug className="h-4 w-4 mr-2" /> {isConnecting ? "Connecting…" : "Connect"}
                    </Button>
                ) : (
                    <Button variant="outline" onClick={disconnect} className="h-10 border-rose-500/40 text-rose-500 hover:bg-rose-500/10">
                        <X className="h-4 w-4 mr-2" /> Disconnect
                    </Button>
                )}
                <span className={cn("text-xs font-semibold px-2 py-1 rounded uppercase tracking-wider", statusColor[state.status])}>
                    {state.status}
                    {state.status === "closed" && state.closeCode !== undefined && ` (${state.closeCode})`}
                </span>
            </div>

            <div className="grid grid-rows-[1fr_auto] gap-3 flex-1 min-h-0">
                <div className="border rounded-xl flex flex-col bg-card overflow-hidden min-h-0">
                    <div className="flex items-center justify-between px-3 py-2 border-b text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Transcript ({state.messages.length})</span>
                        <Button size="sm" variant="ghost" onClick={clearTranscript} disabled={state.messages.length === 0}>
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 min-h-0">
                        <div ref={transcriptRef} className="p-3 space-y-2">
                            {state.messages.length === 0 ? (
                                <div className="text-center text-xs text-muted-foreground py-8">
                                    No messages yet. Connect and send to populate.
                                </div>
                            ) : (
                                state.messages.map((m) => (
                                    <div
                                        key={m.id}
                                        className={cn(
                                            "flex items-start gap-2 text-xs",
                                            m.direction === "sent" ? "" : "",
                                        )}
                                    >
                                        {m.direction === "sent" ? (
                                            <ArrowUpRight className="h-3.5 w-3.5 mt-0.5 text-sky-500" />
                                        ) : (
                                            <ArrowDownLeft className="h-3.5 w-3.5 mt-0.5 text-emerald-500" />
                                        )}
                                        <div className="flex-1 min-w-0 space-y-0.5">
                                            <div className="text-[10px] text-muted-foreground">
                                                {new Date(m.timestamp).toLocaleTimeString()}
                                            </div>
                                            <pre className="font-mono text-xs whitespace-pre-wrap break-all bg-muted/30 border rounded px-2 py-1">
                                                {m.data}
                                            </pre>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>

                <div className="border rounded-xl bg-card p-3 space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Compose message
                    </div>
                    <Textarea
                        placeholder="Plain text or JSON…"
                        value={state.draft}
                        onChange={(e) => setState({ draft: e.target.value })}
                        className="font-mono text-xs min-h-[80px]"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                e.preventDefault()
                                send()
                            }
                        }}
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">⌘/Ctrl + Enter to send</span>
                        <Button onClick={send} disabled={!isOpen || !state.draft}>
                            <ArrowUpRight className="h-4 w-4 mr-2" /> Send
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
