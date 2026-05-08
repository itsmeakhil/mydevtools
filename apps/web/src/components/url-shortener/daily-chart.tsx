'use client'

interface DailyChartProps {
    daily: { date: string; clicks: number }[]
}

export function DailyChart({ daily }: DailyChartProps) {
    if (daily.length === 0) return (
        <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">No data for this period</div>
    )
    const max = Math.max(...daily.map(d => d.clicks), 1)
    return (
        <div className="flex h-32 items-end gap-0.5">
            {daily.map((d) => {
                const heightPct = Math.max((d.clicks / max) * 100, 4)
                return (
                    <div
                        key={d.date}
                        className="group relative flex-1 min-w-0"
                        style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}
                    >
                        <div
                            className="w-full rounded-sm bg-primary/70 transition-all duration-300 group-hover:bg-primary"
                            style={{ height: `${heightPct}%` }}
                            title={`${d.date}: ${d.clicks} click${d.clicks !== 1 ? 's' : ''}`}
                        />
                    </div>
                )
            })}
        </div>
    )
}
