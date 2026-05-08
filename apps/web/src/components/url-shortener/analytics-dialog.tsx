'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import {
    BarChart2,
    Loader2,
    Monitor,
    RefreshCw,
    TrendingUp,
} from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import {
    getLinkAnalytics,
    type LinkAnalytics,
    type ShortLink,
} from '@/lib/url-shortener-api'
import { formatClicks } from './utils'
import { StatBar } from './stat-bar'
import { DailyChart } from './daily-chart'

const DEVICE_COLORS: Record<string, string> = {
    Desktop: 'bg-blue-500',
    Mobile: 'bg-violet-500',
    Tablet: 'bg-amber-500',
}

const OS_COLORS: Record<string, string> = {
    Windows: 'bg-sky-500',
    macOS: 'bg-zinc-500',
    Linux: 'bg-orange-500',
    iOS: 'bg-slate-500',
    Android: 'bg-green-500',
    ChromeOS: 'bg-yellow-500',
}

const BROWSER_COLORS: Record<string, string> = {
    Chrome: 'bg-yellow-500',
    Firefox: 'bg-orange-500',
    Safari: 'bg-blue-500',
    Edge: 'bg-sky-600',
    Opera: 'bg-red-500',
    Samsung: 'bg-indigo-500',
}

interface AnalyticsDialogProps {
    link: ShortLink
    open: boolean
    onClose: () => void
}

export function AnalyticsDialog({ link, open, onClose }: AnalyticsDialogProps) {
    const [data, setData] = useState<LinkAnalytics | null>(null)
    const [loading, setLoading] = useState(false)
    const [days, setDays] = useState(30)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const result = await getLinkAnalytics(link.code, days)
            setData(result)
        } catch {
            toast.error('Failed to load analytics')
        } finally {
            setLoading(false)
        }
    }, [link.code, days])

    useEffect(() => {
        if (open) load()
    }, [open, load])

    const totalDeviceClicks = data?.devices.reduce((s, d) => s + d.clicks, 0) ?? 0
    const totalOsClicks = data?.os.reduce((s, o) => s + o.clicks, 0) ?? 0
    const totalBrowserClicks = data?.browsers.reduce((s, b) => s + b.clicks, 0) ?? 0
    const totalReferrerClicks = data?.referrers.reduce((s, r) => s + r.clicks, 0) ?? 0

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl w-[95vw] p-0 overflow-hidden max-h-[92vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center gap-3 border-b border-border/50 px-5 py-4 shrink-0">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <BarChart2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <DialogTitle className="text-sm font-semibold leading-none truncate">{link.title}</DialogTitle>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground font-mono">/{link.code}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                        {([7, 30, 90] as const).map(d => (
                            <button
                                key={d}
                                onClick={() => setDays(d)}
                                className={cn(
                                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                                    days === d
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                                )}
                            >
                                {d}d
                            </button>
                        ))}
                        <button onClick={load} className="ml-1 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-6">
                    {loading && !data ? (
                        <div className="flex h-40 items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : !data ? null : (
                        <>
                            {/* Total clicks stat */}
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Total Clicks', value: formatClicks(data.total_clicks), color: 'text-primary' },
                                    { label: `Last ${days}d`, value: formatClicks(data.daily.reduce((s, d) => s + d.clicks, 0)), color: 'text-violet-500' },
                                    { label: 'Top Source', value: data.referrers[0]?.label ?? '—', color: 'text-emerald-500' },
                                ].map(({ label, value, color }) => (
                                    <div key={label} className="flex flex-col gap-0.5 rounded-xl border border-border/40 bg-card/50 px-3 py-2.5">
                                        <span className={cn('text-lg font-bold tabular-nums truncate', color)}>{value}</span>
                                        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Daily chart */}
                            <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clicks over time</p>
                                <div className="rounded-xl border border-border/40 bg-card/30 p-3">
                                    <DailyChart daily={data.daily} />
                                    <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
                                        <span>{data.daily[0]?.date ?? ''}</span>
                                        <span>{data.daily[data.daily.length - 1]?.date ?? ''}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Referrers */}
                            {data.referrers.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top Referrers</p>
                                    <div className="space-y-2">
                                        {data.referrers.map((r) => (
                                            <StatBar
                                                key={r.label}
                                                label={r.label}
                                                clicks={r.clicks}
                                                total={totalReferrerClicks}
                                                colorClass="bg-emerald-500"
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Devices / OS / Browsers — 3 col grid */}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                {/* Devices */}
                                {data.devices.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                            <Monitor className="h-3 w-3" /> Devices
                                        </p>
                                        <div className="space-y-2">
                                            {data.devices.map((d) => (
                                                <StatBar
                                                    key={d.label}
                                                    label={d.label}
                                                    clicks={d.clicks}
                                                    total={totalDeviceClicks}
                                                    colorClass={DEVICE_COLORS[d.label] ?? 'bg-primary'}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* OS */}
                                {data.os.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">OS</p>
                                        <div className="space-y-2">
                                            {data.os.map((o) => (
                                                <StatBar
                                                    key={o.label}
                                                    label={o.label}
                                                    clicks={o.clicks}
                                                    total={totalOsClicks}
                                                    colorClass={OS_COLORS[o.label] ?? 'bg-primary'}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Browsers */}
                                {data.browsers.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Browsers</p>
                                        <div className="space-y-2">
                                            {data.browsers.map((b) => (
                                                <StatBar
                                                    key={b.label}
                                                    label={b.label}
                                                    clicks={b.clicks}
                                                    total={totalBrowserClicks}
                                                    colorClass={BROWSER_COLORS[b.label] ?? 'bg-primary'}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {data.total_clicks === 0 && (
                                <div className="flex flex-col items-center gap-2 py-6 text-center">
                                    <TrendingUp className="h-8 w-8 text-muted-foreground/30" strokeWidth={1.5} />
                                    <p className="text-sm text-muted-foreground">No clicks yet. Share your link to see analytics.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
