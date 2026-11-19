"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface MockLogEntry {
    at: number
    collectionId: string
    method: string
    path: string
    status: number
    example: string | null
    durationMs: number
}

interface MockStatus {
    port: number | null
    latencyMs: number
    log: MockLogEntry[]
}

const DEFAULT_PORT = 8940

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    const core = await import("@tauri-apps/api/core")
    return core.invoke<T>(cmd, args)
}

/** Desktop-only controls for the loopback mock server that serves a collection's saved examples. */
export function MockServerDialog({ collection, onOpenChange }: {
    collection: { id: string; name: string } | null
    onOpenChange: (open: boolean) => void
}) {
    const t = useTranslations("ApiClient.mockServer")
    const open = collection !== null
    const [status, setStatus] = React.useState<MockStatus | null>(null)
    const [port, setPort] = React.useState("")
    const [latency, setLatency] = React.useState("0")
    const [busy, setBusy] = React.useState(false)

    const refresh = React.useCallback(async () => {
        try {
            const s = await invoke<MockStatus>("mock_server_status")
            setStatus(s)
            return s
        } catch { return null }
    }, [])

    // Seed the form once per open, then poll the log while the dialog is open.
    React.useEffect(() => {
        if (!open) return
        void refresh().then((s) => {
            setPort(String(s?.port ?? DEFAULT_PORT))
            setLatency(String(s?.latencyMs ?? 0))
        })
        const id = window.setInterval(() => void refresh(), 1000)
        return () => window.clearInterval(id)
    }, [open, refresh])

    const start = async () => {
        const p = Number(port)
        if (!Number.isInteger(p) || p < 1024 || p > 65535) {
            toast.error(t("invalidPort"))
            return
        }
        const ms = Math.max(0, Math.min(60_000, Math.round(Number(latency) || 0)))
        setBusy(true)
        try {
            await invoke<number>("mock_server_start", { port: p, latencyMs: ms })
            await refresh()
        } catch (e) {
            const msg = String((e as Error)?.message ?? e)
            toast.error(msg.includes("already in use") ? t("portInUse", { port: p }) : `${t("failed")}: ${msg}`)
        } finally {
            setBusy(false)
        }
    }

    const stop = async () => {
        setBusy(true)
        try {
            await invoke("mock_server_stop")
            await refresh()
        } catch (e) {
            toast.error(`${t("failed")}: ${String((e as Error)?.message ?? e)}`)
        } finally {
            setBusy(false)
        }
    }

    const copyUrl = async () => {
        if (!status?.port || !collection) return
        try {
            await navigator.clipboard.writeText(`http://127.0.0.1:${status.port}/${collection.id}/`)
            toast.success(t("urlCopied"))
        } catch (e) {
            toast.error((e as Error).message)
        }
    }

    const clearLog = async () => {
        try {
            await invoke("mock_server_clear_log")
            await refresh()
        } catch { /* polling shows the current log either way */ }
    }

    const running = status?.port != null
    const log = (status?.log ?? []).filter((e) => e.collectionId === collection?.id).reverse()

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t("title")}</DialogTitle>
                    <DialogDescription>{t("description", { name: collection?.name ?? "" })}</DialogDescription>
                </DialogHeader>

                <p className="text-sm" role="status">
                    <span className={cn("inline-block h-2 w-2 rounded-full mr-2", running ? "bg-primary" : "bg-muted-foreground")} />
                    {running ? t("running", { port: status!.port! }) : t("stopped")}
                </p>

                <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                        <Label htmlFor="mock-port">{t("port")}</Label>
                        <Input id="mock-port" type="number" min={1024} max={65535} value={port} onChange={(e) => setPort(e.target.value)} className="font-mono" />
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="mock-latency">{t("latency")}</Label>
                        <Input id="mock-latency" type="number" min={0} max={60000} step={50} value={latency} onChange={(e) => setLatency(e.target.value)} className="font-mono" />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void start()} disabled={busy}>{running ? t("apply") : t("start")}</Button>
                    <Button size="sm" variant="outline" onClick={() => void stop()} disabled={busy || !running}>{t("stop")}</Button>
                    <Button size="sm" variant="outline" onClick={() => void copyUrl()} disabled={!running}>{t("copyUrl")}</Button>
                </div>

                <div className="flex items-center justify-between pt-2">
                    <h3 className="text-sm font-medium">{t("requests")}</h3>
                    <Button size="sm" variant="ghost" onClick={() => void clearLog()} disabled={log.length === 0}>{t("clear")}</Button>
                </div>
                <div className="min-h-[120px] flex-1 overflow-auto rounded-md border bg-card">
                    {log.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground">{t("empty")}</p>
                    ) : (
                        <table className="w-full text-xs">
                            <tbody>
                                {log.map((e, i) => (
                                    <tr key={`${e.at}-${i}`} className="border-b last:border-0">
                                        <td className="px-3 py-1.5 text-muted-foreground font-mono whitespace-nowrap">{new Date(e.at).toLocaleTimeString()}</td>
                                        <td className="px-3 py-1.5 font-mono">{e.method}</td>
                                        <td className="px-3 py-1.5 font-mono break-all">{e.path}</td>
                                        <td className={cn("px-3 py-1.5 font-mono", e.status >= 400 && "text-destructive")}>{e.status}</td>
                                        <td className="px-3 py-1.5 text-muted-foreground">{e.example ?? t("noMatch")}</td>
                                        <td className="px-3 py-1.5 text-muted-foreground font-mono whitespace-nowrap text-right">{e.durationMs} ms</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
