'use client'

import React from 'react'
import Link from 'next/link'
import { Layers, Zap, Pin, Clock, History } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { dashboardGreeting } from './types'

interface DashboardHeroProps {
  user: { displayName?: string | null } | null
  totalTools: number
  pinnedCount: number
  recentCount: number
  /** Render only the mobile sticky header. */
  mobileOnly?: boolean
  /** Render only the desktop section. */
  desktopOnly?: boolean
}

/**
 * Dashboard hero section.
 * Desktop: greeting + animated gradient heading + stat chips.
 * Mobile: sticky header with branding and compact stats.
 *
 * Use `mobileOnly` / `desktopOnly` to split rendering when the two
 * halves need to live in different DOM positions (e.g. mobile header
 * must be outside the padded container for full-bleed, while the
 * desktop hero sits inside it for proper alignment).
 */
/** Compact KPI stat tile for the dashboard hero. */
function KpiCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border">
      <div className="p-1.5 rounded-md bg-primary/10">
        <Icon size={16} className="text-primary" />
      </div>
      <div>
        <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">{label}</p>
        <p className="text-sm font-semibold tabular-nums leading-tight">{value}</p>
      </div>
    </div>
  )
}

export function DashboardHero({
  user,
  totalTools,
  pinnedCount,
  recentCount,
  mobileOnly,
  desktopOnly,
}: DashboardHeroProps) {
  const t = useTranslations('Dashboard')

  return (
    <>
      {/* ── Mobile Sticky Header ────────────────────────────────────────── */}
      {!desktopOnly && (
        <div className="sticky top-0 z-40 md:hidden bg-background/90 backdrop-blur-xl border-b border-border/40">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
                <Zap className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold tracking-tight">{t('brandName')}</h1>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {dashboardGreeting(t)}
                  {user?.displayName
                    ? t('commaName', { name: user.displayName.split(' ')[0] })
                    : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/activity"
                aria-label={t('viewActivity')}
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-muted/50 text-primary"
              >
                <History size={16} />
              </Link>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/50 min-h-[32px]">
                <Layers size={14} className="text-primary shrink-0" />
                <span className="text-xs font-semibold">{totalTools}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop Header Section ──────────────────────────────────────── */}
      {!mobileOnly && (
        <div className="hidden md:flex flex-col gap-5">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {dashboardGreeting(t)}
              </p>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {user?.displayName
                  ? t('welcomeBackNamed', { name: user.displayName.split(' ')[0] })
                  : t('welcomeBack')}
              </h1>
              <p className="text-sm text-muted-foreground">{t('tagline')}</p>
            </div>

            {/* Quick Stats — KPI row */}
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <KpiCard icon={Layers} label={t('stats.tools')} value={totalTools} />
              <KpiCard icon={Pin} label={t('stats.pinned')} value={pinnedCount} />
              <KpiCard icon={Clock} label={t('stats.recent')} value={recentCount} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
