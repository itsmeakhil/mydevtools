"use client"

import * as React from "react"
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Trash2 } from "lucide-react"
import {
    getMetrics, getLogs, getCounters, clearAll, subscribe, summariseMetrics,
} from "@/lib/observability/metrics"

interface MetricsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function MetricsDialog({ open, onOpenChange }: MetricsDialogProps) {
    const [tick, setTick] = React.useState(0)
    React.useEffect(() => subscribe(() => setTick((n) => n + 1)), [])

    const summary = React.useMemo(() => summariseMetrics(), [tick])
    const metrics = React.useMemo(() => getMetrics().slice().reverse().slice(0, 100), [tick])
    const logs = React.useMemo(() => getLogs().slice().reverse().slice(0, 100), [tick])
    const counters = React.useMemo(() => Array.from(getCounters().entries()).sort(), [tick])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[820px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Observability</DialogTitle>
                    <DialogDescription>
                        Live metrics + counter buffer across this session.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                    <Chip label="requests" value={summary.count} />
                    <Chip label="ok" value={summary.ok} />
                    <Chip label="fail" value={summary.fail} />
                    <Chip label="avg" value={`${summary.avgMs.toFixed(0)}ms`} />
                    <Chip label="p95" value={`${summary.p95Ms.toFixed(0)}ms`} />
                </div>

                {counters.length > 0 && (
                    <div className="border border-border rounded-xl p-3 text-xs bg-card">
                        <div className="font-medium text-xs text-muted-foreground mb-2">Counters</div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                            {counters.map(([k, v]) => (
                                <div key={k} className="flex justify-between bg-muted/40 rounded-md px-2 py-1">
                                    <span className="font-mono truncate">{k}</span>
                                    <span className="font-semibold tabular-nums">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => clearAll()}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-h-0">
                    <div className="border border-border rounded-xl p-3 flex flex-col min-h-0 bg-card">
                        <div className="text-xs font-medium text-muted-foreground pb-2">
                            Recent requests
                        </div>
                        <ScrollArea className="flex-1 min-h-0">
                            <div className="divide-y divide-border text-xs">
                                {metrics.map((m) => (
                                    <div key={m.id} className="py-1.5 flex gap-2 items-center tabular-nums">
                                        <span className="w-12 text-[10px] font-semibold">{m.method}</span>
                                        <span className={m.status >= 400 ? "text-destructive" : "text-success"}>{m.status}</span>
                                        <span className="text-muted-foreground">{m.timeMs}ms</span>
                                        <span className="truncate flex-1 font-mono">{m.url}</span>
                                    </div>
                                ))}
                                {metrics.length === 0 && (
                                    <div className="text-center text-[13px] text-muted-foreground py-6">No requests yet.</div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                    <div className="border border-border rounded-xl p-3 flex flex-col min-h-0 bg-card">
                        <div className="text-xs font-medium text-muted-foreground pb-2">
                            Recent logs
                        </div>
                        <ScrollArea className="flex-1 min-h-0">
                            <div className="divide-y divide-border text-xs">
                                {logs.map((l) => (
                                    <div key={l.id} className="py-1.5">
                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                            <span className={
                                                l.level === "error" ? "text-destructive" :
                                                l.level === "warn" ? "text-warning" : ""
                                            }>{l.level}</span>
                                            <span>{new Date(l.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="font-mono whitespace-pre-wrap break-all">{l.message}</div>
                                    </div>
                                ))}
                                {logs.length === 0 && (
                                    <div className="text-center text-[13px] text-muted-foreground py-6">No logs yet.</div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}

function Chip({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="border border-border rounded-xl px-3 py-2 bg-card flex flex-col">
            <span className="text-[11px] font-medium text-muted-foreground capitalize">{label}</span>
            <span className="text-[15px] font-semibold tabular-nums">{value}</span>
        </div>
    )
}
