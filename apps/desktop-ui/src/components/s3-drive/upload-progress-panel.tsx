"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
    IconAlertCircle,
    IconCheck,
    IconChevronDown,
    IconCloudUpload,
    IconLoader2,
    IconMinus,
    IconRefresh,
    IconX,
} from "@tabler/icons-react"

export type FileUploadStatus = {
    name: string
    status: "queued" | "uploading" | "done" | "error"
    progress: number
    file?: File
    key?: string
    error?: string
}

export function UploadProgressPanel({
    queue, onClearCompleted, onDismiss, onRetry, onRetryAll,
}: {
    queue: FileUploadStatus[]
    onClearCompleted: () => void
    onDismiss: () => void
    onRetry: (idx: number) => void
    onRetryAll: () => void
}) {
    const [collapsed, setCollapsed] = useState(false)
    const activeCount = queue.filter((f) => f.status === "uploading").length
    const doneCount = queue.filter((f) => f.status === "done" || f.status === "error").length
    const errorCount = queue.filter((f) => f.status === "error").length
    const allDone = doneCount === queue.length

    if (queue.length === 0) return null

    return (
        <div className="fixed bottom-4 right-4 z-50 w-80 rounded-2xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.06]">
            <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b bg-muted/30">
                <IconCloudUpload className="size-4 text-blue-500 shrink-0" />
                <span className="text-xs font-semibold flex-1 truncate">
                    {allDone ? `${doneCount}/${queue.length} complete` : `Uploading ${activeCount} file${activeCount !== 1 ? "s" : ""}…`}
                </span>
                {errorCount > 0 && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="size-6 shrink-0 rounded-lg cursor-pointer" onClick={onRetryAll} aria-label="Retry all failed">
                                <IconRefresh className="size-3 text-amber-500" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>Retry failed ({errorCount})</TooltipContent>
                    </Tooltip>
                )}
                {allDone && (
                    <Button size="icon" variant="ghost" className="size-6 shrink-0 rounded-lg cursor-pointer" onClick={onClearCompleted} aria-label="Clear completed">
                        <IconCheck className="size-3 text-emerald-500" />
                    </Button>
                )}
                <Button size="icon" variant="ghost" className="size-6 shrink-0 rounded-lg" onClick={() => setCollapsed((c) => !c)}>
                    {collapsed
                        ? <IconChevronDown className="size-3 text-muted-foreground" />
                        : <IconMinus className="size-3 text-muted-foreground" />
                    }
                </Button>
                <Button size="icon" variant="ghost" className="size-6 shrink-0 rounded-lg" onClick={onDismiss}>
                    <IconX className="size-3 text-muted-foreground" />
                </Button>
            </div>
            {!collapsed && (
                <div className="max-h-60 overflow-y-auto">
                    {queue.map((f, i) => (
                        <div key={i} className="px-3.5 py-2 border-b border-border/30 last:border-0">
                            <div className="flex items-center gap-2">
                                {f.status === "done" && <IconCheck className="size-3.5 text-emerald-500 shrink-0" />}
                                {f.status === "error" && <IconAlertCircle className="size-3.5 text-destructive shrink-0" />}
                                {f.status === "uploading" && <IconLoader2 className="size-3.5 animate-spin text-blue-500 shrink-0" />}
                                {f.status === "queued" && <div className="size-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />}
                                <span className="text-xs truncate flex-1">{f.name}</span>
                                {f.status === "uploading" && (
                                    <span className="text-[10px] text-muted-foreground shrink-0">{Math.round(f.progress * 100)}%</span>
                                )}
                                {f.status === "done" && <span className="text-[10px] text-emerald-500 shrink-0">Done</span>}
                                {f.status === "error" && (
                                    <>
                                        <span className="text-[10px] text-destructive shrink-0">Failed</span>
                                        <button
                                            onClick={() => onRetry(i)}
                                            className="text-[10px] text-blue-500 hover:text-blue-600 font-medium shrink-0 px-1.5 py-0.5 rounded hover:bg-blue-500/10 cursor-pointer transition-colors"
                                            aria-label={`Retry ${f.name}`}
                                        >
                                            Retry
                                        </button>
                                    </>
                                )}
                            </div>
                            {f.status === "error" && f.error && (
                                <div className="mt-0.5 text-[10px] text-destructive/70 truncate">{f.error}</div>
                            )}
                            {f.status === "uploading" && (
                                <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-[width] duration-200 rounded-full"
                                        style={{ width: `${f.progress * 100}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
            {!allDone && (
                <div className="h-0.5 bg-muted">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-[width] duration-300" style={{ width: `${(doneCount / queue.length) * 100}%` }} />
                </div>
            )}
        </div>
    )
}
