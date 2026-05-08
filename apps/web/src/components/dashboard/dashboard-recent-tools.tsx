'use client'

import React from 'react'
import { Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type FavoriteItem, type ToolCardProps } from './types'
import { ToolCard, HScrollFade } from './dashboard-tool-card'

interface DashboardRecentToolsProps {
  recentItems: FavoriteItem[]
  toolCardProps: Omit<ToolCardProps, 'item' | 'id' | 'index'>
  user: { displayName?: string | null } | null
  searchQuery: string
}

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

  if (!user || recentItems.length === 0 || searchQuery) return null

  return (
    <section className="space-y-3 md:space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 section-header-line pb-2">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
            <Clock size={18} strokeWidth={1.5} />
          </div>
          <h2 className="text-xl font-semibold">{t('sections.recentlyUsed')}</h2>
          <span className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
            {recentItems.length}
          </span>
        </div>
      </div>
      {/* Mobile: horizontal scroll */}
      <div className="md:hidden -mx-4 px-4">
        <HScrollFade>
          <div className="flex gap-3 overflow-x-auto scroll-snap-x pb-2 mobile-scrollbar-hide">
            {recentItems.map((item, index) => (
              <div
                key={`recent-mobile-${item.id}`}
                className="scroll-snap-item w-[min(280px,75vw)] flex-shrink-0"
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
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4">
        {recentItems.map((item, index) => (
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
    </section>
  )
}
