"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { hopKind, isSensitiveHeader, maskHeaderValue } from "@/lib/api-client/timeline"
import type { ResponseTimeline as Timeline } from "./types"

const fmt = (ms: number) => (ms < 10 ? ms.toFixed(1) : Math.round(ms).toString())

function statusTone(status: number) {
    if (status >= 400) return "bg-destructive/[0.12] text-destructive"
    if (status >= 300) return "bg-foreground/[0.08] text-muted-foreground"
    return "bg-success/[0.12] text-success"
}

/** What the proxy actually sent, hop by hop, with honest timings. */
export function ResponseTimeline({ timeline }: { timeline: Timeline }) {
    const t = useTranslations("ApiClient.timeline")
    const [reveal, setReveal] = React.useState(false)
    const { hops, downloadMs, totalMs } = timeline
    const last = hops[hops.length - 1]
    const scale = (ms: number) => `${totalMs > 0 ? Math.min(100, (ms / totalMs) * 100) : 0}%`
    const hasSecrets = hops.some((h) => h.headers.some(([k]) => isSensitiveHeader(k)))

    return (
        <ScrollArea className="h-full">
            <div className="space-y-4 p-4">
                <dl className="grid grid-cols-3 gap-3 text-[13px]">
                    {[
                        [t("total"), totalMs],
                        [t("ttfb"), last?.ttfbMs ?? 0],
                        [t("download"), downloadMs],
                    ].map(([label, ms]) => (
                        <div key={label as string} className="rounded-lg border border-border px-3 py-2">
                            <dt className="text-xs text-muted-foreground">{label}</dt>
                            <dd className="font-mono tabular-nums">{fmt(ms as number)} ms</dd>
                        </div>
                    ))}
                </dl>

                <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">{t("phasesNote")}</p>
                    {hasSecrets && (
                        <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1.5 text-xs" onClick={() => setReveal((r) => !r)}>
                            {reveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            {reveal ? t("hide") : t("reveal")}
                        </Button>
                    )}
                </div>

                <ol className="space-y-3">
                    {hops.map((hop, i) => {
                        const kind = hopKind(hops, i)
                        const download = kind === "final" ? downloadMs : 0
                        return (
                            <li key={i} className="rounded-lg border border-border">
                                <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-[13px]">
                                    <span className="text-xs text-muted-foreground">{t("hop", { n: i + 1 })}</span>
                                    <span className="font-mono font-semibold">{hop.method}</span>
                                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums", statusTone(hop.status))}>{hop.status}</span>
                                    {kind !== "final" && <span className="text-xs text-muted-foreground">{t(kind)}</span>}
                                    <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
                                        +{fmt(hop.startMs)} ms · {fmt(hop.ttfbMs + download)} ms
                                    </span>
                                    <span className="w-full break-all font-mono text-xs">{hop.url}</span>
                                </div>
                                {/* Waterfall on the shared total scale: waiting (incl. connection setup), then download. */}
                                <div className="relative mx-3 mb-2 h-1.5 rounded-full bg-foreground/[0.06]" aria-hidden>
                                    <div className="absolute inset-y-0 rounded-full bg-primary" style={{ left: scale(hop.startMs), width: scale(hop.ttfbMs) }} />
                                    {download > 0 && (
                                        <div className="absolute inset-y-0 rounded-full bg-primary/40" style={{ left: scale(hop.startMs + hop.ttfbMs), width: scale(download) }} />
                                    )}
                                </div>
                                <details className="border-t border-border">
                                    <summary className="cursor-pointer px-3 py-1.5 text-xs text-muted-foreground">
                                        {t("headersSent", { count: hop.headers.length })}
                                    </summary>
                                    <div className="divide-y divide-border">
                                        {hop.headers.map(([k, v], j) => (
                                            <div key={j} className="grid grid-cols-[minmax(120px,30%)_1fr] gap-x-4 px-3 py-1.5 font-mono text-xs">
                                                <span className="break-all text-muted-foreground">{k}</span>
                                                <span className="break-all">{reveal ? v : maskHeaderValue(k, v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </details>
                            </li>
                        )
                    })}
                </ol>
                <p className="text-xs text-muted-foreground">{t("clientHeadersNote")}</p>
            </div>
        </ScrollArea>
    )
}
