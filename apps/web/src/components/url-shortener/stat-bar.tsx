'use client'

import { cn } from '@/lib/utils'

interface StatBarProps {
    label: string
    clicks: number
    total: number
    colorClass: string
}

export function StatBar({ label, clicks, total, colorClass }: StatBarProps) {
    const pct = total > 0 ? Math.round((clicks / total) * 100) : 0
    return (
        <div className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate text-xs text-muted-foreground">{label}</span>
            <div className="flex-1 overflow-hidden rounded-full bg-muted/50 h-2">
                <div
                    className={cn('h-2 rounded-full transition-all duration-500', colorClass || 'bg-primary')}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-foreground">{clicks}</span>
            <span className="w-8 shrink-0 text-right text-xs text-muted-foreground tabular-nums">{pct}%</span>
        </div>
    )
}
