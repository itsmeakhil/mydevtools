'use client'

export function LinkListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-2">
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="animate-pulse rounded-xl border border-border/30 bg-card/40 p-3.5"
                    style={{ animationDelay: `${i * 80}ms` }}
                >
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 shrink-0 rounded-lg bg-muted/50" />
                        <div className="flex-1 space-y-2.5">
                            <div className="h-3.5 w-1/3 rounded-md bg-muted/50" />
                            <div className="h-3 w-2/3 rounded-md bg-muted/40" />
                            <div className="flex items-center gap-3">
                                <div className="h-2.5 w-16 rounded bg-muted/40" />
                                <div className="h-2.5 w-12 rounded bg-muted/30" />
                                <div className="h-2.5 w-14 rounded bg-muted/30" />
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-1.5">
                            {Array.from({ length: 5 }).map((_, j) => (
                                <div key={j} className="h-8 w-8 rounded-md bg-muted/30" />
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
