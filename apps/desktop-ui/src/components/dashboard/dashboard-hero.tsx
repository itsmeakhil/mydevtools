'use client'

import React from 'react'
import Link from 'next/link'
import { Layers, Zap, Pin, Clock, History } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { dashboardGreeting, greetingFirstName } from './types'
import { useAppUser } from '@/hooks/use-app-user'
import { useCountUp } from '@/hooks/use-count-up'
import { cn } from '@/lib/utils'

interface DashboardHeroProps {
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
/** A single count-up stat in the hero strip. */
function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: number
}) {
  const display = useCountUp(value)
  const isZero = value === 0
  return (
    <div className={cn('flex items-center gap-2 transition-opacity', isZero && 'opacity-45')}>
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-border/50',
          isZero
            ? 'bg-muted text-muted-foreground'
            : 'bg-primary/[0.12] text-primary',
        )}
      >
        <Icon size={14} className={isZero ? 'text-muted-foreground' : 'text-primary'} />
      </span>
      <span
        className={cn(
          'text-sm font-semibold tabular-nums',
          isZero ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {display}
      </span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  )
}

export function DashboardHero({
  totalTools,
  pinnedCount,
  recentCount,
  mobileOnly,
  desktopOnly,
}: DashboardHeroProps) {
  const t = useTranslations('Dashboard')
  // The editable profile name lives in local preferences. `useAuth` is identity
  // only — its displayName is a hardcoded null, so greeting off it never named
  // anyone.
  const firstName = greetingFirstName(useAppUser().name)

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
                  {firstName ? t('commaName', { name: firstName }) : ''}
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
        <div className="hidden md:flex flex-col gap-4">
          <div className="space-y-1.5">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              {dashboardGreeting(t)}
            </p>
            <h1 className="text-2xl sm:text-[1.75rem] font-bold tracking-tight leading-tight text-foreground">
              {firstName ? t('welcomeBackNamed', { name: firstName }) : t('welcomeBack')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('tagline')}</p>
          </div>

          {/* Quick stats — inline strip with count-up */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border/60 bg-card px-4 py-2.5 shadow-sm shadow-primary/[0.03] ring-1 ring-inset ring-white/40 dark:ring-white/[0.04] backdrop-blur-sm w-fit">
            <Stat icon={Layers} label={t('stats.tools')} value={totalTools} />
            <span className="h-4 w-px bg-border/70" aria-hidden />
            <Stat icon={Pin} label={t('stats.pinned')} value={pinnedCount} />
            <span className="h-4 w-px bg-border/70" aria-hidden />
            <Stat icon={Clock} label={t('stats.recent')} value={recentCount} />
          </div>
        </div>
      )}
    </>
  )
}
