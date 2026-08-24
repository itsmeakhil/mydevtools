"use client"

import * as React from "react"
import { CloudOff, Cloud, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { drainQueue, listQueue, subscribe, type QueuedMutation } from "@/lib/offline/queue"
import { apiFetch } from "@/lib/desktop/api-fetch"
import { toast } from "sonner"

export function OfflineIndicator() {
    const [online, setOnline] = React.useState(typeof window !== "undefined" ? navigator.onLine : true)
    const [queue, setQueue] = React.useState<QueuedMutation[]>([])
    const [draining, setDraining] = React.useState(false)

    React.useEffect(() => subscribe(setQueue), [])

    React.useEffect(() => {
        if (typeof window === "undefined") return
        const onUp = () => { setOnline(true); void doDrain("reconnect") }
        const onDown = () => setOnline(false)
        window.addEventListener("online", onUp)
        window.addEventListener("offline", onDown)
        return () => {
            window.removeEventListener("online", onUp)
            window.removeEventListener("offline", onDown)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const doDrain = async (reason: "manual" | "reconnect") => {
        if (listQueue().length === 0) return
        setDraining(true)
        try {
            const result = await drainQueue((path, init) => apiFetch(path, init))
            if (result.succeeded > 0) {
                toast.success(`Replayed ${result.succeeded} pending change${result.succeeded === 1 ? "" : "s"}`)
            }
            if (result.failed > 0 && reason === "manual") {
                toast.error("Some changes still failed — will retry")
            }
        } finally { setDraining(false) }
    }

    // Hide when online + nothing queued.
    if (online && queue.length === 0) return null

    // Carries its own separator so the toolbar has no dangling divider while hidden.
    return (
        <>
            <div className="h-5 w-px shrink-0 bg-border" />
            <button
                onClick={() => doDrain("manual")}
                className={cn(
                    "h-8 px-2 rounded-md text-xs flex items-center gap-1.5 border",
                    online ? "bg-amber-500/10 border-amber-500/30 text-amber-700" : "bg-rose-500/10 border-rose-500/30 text-rose-700",
                )}
                title={online ? "Replay pending changes" : "You are offline"}
            >
                {online ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
                <span className="font-semibold">{online ? "Pending" : "Offline"}</span>
                {queue.length > 0 && (
                    <span className="font-mono">{queue.length}</span>
                )}
                {draining && <RefreshCw className="h-3 w-3 animate-spin" />}
            </button>
        </>
    )
}
