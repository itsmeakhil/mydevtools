"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Play, X, FileDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { runPerf } from "@/lib/perf/runner"
import { summarise, toCsv, histogram, type LatencySample, type PerfSummary, type HistogramBucket } from "@/lib/perf/stats"
import { useEnvironmentsState } from "./context/environments-context"
import type { ApiRequestState } from "./types"
import { toast } from "sonner"

interface PerfRunDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    tab: ApiRequestState
}

const nowMs = (): number => Date.now()

function LatencyChart({ samples }: { samples: LatencySample[] }) {
    if (samples.length === 0) return null
    const w = 720
    const h = 180
    const pad = 24
    const xs = samples.map((s) => s.i)
    const ys = samples.map((s) => s.durationMs)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const maxY = Math.max(...ys, 1)
    const x = (i: number) => pad + ((i - minX) / Math.max(1, maxX - minX)) * (w - pad * 2)
    const y = (v: number) => h - pad - (v / maxY) * (h - pad * 2)
    const path = samples
        .map((s, idx) => `${idx === 0 ? "M" : "L"}${x(s.i).toFixed(1)},${y(s.durationMs).toFixed(1)}`)
        .join(" ")

    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[180px]" preserveAspectRatio="none">
            <rect x={0} y={0} width={w} height={h} fill="hsl(var(--card))" />
            <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="hsl(var(--border))" />
            <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="hsl(var(--border))" />
            <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={1.5} />
            {samples.map((s) => (
                <circle
                    key={s.i}
                    cx={x(s.i)}
                    cy={y(s.durationMs)}
                    r={1.5}
                    fill={s.error || (s.status ?? 0) >= 400 ? "rgb(244,63,94)" : "hsl(var(--primary))"}
                />
            ))}
            <text x={pad} y={pad - 6} className="fill-muted-foreground" fontSize="10">
                {maxY.toFixed(0)} ms
            </text>
            <text x={pad} y={h - pad + 14} className="fill-muted-foreground" fontSize="10">
                iter 0
            </text>
            <text x={w - pad - 30} y={h - pad + 14} className="fill-muted-foreground" fontSize="10">
                iter {maxX}
            </text>
        </svg>
    )
}

function Histogram({ buckets }: { buckets: HistogramBucket[] }) {
    if (buckets.length === 0) return null
    const w = 720, h = 120, pad = 24
    const maxCount = Math.max(...buckets.map((b) => b.count), 1)
    const barW = (w - pad * 2) / buckets.length
    return (
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[120px]" preserveAspectRatio="none">
            <rect x={0} y={0} width={w} height={h} fill="hsl(var(--card))" />
            {buckets.map((b, i) => {
                const x = pad + i * barW
                const barH = (b.count / maxCount) * (h - pad * 2)
                return (
                    <g key={i}>
                        <rect
                            x={x + 1}
                            y={h - pad - barH}
                            width={Math.max(0, barW - 2)}
                            height={barH}
                            fill="hsl(var(--primary))"
                            opacity={0.85}
                        >
                            <title>{`${b.lo}-${b.hi}ms: ${b.count}`}</title>
                        </rect>
                        {i % Math.max(1, Math.floor(buckets.length / 8)) === 0 && (
                            <text x={x} y={h - 6} fontSize="9" className="fill-muted-foreground">
                                {b.lo}
                            </text>
                        )}
                    </g>
                )
            })}
            <text x={pad} y={pad - 6} fontSize="10" className="fill-muted-foreground">
                max bin {maxCount}
            </text>
        </svg>
    )
}

function StatChip({ label, value }: { label: string; value: string }) {
    return (
        <div className="border rounded-lg px-3 py-2 bg-card flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
            <span className="font-mono text-sm">{value}</span>
        </div>
    )
}

