'use client'

import { useState } from 'react'

interface DailyChartProps {
    daily: { date: string; clicks: number }[]
}

export function DailyChart({ daily }: DailyChartProps) {
    const [activeIdx, setActiveIdx] = useState<number | null>(null)

    if (daily.length === 0) return (
        <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">No data for this period</div>
    )
    const max = Math.max(...daily.map(d => d.clicks), 1)
    return (
        <div className="flex h-32 items-end gap-0.5">
            {daily.map((d, i) => {
                const heightPct = Math.max((d.clicks / max) * 100, 4)
                const isActive = activeIdx === i
                return (
                    <div
                        key={d.date}
                        className="group relative flex-1 min-w-0 cursor-pointer"
                        style={{ height: '100%', display: 'flex', alignItems: 'flex-end' }}
                        onClick={() => setActiveIdx(isActive ? null : i)}
                        onMouseEnter={() => setActiveIdx(i)}
                        onMouseLeave={() => setActiveIdx(null)}
                    >
                        {isActive && (
                            <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-10 pointer-events-none whitespace-nowrap rounded-md bg-popover border border-border/50 px-2 py-1 text-[10px] font-medium text-foreground shadow-md">
                                <div className="font-semibold">{d.clicks} click{d.clicks !== 1 ? 's' : ''}</div>
                                <div className="text-muted-foreground">{d.date}</div>
                            </div>
                        )}
                        <div
                            className={`w-full rounded-sm transition-all duration-150 ${isActive ? 'bg-primary' : 'bg-primary/70 hover:bg-primary'}`}
                            style={{ height: `${heightPct}%` }}
                        />
                    </div>
                )
            })}
        </div>
    )
}
