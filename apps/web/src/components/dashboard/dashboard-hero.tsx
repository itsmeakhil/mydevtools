'use client'

import React from 'react'
import { Layers, Zap, Pin, Clock } from 'lucide-react'
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
        <div className="hidden md:flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {dashboardGreeting(t)}
              </p>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight gradient-text-animated">
                  {user?.displayName
                    ? t('welcomeBackNamed', { name: user.displayName.split(' ')[0] })
                    : t('welcomeBack')}
                </h1>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('tagline')}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-2 md:gap-3">
              <div className="flex items-center gap-1.5 md:gap-2 px-2.5 md:px-4 py-2 md:py-2.5 rounded-lg md:rounded-xl glass-card stats-glow">
                <div className="p-1 md:p-1.5 rounded-md md:rounded-lg bg-primary/10">
                  <Layers size={14} className="md:w-4 md:h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] md:text-xs text-muted-foreground">{t('stats.tools')}</p>
                  <p className="text-xs md:text-sm font-semibold">{totalTools}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