export function PerfRunDialog({ open, onOpenChange, tab }: PerfRunDialogProps) {
    const { activeEnvironmentVariables } = useEnvironmentsState()
    const [iterations, setIterations] = React.useState(100)
    const [concurrency, setConcurrency] = React.useState(4)
    const [warmup, setWarmup] = React.useState(0)
    const [rampUpMs, setRampUpMs] = React.useState(0)
    const [loadShape, setLoadShape] = React.useState<"constant" | "ramp" | "spike" | "stair">("constant")
    const [samples, setSamples] = React.useState<LatencySample[]>([])
    const [running, setRunning] = React.useState(false)
    const abortRef = React.useRef<AbortController | null>(null)

    React.useEffect(() => {
        if (!open) {
            setSamples([])
            setRunning(false)
            abortRef.current?.abort()
            abortRef.current = null
        }
    }, [open])

    const summary: PerfSummary = React.useMemo(() => summarise(samples), [samples])

    const handleRun = async () => {
        if (!tab.url.trim()) { toast.error("Set a URL on the active tab first"); return }
        setSamples([])
        setRunning(true)
        abortRef.current = new AbortController()
        try {
            await runPerf({
                tab,
                iterations,
                concurrency,
                warmupIterations: warmup,
                rampUpMs,
                loadShape,
                envVariables: activeEnvironmentVariables,
                abortSignal: abortRef.current.signal,
                onProgress: (s) => setSamples((prev) => [...prev, s]),
            })
        } catch (e) {
            toast.error(`Perf run failed: ${(e as Error).message}`)
        } finally {
            setRunning(false)
            abortRef.current = null
        }
    }

    const handleAbort = () => abortRef.current?.abort()

    const handleExportCsv = () => {
        if (typeof window === "undefined" || samples.length === 0) return
        const blob = new Blob([toCsv(samples)], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `perf-${tab.method}-${nowMs()}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const fmt = (n: number) => n.toFixed(n < 10 ? 1 : 0)

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!running) onOpenChange(o) }}>
            <DialogContent className="sm:max-w-[820px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Performance run</DialogTitle>
                    <DialogDescription>
                        Fires the active tab&apos;s request through the proxy N times. Pre/post scripts
                        + OAuth refresh are skipped — perf mode measures transport, not script overhead.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                        <Label className="text-xs">Iterations</Label>
                        <Input type="number" min={1} value={iterations}
                            onChange={(e) => setIterations(Math.max(1, Number(e.target.value) || 1))}
                            disabled={running} className="h-9" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Concurrency</Label>
                        <Input type="number" min={1} max={50} value={concurrency}
                            onChange={(e) => setConcurrency(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
                            disabled={running} className="h-9" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Warmup</Label>
                        <Input type="number" min={0} value={warmup}
                            onChange={(e) => setWarmup(Math.max(0, Number(e.target.value) || 0))}
                            disabled={running} className="h-9" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Ramp-up (ms)</Label>
                        <Input type="number" min={0} value={rampUpMs}
                            onChange={(e) => setRampUpMs(Math.max(0, Number(e.target.value) || 0))}
                            disabled={running} className="h-9" />
                    </div>
                </div>
                <div className="space-y-1">
                    <Label className="text-xs">Load shape</Label>
                    <div className="flex gap-1 flex-wrap">
                        {(["constant", "ramp", "spike", "stair"] as const).map((s) => (
                            <button
                                key={s}
                                className={`text-[11px] px-2 py-1 rounded border ${loadShape === s ? "bg-primary/15 text-primary border-primary/30" : "text-muted-foreground hover:bg-muted/50"}`}
                                onClick={() => setLoadShape(s)}
                                disabled={running}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {!running ? (
                        <Button onClick={handleRun}>
                            <Play className="h-4 w-4 mr-2" /> Run
                        </Button>
                    ) : (
                        <Button variant="outline" onClick={handleAbort} className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10">
                            <X className="h-4 w-4 mr-2" /> Abort
                        </Button>
                    )}
                    {samples.length > 0 && !running && (
                        <Button size="sm" variant="outline" onClick={handleExportCsv}>
                            <FileDown className="h-4 w-4 mr-2" /> CSV
                        </Button>
                    )}
                    {running && (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            {samples.length} / {iterations}
                        </span>
                    )}
                </div>

                {samples.length > 0 && (
                    <div className="space-y-3">
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs">
                            <StatChip label="count" value={String(summary.count)} />
                            <StatChip label="ok / fail" value={`${summary.ok} / ${summary.fail}`} />
                            <StatChip label="rps" value={summary.rps.toFixed(1)} />
                            <StatChip label="min / max" value={`${fmt(summary.min)} / ${fmt(summary.max)} ms`} />
                            <StatChip label="mean" value={`${fmt(summary.mean)} ms`} />
                            <StatChip label="p50" value={`${fmt(summary.p50)} ms`} />
                            <StatChip label="p90" value={`${fmt(summary.p90)} ms`} />
                            <StatChip label="p95" value={`${fmt(summary.p95)} ms`} />
                            <StatChip label="p99" value={`${fmt(summary.p99)} ms`} />
                        </div>
                        <div className={cn("border rounded-lg overflow-hidden")}>
                            <LatencyChart samples={samples} />
                        </div>
                        <div className="border rounded-lg overflow-hidden">
                            <Histogram buckets={histogram(samples)} />
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
