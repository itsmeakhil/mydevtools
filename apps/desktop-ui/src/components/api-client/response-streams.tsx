"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { StreamEvent } from "@/lib/api-client/sse"
import { parseNdjson } from "@/lib/api-client/ndjson"

const MAX_NDJSON_LINES = 2000

/** Live SSE events / GraphQL subscription messages; sticks to the bottom while new ones arrive. */
export function StreamEventsView({ events, live }: { events: StreamEvent[]; live?: boolean }) {
    const t = useTranslations("ApiClient.responsePanel")
    const ref = React.useRef<HTMLDivElement>(null)
    const stick = React.useRef(true)

    React.useEffect(() => {
        const el = ref.current
        if (el && stick.current) el.scrollTop = el.scrollHeight
    }, [events.length])

    return (
        <div
            ref={ref}
            onScroll={(e) => {
                const el = e.currentTarget
                stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 32
            }}
            className="h-full overflow-auto p-3 space-y-1.5"
            aria-live="polite"
        >
            {events.length === 0 && (
                <p className="p-4 text-center text-xs text-muted-foreground">
                    {live ? t("streamWaiting") : t("streamEmpty")}
                </p>
            )}
            {events.map((ev, i) => (
                <div
                    key={i}
                    className={cn(
                        "rounded-lg border p-2 text-xs space-y-1",
                        ev.event === "error" ? "border-destructive/25 bg-destructive/[0.04]" : "border-border bg-card",
                    )}
                >
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="tabular-nums">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                        {ev.event && (
                            <span className={cn(
                                "rounded-full px-1.5 font-mono",
                                ev.event === "error" ? "bg-destructive/[0.12] text-destructive" : "bg-primary/[0.12] text-primary",
                            )}>
                                {ev.event}
                            </span>
                        )}
                        {ev.id && <span className="font-mono">id {ev.id}</span>}
                    </div>
                    <pre className="font-mono whitespace-pre-wrap break-all text-foreground">{ev.data}</pre>
                </div>
            ))}
        </div>
    )
}

/** One row per JSON line; bad lines show their parse error in place. */
export function NdjsonView({ body }: { body: string }) {
    const t = useTranslations("ApiClient.responsePanel")
    const { lines, truncated } = React.useMemo(() => parseNdjson(body, MAX_NDJSON_LINES), [body])

    return (
        <div className="h-full overflow-auto">
            {truncated && (
                <p className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
                    {t("linesTruncated", { count: MAX_NDJSON_LINES })}
                </p>
            )}
            <div className="divide-y divide-border">
                {lines.map((l) => (
                    <div key={l.line} className="grid grid-cols-[3.5rem_1fr] gap-x-3 px-3 py-1.5 text-xs">
                        <span className="text-right font-mono tabular-nums text-muted-foreground">{l.line}</span>
                        {l.error ? (
                            <div className="min-w-0">
                                <pre className="font-mono whitespace-pre-wrap break-all">{l.text}</pre>
                                <p className="text-destructive">{t("lineInvalid", { message: l.error })}</p>
                            </div>
                        ) : (
                            <pre className="font-mono whitespace-pre-wrap break-all">{JSON.stringify(l.value)}</pre>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
