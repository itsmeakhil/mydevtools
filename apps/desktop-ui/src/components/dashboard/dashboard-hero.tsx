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
 * Desktop: greeting + heading + quiet inline stats.
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
    <div className={cn('flex items-center gap-1.5 text-[13px]', isZero && 'opacity-60')}>
      <Icon size={14} className="shrink-0 text-muted-foreground" />
      <span
        className={cn(
          'font-medium tabular-nums',
          isZero ? 'text-muted-foreground' : 'text-foreground',
        )}
      >
        {display}
      </span>
      <span className="text-muted-foreground">{label}</span>
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
        <div className="sticky top-0 z-40 md:hidden glass-bar border-b border-border">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-foreground/[0.05] flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" strokeWidth={2} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[15px] font-semibold">{t('brandName')}</h1>
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
                className="flex items-center justify-center h-8 w-8 rounded-lg bg-foreground/[0.05] text-muted-foreground hover:text-foreground"
              >
                <History size={16} />
              </Link>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-foreground/[0.05] min-h-[32px]">
                <Layers size={14} className="text-muted-foreground shrink-0" />
                <span className="text-xs font-medium tabular-nums">{totalTools}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop Header Section ──────────────────────────────────────── */}
      {!mobileOnly && (
        <div className="hidden md:flex flex-col gap-3">
          <div className="space-y-1">
            <p className="text-[13px] text-muted-foreground">{dashboardGreeting(t)}</p>
            <h1 className="text-2xl font-semibold tracking-[-0.01em] leading-tight text-foreground">
              {firstName ? t('welcomeBackNamed', { name: firstName }) : t('welcomeBack')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('tagline')}</p>
          </div>

          {/* Quick stats — quiet inline text with count-up */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Stat icon={Layers} label={t('stats.tools')} value={totalTools} />
            <span className="h-3.5 w-px bg-border" aria-hidden />
            <Stat icon={Pin} label={t('stats.pinned')} value={pinnedCount} />
            <span className="h-3.5 w-px bg-border" aria-hidden />
            <Stat icon={Clock} label={t('stats.recent')} value={recentCount} />
          </div>
        </div>
      )}
    </>
  )
}
