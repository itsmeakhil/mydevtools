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
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle2, AlertCircle, Loader2, Play, X, FileDown, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { Collection, CollectionRequest } from "./types"
import { useScriptsRunner } from "./workers/use-scripts-runner"
import { useEnvironmentsState } from "./context/environments-context"
import { parseDataFile } from "@/lib/runner/csv"
import { runCollection, walkRequests } from "@/lib/runner/runner"
import { downloadJUnitXml } from "@/lib/runner/junit"
import { downloadHtmlReport } from "@/lib/runner/html-report"
import type { RequestRunResult } from "@/lib/runner/types"
import { toast } from "sonner"

interface CollectionRunnerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    collection: Collection | null
}

export function CollectionRunnerDialog({ open, onOpenChange, collection }: CollectionRunnerDialogProps) {
    const t = useTranslations("ApiClient.runner")
    const { activeEnvironmentVariables, globalVariables } = useEnvironmentsState()
    const { run: runScript } = useScriptsRunner()

    const [iterations, setIterations] = React.useState(1)
    const [dataRows, setDataRows] = React.useState<Record<string, string>[]>([])
    const [dataFileName, setDataFileName] = React.useState<string>("")
    const [results, setResults] = React.useState<RequestRunResult[]>([])
    const [running, setRunning] = React.useState(false)
    const [total, setTotal] = React.useState(0)
    const [bail, setBail] = React.useState(false)
    const [delayMs, setDelayMs] = React.useState(0)
    const [excluded, setExcluded] = React.useState<Set<string>>(() => new Set())
    const [durationMs, setDurationMs] = React.useState(0)
    const abortRef = React.useRef<AbortController | null>(null)

    React.useEffect(() => {
        if (!open) {
            setResults([])
            setRunning(false)
            setDataRows([])
            setDataFileName("")
            setIterations(1)
            setExcluded(new Set())
            abortRef.current?.abort()
            abortRef.current = null
        }
    }, [open])

    const requests = React.useMemo(() => {
        const out: CollectionRequest[] = []
        if (collection) walkRequests(collection.items, out)
        return out
    }, [collection])
    const selectedCount = requests.filter((r) => !excluded.has(r.id)).length
    const toggleRequest = (id: string, on: boolean) => setExcluded((prev) => {
        const next = new Set(prev)
        if (on) next.delete(id)
        else next.add(id)
        return next
    })

    const handleDataFile = async (file: File | null) => {
        if (!file) return
        try {
            const text = await file.text()
            const rows = parseDataFile(text)
            setDataRows(rows)
            setDataFileName(file.name)
            toast.success(t("loaded", { count: rows.length, file: file.name }))
        } catch (e) {
            toast.error(t("parseFailed", { message: (e as Error).message }))
        }
    }

    const handleRun = async () => {
        if (!collection) return
        setResults([])
        setRunning(true)
        abortRef.current = new AbortController()
        const started = performance.now()
        try {
            await runCollection({
                collection,
                iterations,
                dataRows: dataRows.length > 0 ? dataRows : undefined,
                environmentVariables: activeEnvironmentVariables,
                globalVariables,
                runScript,
                abortSignal: abortRef.current.signal,
                bail,
                delayMs,
                only: excluded.size > 0 ? new Set(requests.filter((r) => !excluded.has(r.id)).map((r) => r.id)) : undefined,
                onProgress: (e) => {
                    if (e.kind === "started") setTotal(e.total)
                    if (e.kind === "request-done") {
                        setResults((prev) => [...prev, e.result])
                    }
                },
            })
        } catch (e) {
            toast.error(t("runFailed", { message: (e as Error).message }))
        } finally {
            setDurationMs(Math.round(performance.now() - started))
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

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!running) onOpenChange(o) }}>
            <DialogContent className="sm:max-w-[720px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{t("title", { name: collection?.name ?? "—" })}</DialogTitle>
                    <DialogDescription>{t("description")}</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <Label htmlFor="runner-iterations" className="text-xs">{t("iterations")}</Label>
                        <Input
                            id="runner-iterations"
                            type="number"
                            min={1}
                            value={iterations}
                            onChange={(e) => setIterations(Math.max(1, Number(e.target.value) || 1))}
                            disabled={dataRows.length > 0 || running}
                            className="h-9"
                        />
                        {dataRows.length > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                                {t("iterationsFromData", { count: dataRows.length })}
                            </p>
                        )}
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">{t("dataFile")}</Label>
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
                                    <span>{t("choose")}</span>
                                </Button>
                            </label>
                            {dataFileName ? (
                                <div className="flex-1 flex items-center gap-1 text-xs text-muted-foreground truncate">
                                    <span className="truncate">{dataFileName}</span>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" aria-label={t("removeDataFile")} onClick={() => { setDataRows([]); setDataFileName("") }} disabled={running}>
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <span className="text-xs text-muted-foreground">{t("noDataFile")}</span>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="runner-delay" className="text-xs">{t("delay")}</Label>
                        <Input
                            id="runner-delay"
                            type="number"
                            min={0}
                            value={delayMs}
                            onChange={(e) => setDelayMs(Math.max(0, Number(e.target.value) || 0))}
                            disabled={running}
                            className="h-9"
                        />
                    </div>
                    <div className="flex items-center gap-2 sm:pt-5">
                        <Checkbox id="runner-bail" checked={bail} onCheckedChange={(v) => setBail(v === true)} disabled={running} />
                        <Label htmlFor="runner-bail" className="text-xs">{t("bail")}</Label>
                    </div>
                </div>

                {requests.length > 0 && (
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium flex-1">
                                {t("requests", { selected: selectedCount, total: requests.length })}
                            </span>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setExcluded(new Set())} disabled={running}>
                                {t("selectAll")}
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setExcluded(new Set(requests.map((r) => r.id)))} disabled={running}>
                                {t("selectNone")}
                            </Button>
                        </div>
                        <div className="max-h-32 overflow-y-auto border border-border rounded-lg">
                            <ul className="p-1.5 space-y-0.5">
                                {requests.map((r) => (
                                    <li key={r.id}>
                                        <label className="flex items-center gap-2 px-1.5 py-1 rounded-md text-xs hover:bg-muted/50">
                                            <Checkbox
                                                checked={!excluded.has(r.id)}
                                                onCheckedChange={(v) => toggleRequest(r.id, v === true)}
                                                disabled={running}
                                            />
                                            <span className="font-semibold text-[10px] w-12 text-right">{r.method}</span>
                                            <span className="truncate">{r.name}</span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                    {!running ? (
                        <Button onClick={handleRun} disabled={!collection || selectedCount === 0}>
                            <Play className="h-4 w-4 mr-2" /> {t("run")}
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={handleAbort} className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                            <X className="h-4 w-4 mr-2" /> {t("abort")}
                        </Button>
                    )}
                    {results.length > 0 && (
                        <Button variant="outline" size="sm" onClick={() => setResults([])} disabled={running}>
                            <Trash2 className="h-4 w-4 mr-2" /> {t("clear")}
                        </Button>
                    )}
                    {results.length > 0 && !running && collection && (
                        <>
                            <Button variant="outline" size="sm" onClick={() => downloadJUnitXml(results, collection.name)}>
                                <FileDown className="h-4 w-4 mr-2" /> {t("exportJunit")}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => downloadHtmlReport(results, collection.name, durationMs)}>
                                <FileDown className="h-4 w-4 mr-2" /> {t("exportHtml")}
                            </Button>
                        </>
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
                        <span className="inline-flex items-center gap-1 text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {t("passed", { count: stats.passed })}
                        </span>
                        {stats.failedTests > 0 && (
                            <span className="inline-flex items-center gap-1 text-destructive">
                                <AlertCircle className="h-3.5 w-3.5" />
                                {t("failed", { count: stats.failedTests })}
                            </span>
                        )}
                        {stats.networkErrors > 0 && (
                            <span className="inline-flex items-center gap-1 text-warning">
                                <AlertCircle className="h-3.5 w-3.5" />
                                {t("networkErrors", { count: stats.networkErrors })}
                            </span>
                        )}
                    </div>
                )}

                <ScrollArea className="flex-1 min-h-[200px] border border-border rounded-xl bg-card">
                    <div className="p-3 space-y-1.5">
                        {results.length === 0 && !running && (
                            <div className="text-center py-10 text-[13px] text-muted-foreground">
                                {t("empty")}
                            </div>
                        )}
                        {results.map((r, i) => {
                            const ok = !r.networkError && (r.status ?? 0) >= 200 && (r.status ?? 0) < 400
                                && r.tests.every((t) => t.pass)
                            const tone = r.networkError
                                ? "border-destructive/25 bg-destructive/[0.04]"
                                : ok
                                    ? "border-border"
                                    : "border-warning/30 bg-warning/[0.04]"
                            return (
                                <div key={`${r.requestId}-${i}`} className={cn("border rounded-lg p-2 text-xs space-y-1", tone)}>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold text-[10px] w-12 text-right">{r.method}</span>
                                        <span className="break-all flex-1 min-w-0">{r.requestName}</span>
                                        {r.status !== undefined && (
                                            <span className={cn(
                                                "text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full",
                                                ok ? "bg-success/[0.12] text-success" : "bg-destructive/[0.12] text-destructive",
                                            )}>
                                                {r.status}
                                            </span>
                                        )}
                                        {r.time !== undefined && (
                                            <span className="text-[10px] text-muted-foreground tabular-nums">{r.time}ms</span>
                                        )}
                                    </div>
                                    {r.networkError && (
                                        <div className="text-destructive font-mono text-[11px]">{r.networkError}</div>
                                    )}
                                    {r.tests.length > 0 && (
                                        <ul className="pl-3 space-y-0.5">
                                            {r.tests.map((t, j) => (
                                                <li key={j} className={cn("font-mono text-[11px]", t.pass ? "text-success" : "text-destructive")}>
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
