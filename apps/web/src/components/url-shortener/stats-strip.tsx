'use client'

import { cn } from '@/lib/utils'
import { formatClicks } from './utils'

interface StatsStripProps {
    totalLinks: number
    activeCount: number
    totalClicks: number
}

export function StatsStrip({ totalLinks, activeCount, totalClicks }: StatsStripProps) {
    if (totalLinks === 0) return null

    const stats = [
        { label: 'Total Links', value: totalLinks, color: 'text-primary' },
        { label: 'Active', value: activeCount, color: 'text-emerald-500' },
        { label: 'Total Clicks', value: formatClicks(totalClicks), color: 'text-violet-500' },
    ]

    return (
        <div className="grid grid-cols-3 gap-3">
            {stats.map(({ label, value, color }) => (
                <div key={label} className="flex flex-col items-center justify-center rounded-xl border border-border/40 bg-card/50 py-3 gap-0.5">
                    <span className={cn('text-xl font-bold tabular-nums', color)}>{value}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
                </div>
            ))}
        </div>
    )
}
