"use client"

import { apiFetch } from "@/lib/desktop/api-fetch";
import * as React from "react"
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Play, X, FileDown } from "lucide-react"
import { generateFuzzCases, applyMutation } from "@/lib/fuzz/mutators"
import { diffJson } from "@/lib/diff/json-diff"
import type { ApiRequestState } from "./types"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface FuzzRunDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    tab: ApiRequestState
}

interface FuzzResult {
    path: string
    mutationLabel: string
    status: number
    timeMs: number
    bodyExcerpt: string
    diffCount: number
}

const nowMs = () => Date.now()

export function FuzzRunDialog({ open, onOpenChange, tab }: FuzzRunDialogProps) {
    const [running, setRunning] = React.useState(false)
    const [results, setResults] = React.useState<FuzzResult[]>([])
    const [baseline, setBaseline] = React.useState<{ status: number; body: string } | null>(null)
    const abortRef = React.useRef<AbortController | null>(null)

    React.useEffect(() => {
        if (!open) {
            setRunning(false)
            setResults([])
            setBaseline(null)
            abortRef.current?.abort()
        }
    }, [open])

    const run = async () => {
        if (tab.body.type !== "json") {
            toast.error("Fuzz mode needs a JSON body on the active tab")
            return
        }
        let parsedBody: unknown
        try { parsedBody = JSON.parse(tab.body.content) }
        catch (e) { toast.error(`Body parse: ${(e as Error).message}`); return }

        setResults([])
        setRunning(true)
        abortRef.current = new AbortController()

        const sendOne = async (body: string) => {
            const start = nowMs()
            const res = await apiFetch("/api/proxy", {
                method: "POST",
                credentials: "include",
                signal: abortRef.current!.signal,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: tab.url,
                    method: tab.method,
                    headers: tab.headers.reduce<Record<string, string>>((m, h) => {
                        if (h.active && h.key) m[h.key] = h.value
                        return m
                    }, {}),
                    body,
                }),
            })
            const data = await res.json()
            return {
                status: data.status ?? 0,
                body: typeof data.body === "string" ? data.body : "",
                timeMs: nowMs() - start,
            }
        }

        try {
            const base = await sendOne(JSON.stringify(parsedBody))
            setBaseline({ status: base.status, body: base.body })

            let count = 0
            for (const fuzz of generateFuzzCases(parsedBody)) {
                if (abortRef.current?.signal.aborted) break
                if (count++ > 60) break  // hard cap to avoid runaway
                const mutated = applyMutation(parsedBody, fuzz.path, fuzz.mutated)
                let resp
                try { resp = await sendOne(JSON.stringify(mutated)) }
                catch { continue }
                let diffCount = 0
                try {
                    const a = JSON.parse(base.body)
                    const b = JSON.parse(resp.body)
                    diffCount = diffJson(a, b).length
                } catch { /* non-JSON body — fall back to byte compare */
                    diffCount = base.body === resp.body ? 0 : 1
                }
                setResults((prev) => [...prev, {
                    path: fuzz.path,
                    mutationLabel: fuzz.mutationLabel,
                    status: resp.status,
                    timeMs: resp.timeMs,
                    bodyExcerpt: resp.body.slice(0, 200),
                    diffCount,
                }])
            }
        } catch (e) {
            toast.error(`Fuzz run failed: ${(e as Error).message}`)
        } finally {
            setRunning(false)
            abortRef.current = null
        }
    }

    const exportCsv = () => {
        if (typeof window === "undefined" || results.length === 0) return
        const rows = [
            ["path", "mutation", "status", "time_ms", "diff_lines", "body_excerpt"].join(","),
            ...results.map((r) => [
                r.path,
                JSON.stringify(r.mutationLabel),
                r.status,
                r.timeMs,
                r.diffCount,
                JSON.stringify(r.bodyExcerpt),
            ].join(",")),
        ].join("\n")
        const blob = new Blob([rows + "\n"], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `fuzz-${tab.method}-${nowMs()}.csv`
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!running) onOpenChange(o) }}>
            <DialogContent className="sm:max-w-[820px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Fuzz run</DialogTitle>
                    <DialogDescription>
                        Mutates each JSON body field with edge-case payloads (empty / null / oversize /
                        injection / type-swap) and compares responses against the baseline.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center gap-2">
                    {!running ? (
                        <Button onClick={run}><Play className="h-4 w-4 mr-2" /> Run</Button>
                    ) : (
                        <Button variant="outline" onClick={() => abortRef.current?.abort()} className="border-rose-500/40 text-rose-500">
                            <X className="h-4 w-4 mr-2" /> Abort
                        </Button>
                    )}
                    {results.length > 0 && !running && (
                        <Button size="sm" variant="outline" onClick={exportCsv}>
                            <FileDown className="h-4 w-4 mr-2" /> CSV
                        </Button>
                    )}
                    {running && (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" /> {results.length} sent
                        </span>
                    )}
                </div>

                {baseline && (
                    <div className="text-xs border rounded-lg p-2 bg-card flex items-center gap-2">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">Baseline</span>
                        <span className="font-mono">{baseline.status}</span>
                        <span className="text-muted-foreground truncate flex-1">{baseline.body.slice(0, 120)}</span>
                    </div>
                )}

                <ScrollArea className="flex-1 min-h-[200px] border rounded-lg">
                    <div className="p-1">
                        <table className="w-full text-xs font-mono">
                            <thead className="bg-muted/40 sticky top-0">
                                <tr>
                                    {["path", "mutation", "status", "ms", "diff"].map((h) => (
                                        <th key={h} className="text-left px-2 py-1 font-bold uppercase tracking-wider text-[10px]">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((r, i) => (
                                    <tr key={i} className={cn(i % 2 === 0 ? "" : "bg-muted/20")}>
                                        <td className="px-2 py-1 truncate max-w-[160px]">{r.path}</td>
                                        <td className="px-2 py-1 text-muted-foreground">{r.mutationLabel}</td>
                                        <td className={cn(
                                            "px-2 py-1 font-bold",
                                            r.status >= 500 ? "text-rose-500" :
                                            r.status >= 400 ? "text-amber-600" :
                                            "text-emerald-600"
                                        )}>{r.status}</td>
                                        <td className="px-2 py-1">{r.timeMs}</td>
                                        <td className={cn("px-2 py-1", r.diffCount > 0 ? "text-amber-600" : "text-muted-foreground")}>
                                            {r.diffCount}
                                        </td>
                                    </tr>
                                ))}
                                {results.length === 0 && (
                                    <tr><td colSpan={5} className="text-center text-muted-foreground py-6">No results yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
