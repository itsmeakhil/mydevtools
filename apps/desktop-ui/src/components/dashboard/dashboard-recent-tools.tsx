'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Clock, ChevronDown, History } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type FavoriteItem, type ToolCardProps } from './types'
import { ToolCard, HScrollFade } from './dashboard-tool-card'
import { DashboardSectionHeader } from './dashboard-section-header'
import { Button } from '@/components/ui/button'

const RECENT_ACCENT = { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' }

interface DashboardRecentToolsProps {
  recentItems: FavoriteItem[]
  toolCardProps: Omit<ToolCardProps, 'item' | 'id' | 'index'>
  user: { displayName?: string | null } | null
  searchQuery: string
}

const VISIBLE_CAP = 8

/**
 * Recently Used tools section.
 * Only shown when the user is logged in and not searching.
 */
export function DashboardRecentTools({
  recentItems,
  toolCardProps,
  user,
  searchQuery,
}: DashboardRecentToolsProps) {
  const t = useTranslations('Dashboard')
  const [expanded, setExpanded] = useState(false)

  if (!user || recentItems.length === 0 || searchQuery) return null

  const overflow = recentItems.length - VISIBLE_CAP
  const visible = expanded ? recentItems : recentItems.slice(0, VISIBLE_CAP)

  return (
    <section className="space-y-3 md:space-y-5">
      <DashboardSectionHeader
        icon={Clock}
        title={t('sections.recentlyUsed')}
        count={recentItems.length}
        accent={RECENT_ACCENT}
        action={
          <Link
            href="/dashboard/activity"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/50 hover:border-primary/40 transition-colors"
          >
            <History size={15} className="text-primary" />
            {t('viewActivity')}
          </Link>
        }
      />
      {/* Mobile: horizontal scroll */}
      <div className="md:hidden -mx-4 px-4">
        <HScrollFade>
          <div className="flex gap-3 overflow-x-auto scroll-snap-x pb-2 mobile-scrollbar-hide">
            {recentItems.map((item, index) => (
              <div
                key={`recent-mobile-${item.id}`}
                className="scroll-snap-item w-[260px] flex-shrink-0 snap-start"
              >
                <ToolCard
                  item={item}
                  id={item.id}
                  index={index}
                  timestamp={item.timestamp}
                  {...toolCardProps}
                />
              </div>
            ))}
          </div>
        </HScrollFade>
      </div>
      {/* Desktop: grid */}
      <div className="hidden md:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 xl:gap-5">
        {visible.map((item, index) => (
          <ToolCard
            key={`recent-${item.id}`}
            item={item}
            id={item.id}
            index={index}
            timestamp={item.timestamp}
            {...toolCardProps}
          />
        ))}
      </div>
      {overflow > 0 && (
        <div className="hidden md:flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            {expanded ? 'Show less' : `Show ${overflow} more`}
            <ChevronDown
              size={14}
              className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
            />
          </Button>
        </div>
      )}
    </section>
  )
}
