"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, AlertCircle, Loader2, Play, X, FileDown, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Collection } from "./types"
import { useScriptsRunner } from "./workers/use-scripts-runner"
import { useEnvironmentsState } from "./context/environments-context"
import { parseDataFile } from "@/lib/runner/csv"
import { runCollection } from "@/lib/runner/runner"
import { downloadJUnitXml } from "@/lib/runner/junit"
import type { RequestRunResult } from "@/lib/runner/types"
import { toast } from "sonner"

interface CollectionRunnerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    collection: Collection | null
}

export function CollectionRunnerDialog({ open, onOpenChange, collection }: CollectionRunnerDialogProps) {
    const { activeEnvironmentVariables } = useEnvironmentsState()
    const { run: runScript } = useScriptsRunner()

    const [iterations, setIterations] = React.useState(1)
    const [dataRows, setDataRows] = React.useState<Record<string, string>[]>([])
    const [dataFileName, setDataFileName] = React.useState<string>("")
    const [results, setResults] = React.useState<RequestRunResult[]>([])
    const [running, setRunning] = React.useState(false)
    const [total, setTotal] = React.useState(0)
    const abortRef = React.useRef<AbortController | null>(null)

    React.useEffect(() => {
        if (!open) {
            setResults([])
            setRunning(false)
            setDataRows([])
            setDataFileName("")
            setIterations(1)
            abortRef.current?.abort()
            abortRef.current = null
        }
    }, [open])

    const handleDataFile = async (file: File | null) => {
        if (!file) return
        try {
            const text = await file.text()
            const rows = parseDataFile(text)
            setDataRows(rows)
            setDataFileName(file.name)
            toast.success(`Loaded ${rows.length} rows from ${file.name}`)
        } catch (e) {
            toast.error(`Could not parse data file: ${(e as Error).message}`)
        }
    }

    const handleRun = async () => {
        if (!collection) return
        setResults([])
        setRunning(true)
        abortRef.current = new AbortController()
        try {
            await runCollection({
                collection,
                iterations,
                dataRows: dataRows.length > 0 ? dataRows : undefined,
                environmentVariables: activeEnvironmentVariables,
                runScript,
                abortSignal: abortRef.current.signal,
                onProgress: (e) => {
                    if (e.kind === "started") setTotal(e.total)
                    if (e.kind === "request-done") {
                        setResults((prev) => [...prev, e.result])
                    }
                },
            })
        } catch (e) {
            toast.error(`Run failed: ${(e as Error).message}`)
        } finally {
            setRunning(false)
            abortRef.current = null
        }
    }

    const handleAbort = () => {
        abortRef.current?.abort()
    }

    const stats = React.useMemo(() => {
        let totalTests = 0
        let failedTests = 0
        let networkErrors = 0
        for (const r of results) {
            totalTests += r.tests.length
            failedTests += r.tests.filter((t) => !t.pass).length
            if (r.networkError) networkErrors++
        }
        return { totalTests, failedTests, networkErrors, passed: totalTests - failedTests }
    }, [results])

    const handleExport = () => {
        if (!collection) return
        downloadJUnitXml(results, collection.name)
    }

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!running) onOpenChange(o) }}>
            <DialogContent className="sm:max-w-[720px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Run collection: {collection?.name ?? "—"}</DialogTitle>
                    <DialogDescription>
                        Sends every request in this collection sequentially. Pre-request + test scripts
                        + cookie jar + OAuth refresh + env substitution all behave exactly as a normal send.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs">Iterations</Label>
                        <Input
                            type="number"
                            min={1}
                            value={iterations}
                            onChange={(e) => setIterations(Math.max(1, Number(e.target.value) || 1))}
                            disabled={dataRows.length > 0 || running}
                            className="h-9"
                        />
                        {dataRows.length > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                                Iterations forced to {dataRows.length} (from data file).
                            </p>
                        )}
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Data file (CSV or JSON array)</Label>
                        <div className="flex items-center gap-2">
                            <label className="inline-flex">
                                <input
                                    type="file"
                                    accept=".csv,.json,text/csv,application/json"
                                    className="hidden"
                                    onChange={(e) => void handleDataFile(e.target.files?.[0] ?? null)}
                                    disabled={running}
                                />
                                <Button variant="outline" size="sm" asChild disabled={running}>
                                    <span>Choose</span>
                                </Button>
                            </label>
                            {dataFileName ? (
                                <div className="flex-1 flex items-center gap-1 text-xs text-muted-foreground truncate">
                                    <span className="truncate">{dataFileName}</span>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => { setDataRows([]); setDataFileName("") }} disabled={running}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <span className="text-xs text-muted-foreground">none</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!running ? (
                        <Button onClick={handleRun} disabled={!collection || running}>
                            <Play className="h-4 w-4 mr-2" /> Run
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={handleAbort} className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10">
                            <X className="h-4 w-4 mr-2" /> Abort
                        </Button>
                    )}
                    {results.length > 0 && (
                        <Button variant="outline" size="sm" onClick={() => setResults([])} disabled={running}>
                            <Trash2 className="h-4 w-4 mr-2" /> Clear
                        </Button>
                    )}
                    {results.length > 0 && !running && (
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <FileDown className="h-4 w-4 mr-2" /> JUnit XML
                        </Button>
                    )}
                </div>

                {(running || results.length > 0) && (
                    <div className="flex flex-wrap gap-3 text-xs">
                        {running && (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                {results.length} / {total}
                            </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {stats.passed} pass
                        </span>
                        {stats.failedTests > 0 && (
                            <span className="inline-flex items-center gap-1 text-rose-500">
                                <AlertCircle className="h-3.5 w-3.5" />
                                {stats.failedTests} fail
                            </span>
                        )}
                        {stats.networkErrors > 0 && (
                            <span className="inline-flex items-center gap-1 text-amber-600">
                                <AlertCircle className="h-3.5 w-3.5" />
                                {stats.networkErrors} network
                            </span>
                        )}
                    </div>
                )}

                <ScrollArea className="flex-1 min-h-[200px] border rounded-lg bg-card">
                    <div className="p-3 space-y-1.5">
                        {results.length === 0 && !running && (
                            <div className="text-center py-10 text-xs text-muted-foreground">
                                Configure and click Run.
                            </div>
                        )}
                        {results.map((r, i) => {
                            const ok = !r.networkError && (r.status ?? 0) >= 200 && (r.status ?? 0) < 400
                                && r.tests.every((t) => t.pass)
                            const tone = r.networkError
                                ? "border-rose-500/30 bg-rose-500/[0.03]"
                                : ok
                                    ? "border-emerald-500/20 bg-emerald-500/[0.02]"
                                    : "border-amber-500/30 bg-amber-500/[0.03]"
                            return (
                                <div key={`${r.requestId}-${i}`} className={cn("border rounded-lg p-2 text-xs space-y-1", tone)}>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono font-bold text-[10px] w-12 text-right">{r.method}</span>
                                        <span className="font-mono break-all flex-1 min-w-0">{r.requestName}</span>
                                        {r.status !== undefined && (
                                            <span className={cn(
                                                "font-mono text-[10px] px-1.5 py-0.5 rounded",
                                                ok ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-500",
                                            )}>
                                                {r.status}
                                            </span>
                                        )}
                                        {r.time !== undefined && (
                                            <span className="text-[10px] text-muted-foreground">{r.time}ms</span>
                                        )}
                                    </div>
                                    {r.networkError && (
                                        <div className="text-rose-500 font-mono text-[11px]">{r.networkError}</div>
                                    )}
                                    {r.tests.length > 0 && (
                                        <ul className="pl-3 space-y-0.5">
                                            {r.tests.map((t, j) => (
                                                <li key={j} className={cn("font-mono text-[11px]", t.pass ? "text-emerald-600" : "text-rose-500")}>
                                                    {t.pass ? "✓" : "✗"} {t.name}
                                                    {!t.pass && t.error && <span className="text-muted-foreground"> — {t.error}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
